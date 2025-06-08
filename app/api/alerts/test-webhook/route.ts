import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const authResult = await authMiddleware(req);

    if (authResult instanceof NextResponse) {
        return authResult;
    }

    try {
        const body = await req.json();
        const { webhookUrl } = body;

        if (!webhookUrl || typeof webhookUrl !== 'string') {
            return NextResponse.json(
                { error: 'Webhook URL is required' },
                { status: 400 }
            );
        }

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    test: true,
                    message: 'This is a test webhook from UniAI',
                    timestamp: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Webhook returned status ${response.status}`
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json({
                success: true,
                status: response.status,
                message: 'Webhook test successful'
            });
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to reach webhook URL'
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error testing webhook:', error);
        return NextResponse.json(
            { error: 'Failed to test webhook' },
            { status: 500 }
        );
    }
}