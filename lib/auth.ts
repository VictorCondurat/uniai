import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from './prisma';
import { createHash } from 'crypto';
import type { User, ApiKey, Project } from '@prisma/client';

import { ProjectPermission, roleHasPermission } from './permissions';

export type AuthenticatedUser = User;

interface AuthOptions {
    requiredRole?: 'user' | 'admin';
}

export function hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
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

export async function checkProjectPermission(
    userId: string,
    projectId: string,
    requiredPermission: ProjectPermission
): Promise<boolean> {
    const membership = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId, userId },
        },
        select: { role: true, permissions: true }
    });

    if (!membership) {
        return false;
    }

    const overrides = membership.permissions as Record<string, boolean> | null;
    if (overrides && overrides[requiredPermission] !== undefined) {
        return overrides[requiredPermission];
    }

    return roleHasPermission(membership.role, requiredPermission);
}

export type VerifiedApiKey = ApiKey & {
    user: User | null;
    project: Project | null;
};


export async function verifyApiKey(apiKey: string | null): Promise<VerifiedApiKey | null> {
    if (!apiKey) {
        return null;
    }

    const hashedKey = hashApiKey(apiKey);

    const key = await prisma.apiKey.findUnique({
        where: {
            hashedKey: hashedKey,
            active: true
        },
        include: {
            user: true,
            project: true
        },
    });

    if (!key) {
        return null;
    }

    if (key.expires && key.expires < new Date()) {
        return null;
    }


    return key;
}