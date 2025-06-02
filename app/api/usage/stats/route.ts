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

        const currentStats = await prisma.usage.aggregate({
            where,
            _count: true,
            _sum: {
                totalCost: true,
                tokensInput: true,
                tokensOutput: true,
                latency: true,
            },
        });

        const previousWhere = {
            ...where,
            timestamp: {
                gte: subDays(new Date(), parseInt(days) * 2),
                lt: subDays(new Date(), parseInt(days)),
            },
        };

        const previousStats = await prisma.usage.aggregate({
            where: previousWhere,
            _sum: {
                totalCost: true,
                tokensInput: true,
                tokensOutput: true,
            },
        });

        const successCount = await prisma.usage.count({
            where: {
                ...where,
                success: true,
            },
        });

        const cacheHitCount = await prisma.usage.count({
            where: {
                ...where,
                cached: true,
                cacheHit: true,
            },
        });

        const cachedCount = await prisma.usage.count({
            where: {
                ...where,
                cached: true,
            },
        });

        const totalRequests = currentStats._count;
        const totalCost = currentStats._sum.totalCost || 0;
        const totalTokens = (currentStats._sum.tokensInput || 0) + (currentStats._sum.tokensOutput || 0);
        const avgLatency = totalRequests > 0 ? Math.round((currentStats._sum.latency || 0) / totalRequests) : 0;
        const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
        const cacheHitRate = cachedCount > 0 ? (cacheHitCount / cachedCount) * 100 : 0;

        const previousCost = previousStats._sum.totalCost || 0;
        const previousTokens = (previousStats._sum.tokensInput || 0) + (previousStats._sum.tokensOutput || 0);

        const costTrend = previousCost > 0 ? ((totalCost - previousCost) / previousCost) * 100 : 0;
        const tokensTrend = previousTokens > 0 ? ((totalTokens - previousTokens) / previousTokens) * 100 : 0;

        return NextResponse.json({
            totalRequests,
            totalCost,
            totalTokens,
            avgLatency,
            successRate,
            cacheHitRate,
            costTrend,
            tokensTrend,
        });
    } catch (error) {
        console.error('Failed to fetch usage stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}