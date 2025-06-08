import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { chainId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const chain = await prisma.fallbackChain.findFirst({

            where: {
                id: params.chainId,
                userId: session.user.id,
            },
            include: {
                project: {
                    select: { id: true, name: true }
                },
                executions: {
                    take: 10,
                    orderBy: { timestamp: 'desc' },
                    select: {
                        id: true,
                        triggerType: true,
                        success: true,
                        totalLatency: true,
                        costSaved: true,
                        timestamp: true,
                        finalModel: true,
                    }
                }
            }
        });

        if (!chain) {
            return NextResponse.json(
                { error: 'Fallback chain not found' },
                { status: 404 }
            );
        }

        const modelIds = (chain.steps as any[]).map(s => s.modelId);
        const models = await prisma.modelDescription.findMany({
            where: { modelIdentifier: { in: modelIds } },
            include: {
                provider: {
                    select: { name: true, providerId: true, iconUrl: true }
                }
            }
        });

        const modelMap = models.reduce((acc, model) => {
            acc[model.modelIdentifier] = model;
            return acc;
        }, {} as Record<string, any>);

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const recentExecutions = await prisma.fallbackExecution.count({
            where: {
                chainId: params.chainId,
                timestamp: { gte: last30Days }
            }
        });

        const enrichedChain = {
            ...chain,
            steps: (chain.steps as any[]).map(step => ({
                ...step,
                model: modelMap[step.modelId] || null
            })),
            metrics: {
                last30Days: {
                    executions: recentExecutions,
                    successRate: chain.executionCount > 0
                        ? ((chain.successCount / chain.executionCount) * 100).toFixed(2) + '%'
                        : 'N/A',
                    avgSavings: chain.avgSavings ? `$${chain.avgSavings.toFixed(3)}` : 'N/A',
                    lastExecuted: chain.lastExecuted?.toISOString() || 'Never'
                }
            }
        };

        return NextResponse.json(enrichedChain);
    } catch (error) {
        console.error('Error fetching fallback chain:', error);
        return NextResponse.json(
            { error: 'Failed to fetch fallback chain' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { chainId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        const existing = await prisma.fallbackChain.findFirst({
            where: {
                id: params.chainId,
                userId: session.user.id,
            }
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Fallback chain not found' },
                { status: 404 }
            );
        }

        const updated = await prisma.fallbackChain.update({
            where: { id: params.chainId },
            data: {
                name: body.name,
                description: body.description,
                triggers: body.triggers,
                steps: body.steps,
                active: body.active,
                type: body.type,
                priority: body.priority,
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: 'fallback_chain_updated',
                resource: 'fallback_chain',
                resourceId: params.chainId,
                details: { changes: Object.keys(body) }
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating fallback chain:', error);
        return NextResponse.json(
            { error: 'Failed to update fallback chain' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { chainId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const deleted = await prisma.fallbackChain.deleteMany({
            where: {
                id: params.chainId,
                userId: session.user.id,
            }
        });

        if (deleted.count === 0) {
            return NextResponse.json(
                { error: 'Fallback chain not found' },
                { status: 404 }
            );
        }

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: 'fallback_chain_deleted',
                resource: 'fallback_chain',
                resourceId: params.chainId,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting fallback chain:', error);
        return NextResponse.json(
            { error: 'Failed to delete fallback chain' },
            { status: 500 }
        );
    }
}