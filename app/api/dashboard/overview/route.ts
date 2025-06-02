import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const [
            currentMonthUsage,
            lastMonthUsage,
            activeKeys,
            keysInUse,
            totalUsage,
        ] = await Promise.all([
            prisma.usage.aggregate({
                where: {
                    userId,
                    timestamp: {
                        gte: currentMonthStart,
                        lte: currentMonthEnd
                    }
                },
                _sum: {
                    totalCost: true,
                    tokensInput: true,
                    tokensOutput: true
                }
            }),

            prisma.usage.aggregate({
                where: {
                    userId,
                    timestamp: {
                        gte: lastMonthStart,
                        lte: lastMonthEnd
                    }
                },
                _sum: {
                    totalCost: true,
                    tokensInput: true,
                    tokensOutput: true
                }
            }),

            prisma.apiKey.count({
                where: {
                    userId,
                    active: true
                }
            }),

            prisma.apiKey.count({
                where: {
                    userId,
                    active: true,
                    lastUsed: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            }),

            prisma.usage.findMany({
                where: { userId },
            }),
        ]);

        const currentCost = currentMonthUsage._sum.totalCost || 0;
        const lastMonthCost = lastMonthUsage._sum.totalCost || 0;
        const currentTokens = (currentMonthUsage._sum.tokensInput || 0) + (currentMonthUsage._sum.tokensOutput || 0);
        const lastMonthTokens = (lastMonthUsage._sum.tokensInput || 0) + (lastMonthUsage._sum.tokensOutput || 0);

        const response = {
            totalRequests: totalUsage.length,
            totalTokens: totalUsage.reduce((acc, curr) => acc + (curr.tokensInput + curr.tokensOutput), 0),
            currentCost: currentCost,
            activeKeys,
            keysInUse,
            percentageChanges: {
                cost: ((currentCost - lastMonthCost) / (lastMonthCost || 1)) * 100,
                requests: ((totalUsage.filter(item => item.timestamp >= currentMonthStart && item.timestamp <= currentMonthEnd).length - totalUsage.filter(item => item.timestamp >= lastMonthStart && item.timestamp <= lastMonthEnd).length) / (totalUsage.filter(item => item.timestamp >= lastMonthStart && item.timestamp <= lastMonthEnd).length || 1)) * 100,
                tokens: ((currentTokens - lastMonthTokens) / (lastMonthTokens || 1)) * 100
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Overview API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch overview data' },
            { status: 500 }
        );
    }
}