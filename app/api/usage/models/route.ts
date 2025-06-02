import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const days = searchParams.get('days') || '7';
        const projectId = searchParams.get('projectId');
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

        const usage = await prisma.usage.groupBy({
            by: ['provider', 'model'],
            where,
            _count: true,
            _sum: {
                totalCost: true,
                tokensInput: true,
                tokensOutput: true,
                latency: true,
            },
        });

        const modelUsage = usage.map(item => ({
            provider: item.provider,
            model: item.model,
            requests: item._count,
            tokens: (item._sum.tokensInput || 0) + (item._sum.tokensOutput || 0),
            cost: item._sum.totalCost || 0,
            avgLatency: item._count > 0 ? Math.round((item._sum.latency || 0) / item._count) : 0,
        }));

        return NextResponse.json(modelUsage);
    } catch (error) {
        console.error('Failed to fetch model usage:', error);
        return NextResponse.json({ error: 'Failed to fetch model usage' }, { status: 500 });
    }
}