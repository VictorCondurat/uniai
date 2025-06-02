import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/email';

const verifySchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, code } = verifySchema.parse(body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        if (user.verified) {
            return NextResponse.json(
                { error: 'Email already verified' },
                { status: 400 }
            );
        }
        const storedCode = user.verificationCode ? String(user.verificationCode) : null;

        if (
            !storedCode ||
            storedCode !== code ||
            !user.verificationCodeExpiry ||
            user.verificationCodeExpiry < new Date()
        ) {
            return NextResponse.json(
                { error: 'Invalid or expired verification code' },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verified: true,
                verificationCode: null,
                verificationCodeExpiry: null,
            },
        });

        await sendWelcomeEmail(email, user.name || undefined);

        return NextResponse.json(
            { message: 'Email verified successfully' },
            { status: 200 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid input data', details: error.errors },
                { status: 400 }
            );
        }
        if (error instanceof Error) {
            return NextResponse.json(
                { error: `Verification failed: ${error.message}` },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { error: 'Unknown error occurred during verification' },
            { status: 500 }
        );
    }
}