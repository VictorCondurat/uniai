import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await prisma.project.update({
            where: {
                id: params.id,
                userId: user.id,
            },
            data: {
                spendingLimit: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to remove spending limit:', error);
        return NextResponse.json({ error: 'Failed to remove spending limit' }, { status: 500 });
    }
}