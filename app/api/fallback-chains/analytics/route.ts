import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '30d';
        const chainId = searchParams.get('chainId');

        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }

        const whereClause: any = {
            timestamp: { gte: startDate, lte: endDate }
        };

        if (chainId) {
            whereClause.chainId = chainId;
        } else {
            const userChains = await prisma.fallbackChain.findMany({
                where: { userId: session.user.id },
                select: { id: true }
            });
            whereClause.chainId = { in: userChains.map(c => c.id) };
        }

        const executions = await prisma.fallbackExecution.findMany({
            where: whereClause,
            select: {
                id: true,
                chainId: true,
                triggerType: true,
                success: true,
                totalLatency: true,
                primaryCost: true,
                actualCost: true,
                costSaved: true,
                timestamp: true,
                finalModel: true,
                stepsExecuted: true
            },
            orderBy: { timestamp: 'asc' }
        });

        const analytics = {
            overview: {
                totalExecutions: executions.length,
                successfulExecutions: executions.filter(e => e.success).length,
                failedExecutions: executions.filter(e => !e.success).length,
                successRate: executions.length > 0
                    ? ((executions.filter(e => e.success).length / executions.length) * 100).toFixed(2) + '%'
                    : '0%',
                totalCostSaved: executions.reduce((sum, e) => sum + (e.costSaved || 0), 0),
                avgLatency: executions.length > 0
                    ? Math.round(executions.reduce((sum, e) => sum + e.totalLatency, 0) / executions.length)
                    : 0
            },
            triggerBreakdown: {} as Record<string, number>,
            modelUsage: {} as Record<string, number>,
            dailyStats: [] as any[],
            topChains: [] as any[]
        };

        executions.forEach(exec => {
            analytics.triggerBreakdown[exec.triggerType] =
                (analytics.triggerBreakdown[exec.triggerType] || 0) + 1;
        });

        executions.forEach(exec => {
            if (exec.finalModel) {
                analytics.modelUsage[exec.finalModel] =
                    (analytics.modelUsage[exec.finalModel] || 0) + 1;
            }
        });

        const dailyMap = new Map<string, any>();
        executions.forEach(exec => {
            const day = exec.timestamp.toISOString().split('T')[0];
            if (!dailyMap.has(day)) {
                dailyMap.set(day, {
                    date: day,
                    executions: 0,
                    successes: 0,
                    costSaved: 0
                });
            }
            const dayStats = dailyMap.get(day);
            dayStats.executions++;
            if (exec.success) dayStats.successes++;
            dayStats.costSaved += exec.costSaved || 0;
        });
        analytics.dailyStats = Array.from(dailyMap.values());

        if (!chainId) {
            const chainStats = new Map<string, any>();
            executions.forEach(exec => {
                if (!chainStats.has(exec.chainId)) {
                    chainStats.set(exec.chainId, {
                        chainId: exec.chainId,
                        executions: 0,
                        successes: 0,
                        totalSaved: 0
                    });
                }
                const stats = chainStats.get(exec.chainId);
                stats.executions++;
                if (exec.success) stats.successes++;
                stats.totalSaved += exec.costSaved || 0;
            });

            const chainIds = Array.from(chainStats.keys());
            const chains = await prisma.fallbackChain.findMany({
                where: { id: { in: chainIds } },
                select: { id: true, name: true }
            });
            const chainNameMap = chains.reduce((acc, c) => {
                acc[c.id] = c.name;
                return acc;
            }, {} as Record<string, string>);

            analytics.topChains = Array.from(chainStats.values())
                .map(stats => ({
                    ...stats,
                    name: chainNameMap[stats.chainId] || 'Unknown',
                    successRate: stats.executions > 0
                        ? ((stats.successes / stats.executions) * 100).toFixed(2) + '%'
                        : '0%'
                }))
                .sort((a, b) => b.totalSaved - a.totalSaved)
                .slice(0, 5);
        }

        return NextResponse.json(analytics);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}