import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, AuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        const alertToDelete = await prisma.alert.findFirst({
            where: { id: alertId, userId: user.id },
        });

        if (!alertToDelete) {
            return NextResponse.json({ error: 'Alert not found or you do not have permission' }, { status: 404 });
        }

        await prisma.alert.delete({
            where: { id: alertId },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'alert_deleted',
                resource: 'alert',
                resourceId: alertId,
                details: { type: alertToDelete.type, threshold: alertToDelete.threshold }
            },
        });

        return NextResponse.json({ success: true, message: "Alert deleted successfully." });
    } catch (error) {
        console.error('Error deleting alert:', error);
        return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
    }
}