import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const modelChainStepSchema = z.object({
    modelId: z.string().min(1, "Model ID is required for each step."),

});

const modelChainCreateSchema = z.object({
    name: z.string().min(1, "Chain name cannot be empty.").max(100, "Chain name is too long."),
    description: z.string().max(500, "Description is too long.").optional().nullable(),
    projectId: z.string().cuid("Invalid Project ID format.").optional().nullable(),
    steps: z.array(modelChainStepSchema).min(1, "A model chain must have at least one step."),
    active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const filterProjectId = searchParams.get('projectId');

    try {
        const whereClause: any = {
            project: {
                userId: userId,
            }
        };
        if (filterProjectId) {
            whereClause.project.id = filterProjectId;
        }

        const chains = await prisma.modelChain.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
            include: {
                project: {
                    select: { id: true, name: true, userId: true }
                }
            }
        });


        const formattedChains = chains.map(chain => {
            const steps = (chain.chainConfig as any)?.steps || [];
            return {
                id: chain.id,
                name: chain.name,
                description: chain.description,
                projectId: chain.projectId,
                projectName: chain.project.name,
                steps: steps.map((step: any) => ({ id: step.id || `step_${Math.random().toString(36).substr(2, 9)}`, modelId: step.modelId })),
                active: chain.active,
                createdAt: chain.createdAt.toISOString(),
                updatedAt: chain.updatedAt.toISOString(),
            };
        });

        return NextResponse.json(formattedChains);
    } catch (error) {
        console.error("API Error - GET /api/models/chains:", error);
        return NextResponse.json({ error: "Failed to retrieve model chains." }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const body = await request.json();
        const validation = modelChainCreateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid input.", issues: validation.error.format() }, { status: 400 });
        }
        const { name, description, projectId, steps, active } = validation.data;

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required to create a model chain." }, { status: 400 });
        }

        const project = await prisma.project.findFirst({
            where: { id: projectId, userId: userId },
        });
        if (!project) {
            return NextResponse.json({ error: "Project not found or you do not have permission to add a chain to it." }, { status: 403 });
        }

        const modelIdsInSteps = steps.map(step => step.modelId);
        const validModels = await prisma.modelDescription.findMany({
            where: { modelIdentifier: { in: modelIdsInSteps } },
            select: { modelIdentifier: true }
        });
        if (validModels.length !== modelIdsInSteps.length) {
            const invalidModelIds = modelIdsInSteps.filter(id => !validModels.some(vm => vm.modelIdentifier === id));
            return NextResponse.json({ error: `Invalid model IDs found in chain steps: ${invalidModelIds.join(', ')}` }, { status: 400 });
        }


        const newChain = await prisma.modelChain.create({
            data: {
                name,
                description,
                projectId: projectId,
                chainConfig: { steps: steps.map(s => ({ modelId: s.modelId })) }, // Store only essential step data
                active,
            },
        });

        await prisma.auditLog.create({
            data: { userId, action: 'model_chain_created', resource: 'model_chain', resourceId: newChain.id, details: { name, stepsCount: steps.length, projectId } },
        });

        const createdChainData = {
            ...newChain,
            steps: (newChain.chainConfig as any)?.steps || [],
            projectName: project.name,
        }

        return NextResponse.json(createdChainData, { status: 201 });
    } catch (error) {
        console.error("API Error - POST /api/models/chains:", error);
        return NextResponse.json({ error: "An unexpected error occurred while creating the model chain." }, { status: 500 });
    }
}