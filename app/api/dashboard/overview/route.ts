import {NextRequest, NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {authMiddleware} from '@/lib/auth';
import {startOfMonth, subMonths, startOfDay, subDays} from 'date-fns';

export async function GET(req: NextRequest) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    try {
        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = thisMonthStart;

        const userProjects = await prisma.project.findMany({
            where: {ownerId: user.id},
            select: {id: true}
        });
        const projectIds = userProjects.map(p => p.id);

        const [
            usageThisMonth,
            usageLastMonth,
            allAssociatedKeys,
            distinctKeysUsedThisMonth,

            topModels,
            cacheStats,
            recentFailures,
            latencyStats
        ] = await Promise.all([
            prisma.usage.aggregate({
                where: {userId: user.id, timestamp: {gte: thisMonthStart}},
                _sum: {totalCost: true, tokensInput: true, tokensOutput: true},
                _count: {_all: true}
            }),
            prisma.usage.aggregate({
                where: {userId: user.id, timestamp: {gte: lastMonthStart, lt: lastMonthEnd}},
                _sum: {totalCost: true, tokensInput: true, tokensOutput: true},
                _count: {_all: true}
            }),
            prisma.apiKey.findMany({
                where: {revokedAt: null, OR: [{userId: user.id}, {projectId: {in: projectIds}}]},
                select: {id: true, active: true}
            }),

            prisma.usage.findMany({
                where: {userId: user.id, timestamp: {gte: thisMonthStart}},
                distinct: ['apiKeyId'],
                select: {apiKeyId: true}
            }),

            prisma.usage.groupBy({
                by: ['model'],
                where: {userId: user.id, timestamp: {gte: thisMonthStart}},
                _count: {model: true},
                orderBy: {_count: {model: 'desc'}},
                take: 5
            }),
            prisma.usage.aggregate({
                where: {userId: user.id, timestamp: {gte: thisMonthStart}, cacheHit: true},
                _sum: {cost: true},
                _count: {_all: true}
            }),
            prisma.usage.findMany({
                where: {userId: user.id, success: false, timestamp: {gte: subDays(now, 7)}},
                take: 5,
                orderBy: {timestamp: 'desc'},
                select: {model: true, timestamp: true, endpoint: true}
            }),
            prisma.$queryRaw`SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY latency) as p50, percentile_cont(0.9) WITHIN
                             GROUP (ORDER BY latency) as p90, percentile_cont(0.95) WITHIN
                             GROUP (ORDER BY latency) as p95
                             FROM "usage"
                             WHERE "userId" = ${user.id}
                               AND "timestamp" >= ${startOfDay(subDays(now, 1))}`
        ]);

        const activeKeys = allAssociatedKeys.filter(k => k.active).length;
        const totalKeys = allAssociatedKeys.length;
        const keysUsedThisMonth = distinctKeysUsedThisMonth.length;

        const currentCost = usageThisMonth._sum.totalCost ?? 0;
        const totalRequests = usageThisMonth._count._all;
        const totalTokens = (usageThisMonth._sum.tokensInput ?? 0) + (usageThisMonth._sum.tokensOutput ?? 0);
        const lastMonthCost = usageLastMonth._sum.totalCost ?? 0;
        const lastMonthRequests = usageLastMonth._count._all;
        const lastMonthTokens = (usageLastMonth._sum.tokensInput ?? 0) + (usageLastMonth._sum.tokensOutput ?? 0);
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100.0 : 0;
            return ((current - previous) / previous) * 100;
        };
        const latencyData = (latencyStats as any[])[0] || {p50: 0, p90: 0, p95: 0};

        return NextResponse.json({
            totalRequests,
            totalTokens,
            currentCost,
            keysInUse: keysUsedThisMonth,
            percentageChanges: {
                cost: calculateChange(currentCost, lastMonthCost),
                requests: calculateChange(totalRequests, lastMonthRequests),
                tokens: calculateChange(totalTokens, lastMonthTokens),
            },
            keyStats: {
                total: totalKeys,
                active: activeKeys,
                inactive: totalKeys - activeKeys
            },
            topModels: topModels.map(m => ({model: m.model, count: m._count.model})),
            cachePerformance: {
                hits: cacheStats._count._all,
                costSaved: cacheStats._sum.cost ?? 0,
            },
            recentFailures,
            latency: {
                p50: Math.round(latencyData.p50),
                p90: Math.round(latencyData.p90),
                p95: Math.round(latencyData.p95),
            }
        });
    } catch (error) {
        console.error('Dashboard Overview API error:', error);
        return NextResponse.json({error: 'Failed to fetch overview data'}, {status: 500});
    }
}