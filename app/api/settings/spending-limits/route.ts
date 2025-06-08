import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                ownedProjects: {
                    where: {
                        totalSpendingLimit: {
                            not: null,
                        },
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const limits = await Promise.all(
            user.ownedProjects.map(async (project) => {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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
                    id: project.id,
                    type: 'project' as const,
                    projectId: project.id,
                    projectName: project.name,
                    limit: project.totalSpendingLimit!,
                    period: 'monthly' as const,
                    currentSpend: usage._sum.totalCost || 0,
                };
            })
        );

        return NextResponse.json(limits);
    } catch (error) {
        console.error('Failed to fetch spending limits:', error);
        return NextResponse.json({ error: 'Failed to fetch spending limits' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { type, projectId, limit, period } = await request.json();

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (type === 'project' && projectId) {
            const project = await prisma.project.update({
                where: {
                    id: projectId,
                    ownerId: user.id,
                },
                data: {
                    totalSpendingLimit: limit,
                },
            });

            return NextResponse.json({ success: true, project });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (error) {
        console.error('Failed to create spending limit:', error);
        return NextResponse.json({ error: 'Failed to create spending limit' }, { status: 500 });
    }
}