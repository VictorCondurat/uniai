import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { getKeyUsageStatus, checkKeyAuthorization } from '@/lib/keyUsage';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';

export async function GET(
    req: NextRequest,
    { params }: { params: { keyId: string } }
) {
    const startTime = Date.now();

    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const { keyId } = params;
    if (!keyId) {
        return NextResponse.json({ error: 'API Key ID is required' }, { status: 400 });
    }

    try {
        const isAuthorized = await checkKeyAuthorization(keyId, user.id);
        if (!isAuthorized) {
            return NextResponse.json({
                error: 'Forbidden: You do not have permission to view this key\'s usage.'
            }, { status: 403 });
        }

        const usageStatus = await getKeyUsageStatus(keyId);

        if (!usageStatus) {
            return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
        }

        await auditHelpers.logApiKeyAction(
            user.id,
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            keyId,
            {
                action: 'api_key_usage_viewed',
                dailyUsage: usageStatus.usage.daily,
                monthlyUsage: usageStatus.usage.monthly,
                totalUsage: usageStatus.usage.total,
                dailyLimit: usageStatus.limits.daily,
                monthlyLimit: usageStatus.limits.monthly,
                totalLimit: usageStatus.limits.total,
                keyStatus: usageStatus.status,
                hasLimits: !!(usageStatus.limits.daily || usageStatus.limits.monthly || usageStatus.limits.total),
                limitsExceeded: usageStatus.limitExceeded.any,
                dailyLimitExceeded: usageStatus.limitExceeded.daily,
                monthlyLimitExceeded: usageStatus.limitExceeded.monthly,
                totalLimitExceeded: usageStatus.limitExceeded.total,
                duration: Date.now() - startTime,
            },
            req
        );

        return NextResponse.json(usageStatus);

    } catch (error) {
        console.error(`Error fetching usage for key ${keyId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logApiKeyAction(
            user.id,
            'api_key_usage_fetch_failed' as any,
            keyId,
            {
                error: errorMessage,
                duration: Date.now() - startTime,
            },
            req
        );

        return NextResponse.json({ error: 'Failed to fetch API key usage' }, { status: 500 });
    }
}