import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const triggerSchema = z.object({
    onHttpError: z.object({
        enabled: z.boolean(),
        codes: z.array(z.number()).optional()
    }).optional(),
    onProviderError: z.object({
        enabled: z.boolean(),
        errorTypes: z.array(z.string()).optional()
    }).optional(),
    onLatency: z.object({
        enabled: z.boolean(),
        thresholdMs: z.number().min(100).max(30000)
    }).optional(),
    onCost: z.object({
        enabled: z.boolean(),
        thresholdUSD: z.number().min(0.01).max(100)
    }).optional(),
});

const stepSchema = z.object({
    modelId: z.string(),
    conditions: z.object({
        skipIf: z.string().optional(),
        onlyIf: z.string().optional(),
    }).optional(),
    timeout: z.number().min(1000).max(60000).optional(),
    maxRetries: z.number().min(0).max(3).optional(),
});

const createChainSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    projectId: z.string().optional(),
    type: z.enum(['standard', 'cost_optimized', 'high_availability', 'performance']).optional(),
    triggers: triggerSchema,
    steps: z.array(stepSchema).min(1).max(10),
    active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const includeStats = searchParams.get('includeStats') === 'true';

        const chains = await prisma.fallbackChain.findMany({
            where: {
                userId: session.user.id,
                ...(projectId && { projectId }),
            },
            include: {
                project: {
                    select: { id: true, name: true }
                },
                ...(includeStats && {
                    _count: {
                        select: { executions: true }
                    }
                })
            },
            orderBy: [
                { priority: 'desc' },
                { updatedAt: 'desc' }
            ],
        });

        const allModelIds = chains.flatMap(chain =>
            (chain.steps as any[]).map(step => step.modelId)
        );

        const models = await prisma.modelDescription.findMany({
            where: { modelIdentifier: { in: allModelIds } },
            select: {
                modelIdentifier: true,
                name: true,
                provider: {
                    select: { name: true, providerId: true }
                }
            }
        });

        const modelMap = models.reduce((acc, model) => {
            acc[model.modelIdentifier] = model;
            return acc;
        }, {} as Record<string, any>);

        const enrichedChains = chains.map(chain => ({
            ...chain,
            steps: (chain.steps as any[]).map(step => ({
                ...step,
                modelInfo: modelMap[step.modelId] || null
            })),
            stats: includeStats ? {
                totalExecutions: (chain as any)._count?.executions || 0,
                successRate: chain.executionCount > 0
                    ? (chain.successCount / chain.executionCount * 100).toFixed(2) + '%'
                    : 'N/A',
                avgSavings: chain.avgSavings ? `$${chain.avgSavings.toFixed(3)}` : 'N/A'
            } : undefined
        }));

        return NextResponse.json(enrichedChains);
    } catch (error) {
        console.error('Error fetching fallback chains:', error);
        return NextResponse.json(
            { error: 'Failed to fetch fallback chains' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const validation = createChainSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.format() },
                { status: 400 }
            );
        }

        const { name, description, projectId, type, triggers, steps, active } = validation.data;

        if (projectId) {
            const project = await prisma.project.findFirst({
                where: { id: projectId, ownerId : session.user.id }
            });
            if (!project) {
                return NextResponse.json(
                    { error: 'Project not found or access denied' },
                    { status: 403 }
                );
            }
        }

        const modelIds = steps.map(s => s.modelId);
        const validModels = await prisma.modelDescription.findMany({
            where: { modelIdentifier: { in: modelIds } },
            select: { modelIdentifier: true }
        });

        if (validModels.length !== modelIds.length) {
            const invalidIds = modelIds.filter(
                id => !validModels.some(m => m.modelIdentifier === id)
            );
            return NextResponse.json(
                { error: `Invalid model IDs: ${invalidIds.join(', ')}` },
                { status: 400 }
            );
        }

        const chain = await prisma.fallbackChain.create({
            data: {
                userId: session.user.id,
                projectId,
                name,
                description,
                type: type || 'standard',
                triggers,
                steps,
                active: active ?? true,
                priority: 0,
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: 'fallback_chain_created',
                resource: 'fallback_chain',
                resourceId: chain.id,
                details: { name, type, stepsCount: steps.length }
            }
        });

        return NextResponse.json(chain, { status: 201 });
    } catch (error) {
        console.error('Error creating fallback chain:', error);
        return NextResponse.json(
            { error: 'Failed to create fallback chain' },
            { status: 500 }
        );
    }
}