import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, AuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const costAlertCreateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(['daily', 'weekly', 'monthly', 'threshold']),
    threshold: z.number().positive("Threshold must be a positive number"),
    webhookUrl: z.string().url().optional().or(z.literal('')),
    emailAlert: z.boolean().default(true),
});


export async function GET(req: NextRequest) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as AuthenticatedUser;

    try {
        const costAlerts = await prisma.costAlert.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(costAlerts);
    } catch (error) {
        console.error('Error fetching cost alerts:', error);
        return NextResponse.json({ error: 'Failed to fetch cost alerts' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as AuthenticatedUser;

    try {
        const body = await req.json();
        const validation = costAlertCreateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
        }
        const { name, type, threshold, webhookUrl, emailAlert } = validation.data;

        const costAlert = await prisma.costAlert.create({
            data: {
                userId: user.id,
                name,
                type,
                threshold,
                webhookUrl: webhookUrl || null,
                emailAlert,
                active: true,
                currentSpend: 0,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'cost_alert_created',
                resource: 'cost_alert',
                resourceId: costAlert.id,
                details: { name, type, threshold },
            },
        });

        return NextResponse.json(costAlert, { status: 201 });
    } catch (error) {
        console.error('Error creating cost alert:', error);

        return NextResponse.json({ error: 'Failed to create cost alert' }, { status: 500 });
    }
}