import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';

export async function PUT(
    req: NextRequest,
    { params }: { params: { keyId: string } }
) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { keyId } = params;

    try {
        const body = await req.json();
        const {
            name,
            active,
            expires,
            totalUsageLimit,
            monthlyUsageLimit,
            dailyUsageLimit,
            maxCostPerRequest,
            rateLimitConfig,
            permissions,
            ipWhitelist,
            domainWhitelist,
            models,
            metadata
        } = body;


        const existingKey = await prisma.apiKey.findFirst({
            where: { id: keyId, userId: user.id },
        });

        if (!existingKey) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        const updatedKey = await prisma.apiKey.update({
            where: { id: keyId },
            data: {
                name,
                active,
                expires: expires ? new Date(expires) : (expires === null ? null : undefined),
                totalUsageLimit,
                monthlyUsageLimit,
                dailyUsageLimit,
                maxCostPerRequest,
                rateLimitConfig,
                permissions,
                ipWhitelist,
                domainWhitelist,
                models,
                metadata,
            },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                active: true,
                created: true,
                lastUsed: true,
                expires: true,
                totalUsageLimit: true,
                monthlyUsageLimit: true,
                dailyUsageLimit: true,
                maxCostPerRequest: true,
                rateLimitConfig: true,
                permissions: true,
                ipWhitelist: true,
                domainWhitelist: true,
                models: true,
                metadata: true,
                projectId: true,
                project: {
                    select: { id: true, name: true }
                }
            },
        });
        const changes: string[] = [];
        if (name !== existingKey.name) changes.push('name');
        if (active !== existingKey.active) changes.push('active');
        if (expires !== existingKey.expires?.toISOString()) changes.push('expires');
        if (JSON.stringify(models) !== JSON.stringify(existingKey.models)) changes.push('models');
        if (JSON.stringify(ipWhitelist) !== JSON.stringify(existingKey.ipWhitelist)) changes.push('ipWhitelist');
        await auditHelpers.logApiKeyAction(
            user.id,
            AUDIT_ACTIONS.APIKEY_LIMITS_MODIFIED,
            keyId,
            {
                keyName: updatedKey.name,
                changedFields: changes,
                oldActive: existingKey.active,
                newActive: updatedKey.active,
                oldName: existingKey.name,
                newName: updatedKey.name,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json(updatedKey);
    } catch (error) {
        console.error('Error updating API key:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logApiKeyAction(
            user.id,
            'apikey_update_failed' as any,
            keyId,
            {
                error: errorMessage,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { keyId: string } }
) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { keyId } = params;

    try {
        const keyToRevoke = await prisma.apiKey.findFirst({
            where: { id: keyId, userId: user.id }
        });

        if (!keyToRevoke) {
            return NextResponse.json({ error: 'API key not found or you do not have permission.' }, { status: 404 });
        }

        await prisma.apiKey.update({
            where: { id: keyId },
            data: {
                active: false,
                revokedAt: new Date()
            }
        });
        await auditHelpers.logApiKeyAction(
            user.id,
            AUDIT_ACTIONS.APIKEY_DELETED,
            keyId,
            {
                keyName: keyToRevoke.name,
                keyPrefix: keyToRevoke.keyPrefix,
                projectId: keyToRevoke.projectId,
                wasActive: keyToRevoke.active,
                revokedAt: new Date().toISOString(),
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({ message: "API Key has been permanently revoked." }, { status: 200 });

    } catch (error) {
        console.error('Error revoking API key:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logApiKeyAction(
            user.id,
            'apikey_deletion_failed' as any,
            keyId,
            {
                error: errorMessage,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
    }
}