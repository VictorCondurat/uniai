import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, checkProjectPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';
export async function GET(
    req: NextRequest,
    { params }: { params: { projectId: string } }
) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;

    const { projectId } = params;
    const { searchParams } = new URL(req.url);

    try {
        const hasPermission = await checkProjectPermission(authResult.id, projectId, 'usage:read');
        if (!hasPermission) {
            return NextResponse.json({ error: 'You do not have permission to view stats for this project.' }, { status: 403 });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                name: true,
                totalSpendingLimit: true
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const days = parseInt(searchParams.get('days') || '30');

        if (days <= 0 || isNaN(days)) {
            return NextResponse.json({ error: 'Invalid days parameter' }, { status: 400 });
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const totalSpending = await prisma.usage.aggregate({
            where: { projectId },
            _sum: { totalCost: true }
        });

        const usageByModel = await prisma.usage.groupBy({
            by: ['provider', 'model'],
            where: { projectId, timestamp: { gte: startDate } },
            _sum: { totalCost: true, tokensInput: true, tokensOutput: true },
            _count: { id: true },
        });

        const dailyUsage = await prisma.$queryRaw<Array<{
            date: Date;
            cost: number;
            tokens_input: bigint;
            tokens_output: bigint;
            requests: number;
        }>>`
            SELECT 
                DATE(timestamp) as date, 
                SUM("totalCost")::numeric as cost,
                SUM("tokensInput")::bigint as tokens_input, 
                SUM("tokensOutput")::bigint as tokens_output,
                COUNT(id)::int as requests
            FROM "usage" 
            WHERE "projectId" = ${projectId} AND timestamp >= ${startDate}
            GROUP BY DATE(timestamp) 
            ORDER BY date DESC
        `;

        const formattedDailyUsage = dailyUsage.map(day => ({
            date: day.date,
            cost: Number(day.cost),
            tokens_input: Number(day.tokens_input),
            tokens_output: Number(day.tokens_output),
            requests: day.requests
        }));

        const successRate = await prisma.usage.groupBy({
            by: ['success'],
            where: { projectId, timestamp: { gte: startDate } },
            _count: { id: true },
        });

        const avgLatency = await prisma.usage.aggregate({
            where: { projectId, timestamp: { gte: startDate } },
            _avg: { latency: true },
        });

        const cacheStats = await prisma.usage.groupBy({
            by: ['cacheHit'],
            where: { projectId, timestamp: { gte: startDate }, cached: true },
            _count: { id: true },
        });

        const topEndpoints = await prisma.usage.groupBy({
            by: ['endpoint'],
            where: { projectId, timestamp: { gte: startDate } },
            _count: { id: true },
            _sum: { totalCost: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });

        const costByApiKey = await prisma.usage.groupBy({
            by: ['apiKeyId'],
            where: { projectId, timestamp: { gte: startDate } },
            _sum: { totalCost: true },
            _count: { id: true },
            orderBy: { _sum: { totalCost: 'desc' } },
            take: 10,
        });

        const apiKeyIds = costByApiKey.map(k => k.apiKeyId);
        const apiKeys = await prisma.apiKey.findMany({
            where: { id: { in: apiKeyIds } },
            select: { id: true, name: true, keyPrefix: true }
        });

        const costByApiKeyWithDetails = costByApiKey.map(stat => {
            const keyInfo = apiKeys.find(k => k.id === stat.apiKeyId);
            return {
                ...stat,
                keyName: keyInfo?.name || 'Unknown',
                keyPrefix: keyInfo?.keyPrefix || 'Unknown'
            };
        });

        const stats = {
            overview: {
                totalRequests: successRate.reduce((acc, curr) => acc + curr._count.id, 0),
                successRate: calculateSuccessRate(successRate),
                averageLatency: Math.round(avgLatency._avg.latency || 0),
                cacheHitRate: calculateCacheHitRate(cacheStats),
                periodCost: formattedDailyUsage.reduce((acc, curr) => acc + curr.cost, 0),
                totalSpent: totalSpending._sum.totalCost || 0,
                totalSpendingLimit: project.totalSpendingLimit,
                spendingLimitExceeded: project.totalSpendingLimit
                    ? (totalSpending._sum.totalCost || 0) >= project.totalSpendingLimit
                    : false,
                percentageOfLimit: project.totalSpendingLimit
                    ? ((totalSpending._sum.totalCost || 0) / project.totalSpendingLimit) * 100
                    : null
            },
            usageByModel: usageByModel.map(model => ({
                ...model,
                _sum: {
                    totalCost: model._sum.totalCost || 0,
                    tokensInput: model._sum.tokensInput || 0,
                    tokensOutput: model._sum.tokensOutput || 0
                }
            })),
            dailyUsage: formattedDailyUsage,
            topEndpoints: topEndpoints.map(endpoint => ({
                ...endpoint,
                _sum: {
                    totalCost: endpoint._sum.totalCost || 0
                }
            })),
            costByApiKey: costByApiKeyWithDetails,
            costProjection: calculateCostProjection(formattedDailyUsage, days),
        };
        await auditHelpers.logProjectAction(
            authResult.id,
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            projectId,
            {
                action: 'project_stats_viewed',
                projectName: project.name,
                periodDays: days,
                totalRequests: stats.overview.totalRequests,
                periodCost: stats.overview.periodCost,
                totalSpent: stats.overview.totalSpent,
                successRate: stats.overview.successRate,
                averageLatency: stats.overview.averageLatency,
                cacheHitRate: stats.overview.cacheHitRate,
                spendingLimitExceeded: stats.overview.spendingLimitExceeded,
                modelsUsed: stats.usageByModel.length,
                topEndpointsCount: stats.topEndpoints.length,
                apiKeysWithUsage: stats.costByApiKey.length,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching project statistics:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logProjectAction(
            authResult.id,
            'project_stats_fetch_failed' as any,
            projectId,
            {
                error: errorMessage,
                periodDays: parseInt(searchParams?.get('days') || '30'),
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({ error: 'Failed to fetch project statistics' }, { status: 500 });
    }
}

function calculateSuccessRate(successData: any[]): number {
    const total = successData.reduce((acc, curr) => acc + curr._count.id, 0);
    if (total === 0) return 100;
    const successful = successData.find(s => s.success === true)?._count.id || 0;
    return Math.round((successful / total) * 100 * 100) / 100;
}

function calculateCacheHitRate(cacheData: any[]): number {
    const total = cacheData.reduce((acc, curr) => acc + curr._count.id, 0);
    if (total === 0) return 0;
    const hits = cacheData.find(c => c.cacheHit === true)?._count.id || 0;
    return Math.round((hits / total) * 100 * 100) / 100;
}

function calculateCostProjection(
    dailyUsage: Array<{ date: Date; cost: number }>,
    days: number
): { daily: number; weekly: number; monthly: number; yearly: number } {
    if (dailyUsage.length === 0) {
        return { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
    }

    const daysWithData = dailyUsage.length;
    const totalCost = dailyUsage.reduce((acc, curr) => acc + curr.cost, 0);
    const avgDailyCost = totalCost / daysWithData;

    return {
        daily: Math.round(avgDailyCost * 100) / 100,
        weekly: Math.round(avgDailyCost * 7 * 100) / 100,
        monthly: Math.round(avgDailyCost * 30 * 100) / 100,
        yearly: Math.round(avgDailyCost * 365 * 100) / 100
    };
}