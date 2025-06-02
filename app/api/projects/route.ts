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
        const projects = await prisma.project.findMany({
            where: { userId: user.id },
            include: {
                _count: {
                    select: {
                        apiKeys: true,
                        modelChains: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const projectsWithSpend = await Promise.all(
            projects.map(async (project) => {
                const currentMonth = new Date();
                const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

                const usage = await prisma.usage.aggregate({
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

                return {
                    ...project,
                    currentSpend: usage._sum.totalCost || 0,
                };
            })
        );

        return NextResponse.json(projectsWithSpend);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const authResult = await authMiddleware(req);

    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const user = authResult;

    try {
        const body = await req.json();
        const { name, description, spendingLimit } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { error: 'Project name is required' },
                { status: 400 }
            );
        }

        const existingProject = await prisma.project.findFirst({
            where: {
                userId: user.id,
                name: name,
            },
        });

        if (existingProject) {
            return NextResponse.json(
                { error: 'You already have a project with this name' },
                { status: 400 }
            );
        }

        const project = await prisma.project.create({
            data: {
                name,
                description: description || undefined,
                spendingLimit: spendingLimit || undefined,
                userId: user.id,
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
                action: 'project_created',
                resource: 'project',
                resourceId: project.id,
                details: {
                    projectName: name,
                    spendingLimit: spendingLimit,
                },
            },
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json(
            { error: 'Failed to create project' },
            { status: 500 }
        );
    }
}