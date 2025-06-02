import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';

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
            userId: user.id,
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