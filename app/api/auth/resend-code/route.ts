import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { sendVerificationEmail } from '@/lib/email';

const resendSchema = z.object({
    email: z.string().email(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = resendSchema.parse(body);

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

        const verificationCode = nanoid(6).toUpperCase();
        const verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode,
                verificationCodeExpiry,
            },
        });

        const emailResult = await sendVerificationEmail(email, verificationCode);

        if (!emailResult.success) {
            return NextResponse.json(
                { error: 'Failed to send verification email' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'Verification code sent successfully' },
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
                { error: `Failed to resend code: ${error.message}` },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { error: 'Unknown error occurred' },
            { status: 500 }
        );
    }
}