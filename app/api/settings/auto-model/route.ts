import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { enabled } = await request.json();

        const updatedUser = await prisma.user.update({
            where: { email: session.user.email },
            data: { autoModelEnabled: enabled },
        });

        await prisma.auditLog.create({
            data: {
                userId: updatedUser.id,
                action: 'auto_model_toggle',
                resource: 'settings',
                details: { enabled },
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
                userAgent: request.headers.get('user-agent'),
            },
        });

        return NextResponse.json({ success: true, autoModelEnabled: updatedUser.autoModelEnabled });
    } catch (error) {
        console.error('Failed to update auto model setting:', error);
        return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }
}