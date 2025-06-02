import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { sendVerificationEmail } from '@/lib/email';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = registerSchema.parse(body);

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 400 }
            );
        }

        const hashedPassword = await hash(password, 12);

        const verificationCode = nanoid(6).toUpperCase();
        const verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                verificationCode,
                verificationCodeExpiry,
                verified: false,
            },
        });

        const emailResult = await sendVerificationEmail(email, verificationCode);

        return NextResponse.json(
            {
                message: 'User created successfully. Please check your email for verification code.',
                emailSent: emailResult.success,
            },
            { status: 201 }
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
                { error: `Registration failed: ${error.message}` },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { error: 'Unknown error occurred during registration' },
            { status: 500 }
        );
    }
}