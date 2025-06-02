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
        const notifications = await request.json();

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await prisma.systemConfig.upsert({
            where: {
                key: `notifications_${user.id}`,
            },
            update: {
                value: notifications,
            },
            create: {
                key: `notifications_${user.id}`,
                value: notifications,
            },
        });

        if (notifications.webhookUrl) {
            await prisma.costAlert.updateMany({
                where: { userId: user.id },
                data: {
                    webhookUrl: notifications.webhookUrl,
                    emailAlert: notifications.emailAlerts,
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update notifications:', error);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }
}