import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuditAction, AuditResource, AUDIT_ACTIONS, AUDIT_RESOURCES } from '@/types/audit';
import { getGeoLocationWithToken } from '@/lib/geolocation-ipinfo';
interface GeoLocation {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    isp?: string;
    lat?: number;
    lon?: number;
    postal?: string;
}


interface AuditLogData {
    userId: string;
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string;
    details?: Record<string, any>;
    request?: NextRequest;
    ipAddress?: string;
    userAgent?: string;
    geoLocation?: GeoLocation;
    requestType?: string;
}

const geoCache = new Map<string, { data: GeoLocation; expires: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();

    return 'unknown';
}

function isPrivateIP(ip: string): boolean {
    if (!ip || ip === 'unknown') return true;

    const privateRanges = [
        /^127\./, // Loopback
        /^192\.168\./, // Private Class C
        /^10\./, // Private Class A
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
        /^::1$/, // IPv6 loopback
        /^fc00:/, // IPv6 private
        /^169\.254\./, // Link-local
    ];

    return privateRanges.some(range => range.test(ip));
}

function getLocalGeoData(): GeoLocation {
    return {
        country: 'Local Network',
        region: 'Private',
        city: 'Private',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isp: 'Local Network'
    };
}

function getUnknownGeoData(): GeoLocation {
    return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'Unknown',
        isp: 'Unknown'
    };
}

async function fetchGeoLocationFromAPI(ip: string): Promise<GeoLocation> {
    const token = process.env.IPINFO_API_TOKEN;
    return await getGeoLocationWithToken(ip, token);
}

export async function getGeoLocation(ip: string): Promise<GeoLocation> {
    try {
        if (isPrivateIP(ip)) {
            return getLocalGeoData();
        }

        const cacheKey = ip;
        const cached = geoCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }

        const location = await fetchGeoLocationFromAPI(ip);

        geoCache.set(cacheKey, {
            data: location,
            expires: Date.now() + CACHE_DURATION
        });

        if (Math.random() < 0.01) { // 1% chance
            cleanupCache();
        }

        return location;
    } catch (error) {
        console.warn('Geolocation lookup failed:', error);
        return getUnknownGeoData();
    }
}

function cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of geoCache.entries()) {
        if (value.expires <= now) {
            geoCache.delete(key);
        }
    }
}

