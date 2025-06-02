import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const authResult = await authMiddleware(req);

    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const user = authResult;

    try {
        const projectsWithLimits = await prisma.project.findMany({
            where: {
                userId: user.id,
                spendingLimit: {
                    not: null,
                },
            },
            select: {
                id: true,
                name: true,
                spendingLimit: true,
            },
        });

        if (projectsWithLimits.length === 0) {
            return NextResponse.json({ projects: [] });
        }

        // Calculate current month spending for each project
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

        const projectLimitStatus = await Promise.all(
            projectsWithLimits.map(async (project) => {
                const monthlySpend = await prisma.usage.aggregate({
                    where: {
                        projectId: project.id,
                        timestamp: {
                            gte: startOfMonth,
                        },
                    },
                    _sum: {
                        totalCost: true,
                    },
                });

                const currentSpend = monthlySpend._sum.totalCost || 0;
                const percentUsed = (currentSpend / project.spendingLimit!) * 100;

                return {
                    projectId: project.id,
                    projectName: project.name,
                    spendingLimit: project.spendingLimit,
                    currentSpend,
                    percentUsed,
                    status: getSpendingStatus(percentUsed),
                    remainingBudget: Math.max(0, project.spendingLimit! - currentSpend),
                };
            })
        );

        for (const project of projectLimitStatus) {
            if (project.percentUsed >= 80) {
                const existingAlert = await prisma.alert.findFirst({
                    where: {
                        userId: user.id,
                        type: 'budget',
                        message: {
                            contains: project.projectId,
                        },
                        createdAt: {
                            gte: startOfMonth,
                        },
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
        return NextResponse.json(
            { error: 'Failed to check project limits' },
            { status: 500 }
        );
    }
}

function getSpendingStatus(percentUsed: number): 'normal' | 'warning' | 'critical' | 'exceeded' {
    if (percentUsed >= 100) return 'exceeded';
    if (percentUsed >= 90) return 'critical';
    if (percentUsed >= 80) return 'warning';
    return 'normal';
}