import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from './prisma';
import type { User } from '@prisma/client'
export type AuthenticatedUser = User
interface AuthOptions {
    requiredRole?: 'user' | 'admin';
}

export async function authMiddleware(
    req: NextRequest,
    options: AuthOptions = {}
) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    const userId = token.userId as string;

    if (!userId) {
        return NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
        );
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.verified) {
        return NextResponse.json(
            { error: 'User not found or not verified' },
            { status: 401 }
        );
    }

    if (options.requiredRole && user.role !== options.requiredRole && user.role !== 'admin') {
        return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
        );
    }

    return user;
}

export async function verifyApiKey(apiKey: string | null) {
    if (!apiKey) {
        return null;
    }

    const key = await prisma.apiKey.findUnique({
        where: { key: apiKey, active: true },
        include: { user: true },
    });

    if (!key || !key?.user?.verified) {
        return null;
    }

    await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsed: new Date() },
    });

    return { key, user: key.user };
}