export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export async function createAuditLog({
                                         userId,
                                         action,
                                         resource,
                                         resourceId,
                                         details = {},
                                         request,
                                         ipAddress,
                                         userAgent,
                                         geoLocation,
                                         requestType
                                     }: AuditLogData): Promise<void> {
    try {
        let finalIP = ipAddress;
        let finalUserAgent = userAgent;
        let finalGeoLocation = geoLocation;
        let finalRequestType = requestType;
        const requestId = generateRequestId();

        if (request) {
            finalIP = finalIP || getClientIP(request);
            finalUserAgent = finalUserAgent || request.headers.get('user-agent') || 'unknown';
            finalRequestType = finalRequestType || request.method;

            if (!finalGeoLocation && finalIP) {
                finalGeoLocation = await getGeoLocation(finalIP);
            }
        }

        await prisma.auditLog.create({
            data: {
                userId,
                action,
                resource,
                resourceId,
                details: {
                    ...details,
                    requestId,
                },
                ipAddress: finalIP,
                userAgent: finalUserAgent,
                geoLocation: finalGeoLocation as any,
                requestId,
                requestType: finalRequestType,
                timestamp: new Date(),
            },
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
}

export const auditHelpers = {
    async logCompletionSuccess(
        userId: string,
        apiKeyId: string,
        details: {
            model: string;
            provider: string;
            tokensInput: number;
            tokensOutput: number;
            cost: number;
            latency: number;
            requestId: string;
        },
        request?: NextRequest
    ): Promise<void> {
        await createAuditLog({
            userId,
            action: AUDIT_ACTIONS.COMPLETION_SUCCESS,
            resource: AUDIT_RESOURCES.COMPLETION,
            resourceId: details.requestId,
            details: {
                ...details,
                apiKeyId,
            },
            request,
        });
    },

    async logCompletionFailure(
        userId: string,
        apiKeyId: string,
        details: {
            model: string;
            provider: string;
            error: string;
            requestId: string;
            reason?: 'rate_limit' | 'quota_exceeded' | 'invalid_request' | 'server_error';
        },
        request?: NextRequest
    ): Promise<void> {
        const action = details.reason === 'rate_limit'
            ? AUDIT_ACTIONS.COMPLETION_RATE_LIMITED
            : details.reason === 'quota_exceeded'
                ? AUDIT_ACTIONS.COMPLETION_QUOTA_EXCEEDED
                : AUDIT_ACTIONS.COMPLETION_FAILED;

        await createAuditLog({
            userId,
            action,
            resource: AUDIT_RESOURCES.COMPLETION,
            resourceId: details.requestId,
            details: {
                ...details,
                apiKeyId,
            },
            request,
        });
    },

    async logApiRequestBlocked(
        userId: string | null,
        reason: 'invalid_key' | 'blocked_ip' | 'blocked_domain' | 'unauthorized',
        details: {
            apiKeyId?: string;
            endpoint: string;
            requestId: string;
        },
        request?: NextRequest
    ): Promise<void> {
        const actionMap = {
            invalid_key: AUDIT_ACTIONS.API_REQUEST_INVALID_KEY,
            blocked_ip: AUDIT_ACTIONS.API_REQUEST_BLOCKED_IP,
            blocked_domain: AUDIT_ACTIONS.API_REQUEST_BLOCKED_DOMAIN,
            unauthorized: AUDIT_ACTIONS.API_REQUEST_UNAUTHORIZED,
        };

        await createAuditLog({
            userId: userId || 'anonymous',
            action: actionMap[reason],
            resource: AUDIT_RESOURCES.API_REQUEST,
            resourceId: details.requestId,
            details,
            request,
        });
    },

    async logUserAction(userId: string, action: AuditAction, details?: any, request?: NextRequest): Promise<void> {
        await createAuditLog({
            userId,
            action,
            resource: AUDIT_RESOURCES.USER,
            resourceId: userId,
            details,
            request,
        });
    },

    async logApiKeyAction(userId: string, action: AuditAction, apiKeyId: string, details?: any, request?: NextRequest): Promise<void> {
        await createAuditLog({
            userId,
            action,
            resource: AUDIT_RESOURCES.APIKEY,
            resourceId: apiKeyId,
            details,
            request,
        });
    },

    async logProjectAction(userId: string, action: AuditAction, projectId: string, details?: any, request?: NextRequest): Promise<void> {
        await createAuditLog({
            userId,
            action,
            resource: AUDIT_RESOURCES.PROJECT,
            resourceId: projectId,
            details,
            request,
        });
    },

    async logInvoiceAction(userId: string, action: AuditAction, invoiceId: string, details?: any, request?: NextRequest): Promise<void> {
        await createAuditLog({
            userId,
            action,
            resource: AUDIT_RESOURCES.INVOICE,
            resourceId: invoiceId,
            details,
            request,
        });
    },

    async logProjectMemberAction(userId: string, action: AuditAction, memberId: string, details?: any, request?: NextRequest): Promise<void> {
        await createAuditLog({
            userId,
            action,
            resource: AUDIT_RESOURCES.PROJECT_MEMBER,
            resourceId: memberId,
            details,
            request,
        });
    },

    async logProjectInvitationAction(userId: string, action: AuditAction, invitationId: string, details?: any, request?: NextRequest): Promise<void> {
        await createAuditLog({
            userId,
            action,
            resource: AUDIT_RESOURCES.PROJECT_INVITATION,
            resourceId: invitationId,
            details,
            request,
        });
    },

    async logBatchActions(actions: Omit<AuditLogData, 'request'>[], request?: NextRequest): Promise<void> {
        const promises = actions.map(action => createAuditLog({ ...action, request }));
        await Promise.allSettled(promises);
    },

    async logRouteAccess(
        userId: string,
        path: string,
        details: Record<string, any>,
        request?: NextRequest
    ): Promise<void> {
        await createAuditLog({
            userId,
            action: AUDIT_ACTIONS.ROUTE_ACCESSED,
            resource: AUDIT_RESOURCES.USER,
            resourceId: details.requestId,
            details: {
                path,
                method: details.method,
                userAgent: details.userAgent,
                duration: details.duration,
                isProtected: details.isProtected,
                isPublicApi: details.isPublicApi,
                timestamp: details.timestamp,
            },
            request,
        });
    },

    async logAuthEvent(
        userId: string,
        action: AuditAction,
        success: boolean,
        details: Record<string, any>,
        request?: NextRequest
    ): Promise<void> {
        await createAuditLog({
            userId,
            action,
            resource: AUDIT_RESOURCES.USER,
            resourceId: userId === 'anonymous' ? undefined : userId,
            details: {
                ...details,
                success,
                path: details.path,
                method: details.method,
                userAgent: details.userAgent,
            },
            request,
        });
    },

    async logMiddlewareBatch(events: Array<{
        userId: string;
        action: AuditAction;
        resource: AuditResource;
        details: Record<string, any>;
    }>): Promise<void> {
        const promises = events.map(event =>
            createAuditLog({
                userId: event.userId,
                action: event.action,
                resource: event.resource,
                details: event.details,
            }).catch(error => {
                console.warn('Batch audit log failed:', error);
            })
        );

        await Promise.allSettled(promises);
    },
};

export const auditUtils = {
    clearGeoCache(): void {
        geoCache.clear();
    },

    getCacheStats(): { size: number; entries: Array<{ ip: string; expires: Date }> } {
        const entries = Array.from(geoCache.entries()).map(([ip, data]) => ({
            ip,
            expires: new Date(data.expires)
        }));

        return {
            size: geoCache.size,
            entries
        };
    },

    async warmupCache(ips: string[]): Promise<void> {
        const promises = ips.map(ip => getGeoLocation(ip));
        await Promise.allSettled(promises);
    },
};
class AuditBatch {
    private batch: AuditLogData[] = [];
    private timer: NodeJS.Timeout | null = null;

    add(data: AuditLogData) {
        this.batch.push(data);

        if (this.batch.length >= 10 || !this.timer) {
            this.flush();
        }

        this.timer = setTimeout(() => this.flush(), 5000);
    }

    private async flush() {
        if (this.batch.length === 0) return;

        const toProcess = [...this.batch];
        this.batch = [];

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        try {
            await Promise.allSettled(
                toProcess.map(data => createAuditLog(data))
            );
        } catch (error) {
            console.error('Batch audit failed:', error);
        }
    }
}

export const auditBatch = new AuditBatch();