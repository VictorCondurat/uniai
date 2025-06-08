import {NextRequest, NextResponse} from 'next/server';
import {authMiddleware, checkProjectPermission, hashApiKey} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {nanoid} from 'nanoid';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';
export async function GET(req: NextRequest, {params}: { params: { projectId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;

    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'api-keys:read');
    if (!hasPermission) {
        return NextResponse.json({error: 'You do not have permission to view API keys for this project.'}, {status: 403});
    }

    const keys = await prisma.apiKey.findMany({
        where: {
            projectId: params.projectId,
            revokedAt: null
        },
        select: {
            id: true, name: true, keyPrefix: true, active: true, created: true, lastUsed: true, expires: true,
            totalUsageLimit: true, monthlyUsageLimit: true, dailyUsageLimit: true, maxCostPerRequest: true,
            rateLimitConfig: true, permissions: true, ipWhitelist: true, domainWhitelist: true, models: true,
            metadata: true, projectId: true, project: {select: {id: true, name: true}}
        },
        orderBy: {created: 'desc'},
    });
    await auditHelpers.logProjectAction(
        authResult.id,
        AUDIT_ACTIONS.ROUTE_ACCESSED,
        params.projectId,
        {
            action: 'project_api_keys_viewed',
            keysCount: keys.length,
            activeKeysCount: keys.filter(k => k.active).length,
            keysWithLimits: keys.filter(k => k.totalUsageLimit || k.monthlyUsageLimit || k.dailyUsageLimit).length,
            keysWithWhitelist: keys.filter(k => k.ipWhitelist.length > 0 || k.domainWhitelist.length > 0).length,
            duration: Date.now() - startTime,
        },
        req
    );
    return NextResponse.json(keys);
}

export async function POST(req: NextRequest, {params}: { params: { projectId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'api-keys:create');
    if (!hasPermission) {
        return NextResponse.json({error: 'You do not have permission to create API keys for this project.'}, {status: 403});
    }
    const body = await req.json();

    try {
        const {
            name, totalUsageLimit, monthlyUsageLimit, dailyUsageLimit, maxCostPerRequest, rateLimitConfig,
            permissions, ipWhitelist, domainWhitelist, models, metadata, expires, keyPrefix: customPrefix
        } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({error: 'API key name is required'}, {status: 400});
        }

        const keyPrefix = customPrefix ? `${customPrefix.replace(/[^a-zA-Z0-9_]/g, '')}` : 'uni_proj_';
        const secretPart = nanoid(32);
        const rawKey = `${keyPrefix}${secretPart}`;

        const hashedKey = hashApiKey(rawKey);

        const newApiKey = await prisma.apiKey.create({
            data: {
                userId: authResult.id,
                projectId: params.projectId,
                name,
                hashedKey,
                keyPrefix,
                active: true,
                totalUsageLimit: totalUsageLimit || undefined,
                monthlyUsageLimit: monthlyUsageLimit || undefined,
                dailyUsageLimit: dailyUsageLimit || undefined,
                maxCostPerRequest: maxCostPerRequest || undefined,
                rateLimitConfig: rateLimitConfig || undefined,
                permissions: permissions || undefined,
                ipWhitelist: ipWhitelist || [],
                domainWhitelist: domainWhitelist || [],
                models: models || [],
                metadata: metadata || undefined,
                expires: expires ? new Date(expires) : undefined,
            },
            select: {
                id: true, name: true, keyPrefix: true, active: true, created: true, lastUsed: true, expires: true,
                totalUsageLimit: true, monthlyUsageLimit: true, dailyUsageLimit: true, maxCostPerRequest: true,
                rateLimitConfig: true, permissions: true, ipWhitelist: true, domainWhitelist: true, models: true,
                metadata: true, projectId: true, project: {select: {id: true, name: true}},
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: authResult.id, action: 'api_key_created', resource: 'project',
                resourceId: params.projectId, details: {keyName: name, keyId: newApiKey.id},
            },
        });
        await auditHelpers.logApiKeyAction(
            authResult.id,
            AUDIT_ACTIONS.APIKEY_CREATED,
            newApiKey.id,
            {
                keyName: newApiKey.name,
                keyPrefix: newApiKey.keyPrefix,
                projectId: params.projectId,
                hasLimits: !!(totalUsageLimit || monthlyUsageLimit || dailyUsageLimit),
                hasRateLimit: !!rateLimitConfig,
                hasWhitelist: !!(ipWhitelist?.length || domainWhitelist?.length),
                modelsCount: models?.length || 0,
                hasPermissions: !!permissions,
                expiresAt: expires,
                createdInProject: true,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({...newApiKey, rawKey}, {status: 201});

    } catch (error) {
        console.error('Error creating API key in project:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logProjectAction(
            authResult.id,
            'project_api_key_creation_failed' as any,
            params.projectId,
            {
                error: errorMessage,
                keyName: body?.name,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({error: 'Failed to create API key'}, {status: 500});
    }
}