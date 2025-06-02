import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const days = searchParams.get('days') || '7';
        const projectId = searchParams.get('projectId');
        const provider = searchParams.get('provider');
        const model = searchParams.get('model');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        let dateRange: Array<{ date: string; start: Date; end: Date }> = [];

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

            for (let i = 0; i <= dayCount; i++) {
                const date = new Date(start);
                date.setDate(start.getDate() + i);
                dateRange.push({
                    date: startOfDay(date).toISOString(),
                    start: startOfDay(date),
                    end: endOfDay(date),
                });
            }
        } else {
            for (let i = parseInt(days) - 1; i >= 0; i--) {
                const date = subDays(new Date(), i);
                dateRange.push({
                    date: startOfDay(date).toISOString(),
                    start: startOfDay(date),
                    end: endOfDay(date),
                });
            }
        }

        const where: any = {
            userId: user.id,
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

        const dailyData = await Promise.all(
            dateRange.map(async ({ date, start, end }) => {
                const dayStats = await prisma.usage.aggregate({
                    where: {
                        ...where,
                        timestamp: {
                            gte: start,
                            lte: end,
                        },
                    },
                    _count: true,
                    _sum: {
                        totalCost: true,
                        tokensInput: true,
                        tokensOutput: true,
                    },
                });

                return {
                    date,
                    requests: dayStats._count,
                    cost: dayStats._sum.totalCost || 0,
                    tokensInput: dayStats._sum.tokensInput || 0,
                    tokensOutput: dayStats._sum.tokensOutput || 0,
                };
            })
        );

        return NextResponse.json(dailyData);
    } catch (error) {
        console.error('Failed to fetch daily usage:', error);
        return NextResponse.json({ error: 'Failed to fetch daily usage' }, { status: 500 });
    }
}