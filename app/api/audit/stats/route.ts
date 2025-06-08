import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '7');
        const projectId = searchParams.get('projectId');

        const userProjects = await prisma.projectMember.findMany({
            where: { userId: session.user.id },
            select: { projectId: true },
        });
        const projectIds = userProjects.map(p => p.projectId);

        const baseWhere: any = {
            OR: [
                { userId: session.user.id },
                {
                    resource: 'project',
                    resourceId: { in: projectIds },
                },
            ],
            timestamp: {
                gte: startOfDay(subDays(new Date(), days)),
                lte: endOfDay(new Date()),
            },
        };

        if (projectId) {
            const membership = await prisma.projectMember.findFirst({
                where: { projectId, userId: session.user.id },
            });

            if (!membership) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            baseWhere.OR = [
                { userId: session.user.id, resource: 'project', resourceId: projectId },
                {
                    details: {
                        path: ['projectId'],
                        equals: projectId,
                    },
                },
            ];
        }

        const total = await prisma.auditLog.count({ where: baseWhere });

        const actionStats = await prisma.auditLog.groupBy({
            by: ['action'],
            where: baseWhere,
            _count: {
                action: true,
            },
            orderBy: {
                _count: {
                    action: 'desc',
                },
            },
            take: 10,
        });

        const resourceStats = await prisma.auditLog.groupBy({
            by: ['resource'],
            where: baseWhere,
            _count: {
                resource: true,
            },
        });

        const dailyActivity = await getDailyActivity(session.user.id, projectIds, days);

        const currentPeriod = total;
        const previousPeriodWhere = {
            ...baseWhere,
            timestamp: {
                gte: startOfDay(subDays(new Date(), days * 2)),
                lte: endOfDay(subDays(new Date(), days)),
            },
        };
        const previousPeriod = await prisma.auditLog.count({ where: previousPeriodWhere });

        const trend = previousPeriod > 0
            ? ((currentPeriod - previousPeriod) / previousPeriod) * 100
            : currentPeriod > 0 ? 100 : 0;

        const topIPs = await prisma.auditLog.groupBy({
            by: ['ipAddress'],
            where: {
                ...baseWhere,
                ipAddress: { not: null },
            },
            _count: {
                ipAddress: true,
            },
            orderBy: {
                _count: {
                    ipAddress: 'desc',
                },
            },
            take: 5,
        });

        return NextResponse.json({
            summary: {
                total,
                trend: Math.round(trend * 100) / 100,
                period: `${days} days`,
            },
            actionStats: actionStats.map(stat => ({
                action: stat.action,
                count: stat._count.action,
            })),
            resourceStats: resourceStats.map(stat => ({
                resource: stat.resource,
                count: stat._count.resource,
            })),
            dailyActivity,
            topIPs: topIPs.map(ip => ({
                ip: ip.ipAddress,
                count: ip._count.ipAddress,
            })),
        });
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function getDailyActivity(userId: string, projectIds: string[], days: number) {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                OR: [
                    { userId },
                    { resource: 'project', resourceId: { in: projectIds } },
                ],
                timestamp: {
                    gte: startOfDay(subDays(new Date(), days)),
                    lte: endOfDay(new Date()),
                },
            },
            select: {
                timestamp: true,
            },
        });

        const dailyMap = new Map<string, number>();

        for (let i = 0; i < days; i++) {
            const date = subDays(new Date(), i);
            const dateStr = date.toISOString().split('T')[0];
            dailyMap.set(dateStr, 0);
        }

        logs.forEach(log => {
            const dateStr = log.timestamp.toISOString().split('T')[0];
            const current = dailyMap.get(dateStr) || 0;
            dailyMap.set(dateStr, current + 1);
        });

        return Array.from(dailyMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, days);

    } catch (error) {
        console.error('Error getting daily activity:', error);
        return [];
    }
}