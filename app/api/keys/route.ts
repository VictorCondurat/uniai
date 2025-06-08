import {NextRequest, NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {nanoid} from 'nanoid';
import {authMiddleware, hashApiKey} from '@/lib/auth'
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    try {
        const apiKeys = await prisma.apiKey.findMany({
            where: {
                userId: user.id,
                revokedAt: null
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
                    select: {id: true, name: true},
                },
            },
            orderBy: {created: 'desc'},
        });
        await auditHelpers.logUserAction(
            user.id,
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            {
                action: 'api_keys_listed',
                keysCount: apiKeys.length,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json(apiKeys);
    } catch (error) {
        console.error('Error fetching API keys:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logUserAction(
            user.id,
            'api_keys_list_failed' as any,
            {
                error: errorMessage,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({error: 'Failed to fetch API keys'}, {status: 500});
    }
}

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const body = await req.json();

    try {
        const {
            name,
            projectId,
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
            expires,
            keyPrefix: customPrefix,
        } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({error: 'API key name is required'}, {status: 400});
        }

        const keyPrefix = customPrefix ? `${customPrefix.replace(/[^a-zA-Z0-9_]/g, '')}_` : 'uai_';
        const secretPart = nanoid(32);
        const rawKey = `${keyPrefix}${secretPart}`;

        const hashedKey = hashApiKey(rawKey)

        const newKeyData = await prisma.apiKey.create({
            data: {
                userId: user.id,
                name,
                hashedKey,
                keyPrefix,
                active: true,
                projectId: projectId || undefined,
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
        await auditHelpers.logApiKeyAction(
            user.id,
            AUDIT_ACTIONS.APIKEY_CREATED,
            newKeyData.id,
            {
                keyName: newKeyData.name,
                keyPrefix: newKeyData.keyPrefix,
                projectId: newKeyData.projectId,
                hasLimits: !!(totalUsageLimit || monthlyUsageLimit || dailyUsageLimit),
                hasWhitelist: !!(ipWhitelist?.length || domainWhitelist?.length),
                modelsCount: models?.length || 0,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({
            ...newKeyData,
            rawKey
        }, {status: 201});

    } catch (error) {
        console.error('Error creating API key:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logApiKeyAction(
            user.id,
            'apikey_creation_failed' as any,
            'unknown',
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