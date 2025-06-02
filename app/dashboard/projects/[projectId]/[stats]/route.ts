import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: { projectId: string } }
) {
    const authResult = await authMiddleware(req);

    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const user = authResult;
    const { projectId } = params;

    try {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                userId: user.id,
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '30');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const usageByModel = await prisma.usage.groupBy({
            by: ['provider', 'model'],
            where: {
                projectId: projectId,
                timestamp: {
                    gte: startDate,
                },
            },
            _sum: {
                totalCost: true,
                tokensInput: true,
                tokensOutput: true,
            },
            _count: {
                id: true,
            },
        });

        const dailyUsage = await prisma.$queryRaw`
            SELECT
                DATE(timestamp) as date,
                SUM("totalCost") as cost,
                SUM("tokensInput") as tokens_input,
                SUM("tokensOutput") as tokens_output,
                COUNT(id)::int as requests
            FROM "usage"
            WHERE "projectId" = ${projectId}
              AND timestamp >= ${startDate}
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
        `;

        const successRate = await prisma.usage.groupBy({
            by: ['success'],
            where: {
                projectId: projectId,
                timestamp: {
                    gte: startDate,
                },
            },
            _count: {
                id: true,
            },
        });

        const avgLatency = await prisma.usage.aggregate({
            where: {
                projectId: projectId,
                timestamp: {
                    gte: startDate,
                },
            },
            _avg: {
                latency: true,
            },
        });

        const cacheStats = await prisma.usage.groupBy({
            by: ['cacheHit'],
            where: {
                projectId: projectId,
                timestamp: {
                    gte: startDate,
                },
                cached: true,
            },
            _count: {
                id: true,
            },
        });

        const topEndpoints = await prisma.usage.groupBy({
            by: ['endpoint'],
            where: {
                projectId: projectId,
                timestamp: {
                    gte: startDate,
                },
            },
            _count: {
                id: true,
            },
            _sum: {
                totalCost: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 10,
        });

        const stats = {
            overview: {
                totalRequests: successRate.reduce((acc, curr) => acc + curr._count.id, 0),
                successRate: calculateSuccessRate(successRate),
                averageLatency: avgLatency._avg.latency || 0,
                cacheHitRate: calculateCacheHitRate(cacheStats),
            },
            usageByModel,
            dailyUsage,
            topEndpoints,
            costProjection: calculateCostProjection(dailyUsage as any[], days),
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching project statistics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch project statistics' },
            { status: 500 }
        );
    }
}

function calculateSuccessRate(successData: any[]): number {
    const total = successData.reduce((acc, curr) => acc + curr._count.id, 0);
    const successful = successData.find(s => s.success === true)?._count.id || 0;
    return total > 0 ? (successful / total) * 100 : 0;
}

function calculateCacheHitRate(cacheData: any[]): number {
    const total = cacheData.reduce((acc, curr) => acc + curr._count.id, 0);
    const hits = cacheData.find(c => c.cacheHit === true)?._count.id || 0;
    return total > 0 ? (hits / total) * 100 : 0;
}

function calculateCostProjection(dailyUsage: any[], days: number): any {
    if (dailyUsage.length === 0) return { daily: 0, weekly: 0, monthly: 0 };

    const totalCost = dailyUsage.reduce((acc, curr) => acc + parseFloat(curr.cost || 0), 0);
    const avgDailyCost = totalCost / days;

    return {
        daily: avgDailyCost,
        weekly: avgDailyCost * 7,
        monthly: avgDailyCost * 30,
    };
}