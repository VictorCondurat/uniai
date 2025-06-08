import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectRole } from '@prisma/client';

export async function POST(req: NextRequest) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    try {
        const body = await req.json();
        const { name, description, totalSpendingLimit, allowedModels, tags } = body;

        if (!name) {
            return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description,
                totalSpendingLimit: totalSpendingLimit ? parseFloat(totalSpendingLimit) : null,
                allowedModels: allowedModels || [],
                tags: tags || [],
                ownerId: user.id,
                members: {
                    create: {
                        userId: user.id,
                        role: ProjectRole.OWNER,
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
                details: { name: project.name },
            },
        });

        const newProjectWithDetails = await prisma.project.findUnique({
            where: { id: project.id },
            include: {
                _count: { select: { apiKeys: true, fallbackChains: true, members: true } },
                owner: { select: { id: true, name: true, email: true } }
            }
        });

        return NextResponse.json({
            ...newProjectWithDetails,
            userRole: ProjectRole.OWNER,
            currentSpend: 0,
            allowedModelDetails: [],
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}


export async function GET(req: NextRequest) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    try {
        const allModels = await prisma.modelDescription.findMany({
            select: {
                id: true,
                name: true,
                provider: {
                    select: {
                        providerId: true
                    }
                }
            }
        });
        const modelMap = new Map(allModels.map(m => [m.id, { name: m.name, provider: m.provider.providerId }]));

        const projects = await prisma.project.findMany({
            where: {
                members: {
                    some: {
                        userId: user.id,
                    },
                },
            },
            include: {
                _count: { select: { apiKeys: true, fallbackChains: true, members: true } },
                owner: { select: { id: true, name: true, email: true } },
                members: { where: { userId: user.id }, select: { role: true } }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const projectsWithDetails = await Promise.all(
            projects.map(async (p) => {
                const usage = await prisma.usage.aggregate({
                    where: { projectId: p.id, timestamp: { gte: startOfMonth } },
                    _sum: { totalCost: true },
                });

                const userRole = p.members[0]?.role;
                const { members, ...projectData } = p;

                const allowedModelDetails = p.allowedModels
                    .map(id => modelMap.get(id))
                    .filter(Boolean) as { name: string; provider: string }[];

                return {
                    ...projectData,
                    currentSpend: usage._sum.totalCost || 0,
                    userRole: userRole,
                    allowedModelDetails,
                };
            })
        );

        const ownedProjects = projectsWithDetails.filter(p => p.ownerId === user.id);
        const memberOfProjects = projectsWithDetails.filter(p => p.ownerId !== user.id);

        return NextResponse.json({ owned: ownedProjects, memberOf: memberOfProjects });

    } catch (error) {
        console.error('Failed to fetch projects:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to fetch projects', details: errorMessage }, { status: 500 });
    }
}