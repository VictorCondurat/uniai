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
            include: {
                apiKeys: {
                    select: {
                        id: true,
                        name: true,
                        active: true,
                        created: true,
                        lastUsed: true,
                    },
                },
                modelChains: {
                    select: {
                        id: true,
                        name: true,
                        active: true,
                        description: true,
                    },
                },

                _count: {
                    select: {
                        apiKeys: true,
                        modelChains: true,
                        usage: true,
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

        const [monthlyUsage, totalUsage] = await Promise.all([
            prisma.usage.aggregate({
                where: {
                    projectId: project.id,
                    timestamp: {
                        gte: startOfMonth,
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
            }),
            prisma.usage.aggregate({
                where: {
                    projectId: project.id,
                },
                _sum: {
                    totalCost: true,
                    tokensInput: true,
                    tokensOutput: true,
                },
                _count: {
                    id: true,
                },
            }),
        ]);

        return NextResponse.json({
            ...project,
            stats: {
                monthly: {
                    cost: monthlyUsage._sum.totalCost || 0,
                    tokensInput: monthlyUsage._sum.tokensInput || 0,
                    tokensOutput: monthlyUsage._sum.tokensOutput || 0,
                    requests: monthlyUsage._count.id || 0,
                },
                total: {
                    cost: totalUsage._sum.totalCost || 0,
                    tokensInput: totalUsage._sum.tokensInput || 0,
                    tokensOutput: totalUsage._sum.tokensOutput || 0,
                    requests: totalUsage._count.id || 0,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        return NextResponse.json(
            { error: 'Failed to fetch project' },
            { status: 500 }
        );
    }
}

export async function PUT(
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
        const body = await req.json();
        const { name, description, spendingLimit } = body;

        const existingProject = await prisma.project.findFirst({
            where: {
                id: projectId,
                userId: user.id,
            },
        });

        if (!existingProject) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        if (name && name !== existingProject.name) {
            const duplicateProject = await prisma.project.findFirst({
                where: {
                    userId: user.id,
                    name: name,
                    NOT: {
                        id: projectId,
                    },
                },
            });

            if (duplicateProject) {
                return NextResponse.json(
                    { error: 'You already have a project with this name' },
                    { status: 400 }
                );
            }
        }

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: {
                name: name || undefined,
                description: description,
                spendingLimit: spendingLimit,
            },
            include: {
                _count: {
                    select: {
                        apiKeys: true,
                        modelChains: true,
                    },
                },
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'project_updated',
                resource: 'project',
                resourceId: projectId,
                details: {
                    changes: {
                        name: name !== existingProject.name ? { from: existingProject.name, to: name } : undefined,
                        spendingLimit: spendingLimit !== existingProject.spendingLimit ? { from: existingProject.spendingLimit, to: spendingLimit } : undefined,
                    },
                },
            },
        });

        return NextResponse.json(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        return NextResponse.json(
            { error: 'Failed to update project' },
            { status: 500 }
        );
    }
}

export async function DELETE(
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
            include: {
                _count: {
                    select: {
                        apiKeys: true,
                        modelChains: true,
                        usage: true,
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        if (project._count.apiKeys > 0 || project._count.modelChains > 0 ) {
            return NextResponse.json(
                {
                    error: 'Cannot delete project with active resources',
                    details: {
                        apiKeys: project._count.apiKeys,
                        modelChains: project._count.modelChains,

                    }
                },
                { status: 400 }
            );
        }

        // Delete the project (cascade will handle related records)
        await prisma.project.delete({
            where: { id: projectId },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'project_deleted',
                resource: 'project',
                resourceId: projectId,
                details: {
                    projectName: project.name,
                    hadUsage: project._count.usage > 0,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        return NextResponse.json(
            { error: 'Failed to delete project' },
            { status: 500 }
        );
    }
}