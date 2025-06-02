import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
    const authResult = await authMiddleware(req);

    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const user = authResult;

    try {
        const apiKeys = await prisma.apiKey.findMany({
            where: { userId: user.id },
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
                project: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: { created: 'desc' },
        });

        return NextResponse.json(apiKeys);
    } catch (error) {
        console.error('Error fetching API keys:', error);
        return NextResponse.json(
            { error: 'Failed to fetch API keys' },
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
        const {
            name,
            projectId,
            usageLimit,
            permissions,
            ipWhitelist,
            models,
            webhookUrl,
            expires
        } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { error: 'API key name is required' },
                { status: 400 }
            );
        }

        const apiKey = `uai_${nanoid(32)}`;

        const newKey = await prisma.apiKey.create({
            data: {
                userId: user.id,
                name,
                key: apiKey,
                active: true,
                projectId: projectId || undefined,
                usageLimit: usageLimit || undefined,
                permissions: permissions || [],
                ipWhitelist: ipWhitelist || [],
                models: models || [],
                webhookUrl: webhookUrl || undefined,
                expires: expires ? new Date(expires) : undefined,
                killSwitchActive: false,
            },
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
            }
        });

        return NextResponse.json(newKey, { status: 201 });
    } catch (error) {
        console.error('Error creating API key:', error);
        return NextResponse.json(
            { error: 'Failed to create API key' },
            { status: 500 }
        );
    }
}