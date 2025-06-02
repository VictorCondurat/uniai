import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, AuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const alertCreateSchema = z.object({
    type: z.enum(['budget', 'usage', 'anomaly']),
    threshold: z.number().positive(),
    message: z.string().optional(),
});

export async function GET(req: NextRequest) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as AuthenticatedUser;

    try {
        const alerts = await prisma.alert.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as AuthenticatedUser;

    try {
        const body = await req.json();
        const validation = alertCreateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
        }

        const { type, threshold, message } = validation.data;

        const alert = await prisma.alert.create({
            data: {
                userId: user.id,
                type,
                threshold,
                message: message || `${type.charAt(0).toUpperCase() + type.slice(1)} alert threshold: ${threshold}`,
                triggered: false,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'alert_created',
                resource: 'alert',
                resourceId: alert.id,
                details: { type, threshold },
            },
        });

        return NextResponse.json(alert, { status: 201 });
    } catch (error) {
        console.error('Error creating alert:', error);
        return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }
}