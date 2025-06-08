import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { AUDIT_ACTIONS } from '@/types/audit';

const protectedPaths = [
    '/dashboard',
    '/dashboard/keys',
    '/dashboard/usage',
    '/dashboard/billing',
    '/api/keys',
    '/api/usage',
    '/api/v1',
];

const publicApiPaths = [
    '/api/v1/chat/completions',
    '/api/v1/models',
];

const authPaths = ['/login', '/register', '/verify'];

const auditPaths = [
    '/api/keys',
    '/api/projects',
    '/api/settings',
    '/api/auth',
    '/api/v1/chat/completions',
    '/dashboard/keys',
    '/dashboard/projects',
    '/dashboard/settings',
];

function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();

    return 'unknown';
}

function scheduleAuditLog(callback: () => Promise<void>) {
    Promise.resolve().then(callback).catch(error => {
        console.warn('Audit logging failed:', error);
    });
}

async function logMiddlewareEvent(
    eventType: 'access' | 'auth_redirect' | 'auth_required',
    request: NextRequest,
    session: any,
    additionalData?: Record<string, any>
) {
    try {
        const { auditHelpers } = await import('@/lib/audit');

        const baseData = {
            path: request.nextUrl.pathname,
            method: request.method,
            userAgent: request.headers.get('user-agent') || 'unknown',
            ip: getClientIP(request),
            timestamp: new Date().toISOString(),
            ...additionalData,
        };

        switch (eventType) {
            case 'access':
                if (session?.sub) {
                    await auditHelpers.logRouteAccess(
                        session.sub,
                        request.nextUrl.pathname,
                        baseData,
                        request
                    );
                }
                break;

            case 'auth_redirect':
                await auditHelpers.logAuthEvent(
                    session?.sub || 'anonymous',
                    AUDIT_ACTIONS.USER_AUTH_REDIRECT,
                    false,
                    baseData,
                    request
                );
                break;

            case 'auth_required':
                await auditHelpers.logAuthEvent(
                    'anonymous',
                    AUDIT_ACTIONS.USER_AUTH_REQUIRED,
                    false,
                    baseData,
                    request
                );
                break;
        }
    } catch (error) {
        console.warn('Middleware audit logging failed:', error);
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const startTime = Date.now();
    const requestId = generateRequestId();

    if (publicApiPaths.some(path => pathname.startsWith(path))) {
        const response = NextResponse.next();

        response.headers.set('x-request-id', requestId);
        response.headers.set('x-audit-timestamp', startTime.toString());

        if (auditPaths.some(path => pathname.startsWith(path))) {
            scheduleAuditLog(() =>
                logMiddlewareEvent('access', request, null, {
                    requestId,
                    isPublicApi: true,
                    duration: Date.now() - startTime,
                })
            );
        }

        return response;
    }

    const session = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });

    const isAuthenticated = !!session;

    if (protectedPaths.some(path => pathname === path || pathname.startsWith(path))) {
        if (!isAuthenticated) {
            scheduleAuditLog(() =>
                logMiddlewareEvent('auth_required', request, session, {
                    requestId,
                    attemptedPath: pathname,
                    redirectTo: '/login',
                })
            );

            const url = new URL('/login', request.url);
            url.searchParams.set('callbackUrl', encodeURI(pathname));
            return NextResponse.redirect(url);
        }

        const response = NextResponse.next();
        response.headers.set('x-request-id', requestId);
        response.headers.set('x-audit-timestamp', startTime.toString());
        response.headers.set('x-user-id', session.sub || 'unknown');

        if (auditPaths.some(path => pathname.startsWith(path))) {
            scheduleAuditLog(() =>
                logMiddlewareEvent('access', request, session, {
                    requestId,
                    isProtected: true,
                    duration: Date.now() - startTime,
                })
            );
        }

        return response;
    }

    if (authPaths.includes(pathname) && isAuthenticated) {
        scheduleAuditLog(() =>
            logMiddlewareEvent('auth_redirect', request, session, {
                requestId,
                fromPath: pathname,
                redirectTo: '/dashboard',
            })
        );

        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const response = NextResponse.next();
    response.headers.set('x-request-id', requestId);
    response.headers.set('x-audit-timestamp', startTime.toString());

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};