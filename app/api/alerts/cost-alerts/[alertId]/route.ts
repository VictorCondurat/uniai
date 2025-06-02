import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, AuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const costAlertUpdateSchema = z.object({
    active: z.boolean(),
});

export async function PATCH(
    req: NextRequest,
    { params }: { params: { alertId: string } }
) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as AuthenticatedUser;
    const { alertId } = params;

    if (!alertId) {
        return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const validation = costAlertUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
        }
        const { active } = validation.data;

        const existingAlert = await prisma.costAlert.findFirst({
            where: { id: alertId, userId: user.id },
        });

        if (!existingAlert) {
            return NextResponse.json({ error: 'Cost alert not found or you do not have permission' }, { status: 404 });
        }

        const updatedAlert = await prisma.costAlert.update({
            where: { id: alertId },
            data: { active },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: active ? 'cost_alert_activated' : 'cost_alert_deactivated',
                resource: 'cost_alert',
                resourceId: alertId,
                details: { name: updatedAlert.name }
            },
        });

        return NextResponse.json(updatedAlert);
    } catch (error) {
        console.error('Error updating cost alert:', error);
        return NextResponse.json({ error: 'Failed to update cost alert' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { alertId: string } }
) {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as AuthenticatedUser;
    const { alertId } = params;

    if (!alertId) {
        return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    try {
        const alertToDelete = await prisma.costAlert.findFirst({
            where: { id: alertId, userId: user.id },
        });

        if (!alertToDelete) {
            return NextResponse.json({ error: 'Cost alert not found or you do not have permission' }, { status: 404 });
        }

        await prisma.costAlert.delete({
            where: { id: alertId },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'cost_alert_deleted',
                resource: 'cost_alert',
                resourceId: alertId,
                details: { name: alertToDelete.name, type: alertToDelete.type }
            },
        });

        return NextResponse.json({ success: true, message: "Cost alert deleted successfully." });
    } catch (error) {
        console.error('Error deleting cost alert:', error);
        return NextResponse.json({ error: 'Failed to delete cost alert' }, { status: 500 });
    }
}