import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (publicApiPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    const session = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });

    const isAuthenticated = !!session;

    if (
        protectedPaths.some(path => pathname === path || pathname.startsWith(path)) &&
        !isAuthenticated
    ) {
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', encodeURI(pathname));
        return NextResponse.redirect(url);
    }

    if (authPaths.includes(pathname) && isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};