import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get('type');

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (type === 'summary') {
            const now = new Date();
            const currentMonthStart = startOfMonth(now);
            const currentMonthEnd = endOfMonth(now);
            const lastMonthStart = startOfMonth(subMonths(now, 1));
            const lastMonthEnd = endOfMonth(subMonths(now, 1));

            const [currentMonthUsage, lastMonthUsage, totalUsage, dailyUsage] = await Promise.all([
                prisma.usage.aggregate({
                    _sum: { totalCost: true },
                    where: {
                        OR: [
                            { userId: user.id, apiKey: { projectId: null } },
                            { project: { ownerId: user.id } }
                        ],
                        timestamp: {
                            gte: currentMonthStart,
                            lte: currentMonthEnd
                        }
                    }
                }),

                prisma.usage.aggregate({
                    _sum: { totalCost: true },
                    where: {
                        OR: [
                            { userId: user.id, apiKey: { projectId: null } },
                            { project: { ownerId: user.id } }
                        ],
                        timestamp: {
                            gte: lastMonthStart,
                            lte: lastMonthEnd
                        }
                    }
                }),

                prisma.usage.aggregate({
                    _sum: { totalCost: true },
                    where: {
                        OR: [
                            { userId: user.id, apiKey: { projectId: null } },
                            { project: { ownerId: user.id } }
                        ]
                    }
                }),

                prisma.usage.groupBy({
                    by: ['timestamp'],
                    where: {
                        OR: [
                            { userId: user.id, apiKey: { projectId: null } },
                            { project: { ownerId: user.id } }
                        ],
                        timestamp: {
                            gte: subDays(new Date(), 30)
                        }
                    },
                    _sum: {
                        totalCost: true
                    },
                    orderBy: {
                        timestamp: 'desc'
                    }
                })
            ]);

            const dailyUsageFormatted = dailyUsage.reduce((acc: any[], item) => {
                const date = item.timestamp.toISOString().split('T')[0];
                const existingDate = acc.find(d => d.date === date);

                if (existingDate) {
                    existingDate.cost += item._sum.totalCost || 0;
                } else {
                    acc.push({
                        date,
                        cost: item._sum.totalCost || 0
                    });
                }

                return acc;
            }, []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return NextResponse.json({
                currentMonth: currentMonthUsage._sum.totalCost || 0,
                lastMonth: lastMonthUsage._sum.totalCost || 0,
                total: totalUsage._sum.totalCost || 0,
                dailyUsage: dailyUsageFormatted
            });
        }

        const days = searchParams.get('days') || '7';
        const projectId = searchParams.get('projectId');
        const provider = searchParams.get('provider');
        const model = searchParams.get('model');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                timestamp: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            };
        } else {
            dateFilter = {
                timestamp: {
                    gte: subDays(new Date(), parseInt(days)),
                },
            };
        }

        const where: any = {
            OR: [
                { userId: user.id, apiKey: { projectId: null } },
                { project: { ownerId: user.id } }
            ],
            ...dateFilter,
        };

        if (projectId && projectId !== 'all') {
            where.projectId = projectId;
        }
        if (provider && provider !== 'all') {
            where.provider = provider;
        }
        if (model && model !== 'all') {
            where.model = model;
        }

        const usage = await prisma.usage.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                apiKey: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: 1000,
        });

        return NextResponse.json(usage);
    } catch (error) {
        console.error('Failed to fetch usage:', error);
        return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
    }
}