import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const modelChainStepSchema = z.object({
    modelId: z.string().min(1),
});
const modelChainUpdateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    steps: z.array(modelChainStepSchema).min(1, "Chain must have at least one step.").optional(),
    active: z.boolean().optional(),
});


export async function GET(
    request: NextRequest,
    { params }: { params: { chainId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { chainId } = params;

    if (!chainId) {
        return NextResponse.json({ error: "Chain ID is required." }, { status: 400 });
    }

    try {
        const chain = await prisma.modelChain.findFirst({
            where: {
                id: chainId,
                project: { userId: userId },
            },
            include: { project: { select: { name: true } } }
        });

        if (!chain) {
            return NextResponse.json({ error: "Model chain not found or access denied." }, { status: 404 });
        }

        const responseData = {
            ...chain,
            steps: (chain.chainConfig as any)?.steps || [],
            projectName: chain.project.name,
        };
        return NextResponse.json(responseData);

    } catch (error) {
        console.error(`API Error - GET /api/models/chains/${chainId}:`, error);
        return NextResponse.json({ error: "Failed to fetch model chain details." }, { status: 500 });
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
    const userId = session.user.id;
    const { chainId } = params;

    if (!chainId) {
        return NextResponse.json({ error: "Chain ID is required." }, { status: 400 });
    }

    try {
        const body = await request.json();
        const validation = modelChainUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid input.", issues: validation.error.format() }, { status: 400 });
        }
        const updateData = validation.data;

        const existingChain = await prisma.modelChain.findFirst({
            where: { id: chainId, project: { userId: userId } },
            include: { project: { select: { name: true } } }
        });

        if (!existingChain) {
            return NextResponse.json({ error: "Model chain not found or access denied." }, { status: 404 });
        }

        // Validate model IDs if steps are being updated
        if (updateData.steps) {
            const modelIdsInSteps = updateData.steps.map(step => step.modelId);
            const validModels = await prisma.modelDescription.findMany({
                where: { modelIdentifier: { in: modelIdsInSteps } },
                select: { modelIdentifier: true }
            });
            if (validModels.length !== modelIdsInSteps.length) {
                const invalidModelIds = modelIdsInSteps.filter(id => !validModels.some(vm => vm.modelIdentifier === id));
                return NextResponse.json({ error: `Invalid model IDs found in chain steps: ${invalidModelIds.join(', ')}` }, { status: 400 });
            }
        }

        const prismaUpdateData: any = {};
        if (typeof updateData.name === 'string') prismaUpdateData.name = updateData.name;
        if (typeof updateData.description !== 'undefined') prismaUpdateData.description = updateData.description;
        if (updateData.steps) prismaUpdateData.chainConfig = { steps: updateData.steps.map(s => ({ modelId: s.modelId })) };
        if (typeof updateData.active === 'boolean') prismaUpdateData.active = updateData.active;

        if (Object.keys(prismaUpdateData).length === 0) {
            return NextResponse.json({ message: "No changes provided to update." }, { status: 200 });
        }

        const updatedChain = await prisma.modelChain.update({
            where: { id: chainId },
            data: prismaUpdateData,
        });

        await prisma.auditLog.create({
            data: { userId, action: 'model_chain_updated', resource: 'model_chain', resourceId: updatedChain.id, details: { name: updatedChain.name, changes: updateData } },
        });

        const responseData = {
            ...updatedChain,
            steps: (updatedChain.chainConfig as any)?.steps || [],
            projectName: existingChain.project.name,
        };
        return NextResponse.json(responseData);

    } catch (error) {
        console.error(`API Error - PUT /api/models/chains/${chainId}:`, error);
        return NextResponse.json({ error: "Failed to update model chain." }, { status: 500 });
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
    const userId = session.user.id;
    const { chainId } = params;

    if (!chainId) {
        return NextResponse.json({ error: "Chain ID is required." }, { status: 400 });
    }

    try {
        const chainToDelete = await prisma.modelChain.findFirst({
            where: { id: chainId, project: { userId: userId } },
        });

        if (!chainToDelete) {
            return NextResponse.json({ error: "Model chain not found or access denied." }, { status: 404 });
        }

        await prisma.modelChain.delete({ where: { id: chainId } });

        await prisma.auditLog.create({
            data: { userId, action: 'model_chain_deleted', resource: 'model_chain', resourceId: chainId, details: { name: chainToDelete.name } },
        });

        return NextResponse.json({ success: true, message: "Model chain deleted successfully." });
    } catch (error) {
        console.error(`API Error - DELETE /api/models/chains/${chainId}:`, error);
        return NextResponse.json({ error: "Failed to delete model chain." }, { status: 500 });
    }
}