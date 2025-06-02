import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
    req: NextRequest,
    { params }: { params: { keyId: string } }
) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const user = authResult;
    const { keyId } = params;

    try {
        const body = await req.json();

        const existingKey = await prisma.apiKey.findFirst({
            where: {
                id: keyId,
                userId: user.id,
            },
        });

        if (!existingKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        const updatedKey = await prisma.apiKey.update({
            where: { id: keyId },
            data: body,
            select: {
                id: true,
                name: true,
                key: true,
                active: true,
                created: true,
                lastUsed: true,
                expires: true,
                usageLimit: true,
                killSwitchActive: true,
                permissions: true,
                ipWhitelist: true,
                models: true,
                webhookUrl: true,
                projectId: true,
            },
        });

        return NextResponse.json(updatedKey);
    } catch (error) {
        console.error('Error updating API key:', error);
        return NextResponse.json(
            { error: 'Failed to update API key' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { keyId: string } }
) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const user = authResult;
    const { keyId } = params;

    try {
        const deletedKey = await prisma.apiKey.deleteMany({
            where: {
                id: keyId,
                userId: user.id,
            },
        });

        if (deletedKey.count === 0) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting API key:', error);
        return NextResponse.json(
            { error: 'Failed to delete API key' },
            { status: 500 }
        );
    }
}