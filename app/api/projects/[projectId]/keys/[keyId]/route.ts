import {NextRequest, NextResponse} from 'next/server';
import {authMiddleware, checkProjectPermission} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';

export async function PUT(req: NextRequest, {params}: { params: { projectId: string, keyId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;

    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'api-keys:update');
    if (!hasPermission) {
        return NextResponse.json({error: 'You do not have permission to update API keys.'}, {status: 403});
    }

    try {
        const keyToUpdate = await prisma.apiKey.findFirst({
            where: {id: params.keyId, projectId: params.projectId}
        });

        if (!keyToUpdate) {
            return NextResponse.json({error: 'API Key not found in this project.'}, {status: 404});
        }

        const body = await req.json();

        const {projectId: _, ...updateData} = body;

        const updatedKey = await prisma.apiKey.update({
            where: {id: params.keyId},
            data: updateData,
            select: {
                id: true, name: true, keyPrefix: true, active: true, created: true, lastUsed: true, expires: true,
                totalUsageLimit: true, monthlyUsageLimit: true, dailyUsageLimit: true, maxCostPerRequest: true,
                rateLimitConfig: true, permissions: true, ipWhitelist: true, domainWhitelist: true, models: true,
                metadata: true, projectId: true, project: {select: {id: true, name: true}},
            },
        });
        const detectChanges = (original: any, updated: any): string[] => {
            const changedFields: string[] = [];

            const monitoredFields = [
                'name', 'active', 'expires', 'totalUsageLimit', 'monthlyUsageLimit',
                'dailyUsageLimit', 'maxCostPerRequest', 'permissions', 'ipWhitelist',
                'domainWhitelist', 'models', 'metadata', 'rateLimitConfig'
            ];

            monitoredFields.forEach(field => {
                if (field in updated) {
                    const originalValue = original[field as keyof typeof original];
                    const updatedValue = updated[field];

                    if (Array.isArray(originalValue) || typeof originalValue === 'object') {
                        if (JSON.stringify(originalValue) !== JSON.stringify(updatedValue)) {
                            changedFields.push(field);
                        }
                    } else {
                        if (originalValue !== updatedValue) {
                            changedFields.push(field);
                        }
                    }
                }
            });

            return changedFields;
        };
        const changes = detectChanges(keyToUpdate, updateData);
        await auditHelpers.logApiKeyAction(
            authResult.id,
            AUDIT_ACTIONS.APIKEY_LIMITS_MODIFIED,
            params.keyId,
            {
                keyName: updatedKey.name,
                projectId: params.projectId,
                changedFields: changes,
                oldActive: keyToUpdate.active,
                newActive: updatedKey.active,
                oldName: keyToUpdate.name,
                newName: updatedKey.name,
                limitsChanged: changes.some(c => ['totalUsageLimit', 'monthlyUsageLimit', 'dailyUsageLimit'].includes(c)),
                whitelistChanged: changes.some(c => ['ipWhitelist', 'domainWhitelist'].includes(c)),
                modelsChanged: changes.includes('models'),
                permissionsChanged: changes.includes('permissions'),
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json(updatedKey);

    } catch (error) {
        console.error('Error updating project API key:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logApiKeyAction(
            authResult.id,
            'project_api_key_update_failed' as any,
            params.keyId,
            {
                error: errorMessage,
                projectId: params.projectId,
                duration: Date.now() - startTime,
            },
            req
        );

        return NextResponse.json({error: 'Failed to update API key.'}, {status: 500});
    }
}


export async function DELETE(req: NextRequest, { params }: { params: { projectId: string, keyId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;

    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'api-keys:revoke');
    if (!hasPermission) {
        return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    try {
        const keyToRevoke = await prisma.apiKey.findFirst({
            where: { id: params.keyId, projectId: params.projectId }
        });

        if (!keyToRevoke) {
            return NextResponse.json({ error: 'API Key not found in this project.' }, { status: 404 });
        }


        await prisma.apiKey.update({
            where: { id: params.keyId },
            data: {
                active: false,
                revokedAt: new Date()
            }
        });

        await auditHelpers.logApiKeyAction(
            authResult.id,
            AUDIT_ACTIONS.APIKEY_DELETED,
            params.keyId,
            {
                keyName: keyToRevoke.name,
                keyPrefix: keyToRevoke.keyPrefix,
                projectId: params.projectId,
                wasActive: keyToRevoke.active,
                hadLimits: !!(keyToRevoke.totalUsageLimit || keyToRevoke.monthlyUsageLimit || keyToRevoke.dailyUsageLimit),
                hadWhitelist: !!(keyToRevoke.ipWhitelist.length || keyToRevoke.domainWhitelist.length),
                modelsCount: keyToRevoke.models.length,
                revokedAt: new Date().toISOString(),
                revokedInProject: true,
                revokedById: authResult.id,
                revokerName: authResult.name,
                duration: Date.now() - startTime,
            },
            req
        );

        return NextResponse.json({ message: "API Key has been permanently revoked." }, { status: 200 });

    } catch (error) {
        console.error('Error revoking API key:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logApiKeyAction(
            authResult.id,
            'project_api_key_deletion_failed' as any,
            params.keyId,
            {
                error: errorMessage,
                projectId: params.projectId,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({ error: 'Failed to revoke API key.' }, { status: 500 });
    }
}