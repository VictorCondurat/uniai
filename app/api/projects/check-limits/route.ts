import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';
export async function GET(req: NextRequest) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    try {

        const projectsWithLimits = await prisma.project.findMany({
            where: {
                members: {
                    some: { userId: user.id }
                },
                totalSpendingLimit: {
                    not: null,
                },
            },
            select: {
                id: true,
                name: true,
                totalSpendingLimit: true,
            },
        });

        if (projectsWithLimits.length === 0) {
            return NextResponse.json({ projects: [] });
        }

        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const projectLimitStatus = await Promise.all(
            projectsWithLimits.map(async (project) => {
                const monthlySpend = await prisma.usage.aggregate({
                    where: { projectId: project.id, timestamp: { gte: startOfMonth } },
                    _sum: { totalCost: true },
                });

                const currentSpend = monthlySpend._sum.totalCost || 0;
                const limit = project.totalSpendingLimit!;
                const percentUsed = (currentSpend / limit) * 100;

                return {
                    projectId: project.id,
                    projectName: project.name,
                    spendingLimit: limit,
                    currentSpend,
                    percentUsed,
                    status: getSpendingStatus(percentUsed),
                    remainingBudget: Math.max(0, limit - currentSpend),
                };
            })
        );

        for (const project of projectLimitStatus) {
            if (project.percentUsed >= 80) {
                const existingAlert = await prisma.alert.findFirst({
                    where: {
                        userId: user.id,
                        type: 'budget',
                        message: { contains: project.projectId },
                        createdAt: { gte: startOfMonth },
                    },
                });

                if (!existingAlert && project.percentUsed < 100) {
                    await prisma.alert.create({
                        data: {
                            userId: user.id,
                            type: 'budget',
                            threshold: 80,
                            message: `Project "${project.projectName}" has used ${project.percentUsed.toFixed(1)}% of its monthly budget`,
                            triggered: true,
                        },
                    });
                }
            }
        }
        await auditHelpers.logUserAction(
            user.id,
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            {
                action: 'project_limits_checked',
                projectsWithLimits: projectsWithLimits.length,
                projectsNearLimit: projectLimitStatus.filter(p => p.percentUsed >= 80).length,
                projectsOverLimit: projectLimitStatus.filter(p => p.percentUsed >= 100).length,
                alertsCreated: 0,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({
            projects: projectLimitStatus,
            summary: {
                totalProjects: projectLimitStatus.length,
                projectsNearLimit: projectLimitStatus.filter(p => p.percentUsed >= 80).length,
                projectsOverLimit: projectLimitStatus.filter(p => p.percentUsed >= 100).length,
            },
        });
    } catch (error) {
        console.error('Error checking project limits:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logUserAction(
            user.id,
            'project_limits_check_failed' as any,
            {
                error: errorMessage,
                duration: Date.now() - startTime,
            },
            req
        );

        return NextResponse.json({ error: 'Failed to check project limits' }, { status: 500 });
    }
}

function getSpendingStatus(percentUsed: number): 'normal' | 'warning' | 'critical' | 'exceeded' {
    if (percentUsed >= 100) return 'exceeded';
    if (percentUsed >= 90) return 'critical';
    if (percentUsed >= 80) return 'warning';
    return 'normal';
}