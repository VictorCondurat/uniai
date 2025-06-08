import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';

const simulationSchema = z.object({
    apiKey: z.string().min(1, "API key is required."),
    model: z.string().min(1, "A model must be selected."),
    count: z.number().min(1, "Call count must be at least 1.").max(1000, "Cannot exceed 1000 calls per simulation."),
    prompt: z.string().min(10, "Prompt must be at least 10 characters long."),
});

export async function POST(req: NextRequest) {

    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized. You must be logged in to run simulations.' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = simulationSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid simulation parameters.', details: validation.error.flatten() }, { status: 400 });
        }

        const { apiKey, model, count, prompt } = validation.data;

        const completionsUrl = new URL('/api/v1/chat/completions', req.url).toString();

        let successCount = 0;
        const promises = [];

        for (let i = 0; i < count; i++) {
            const promise = fetch(completionsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: `${prompt} (Simulated Request #${i + 1})` }],
                }),
            })
                .then(response => {
                    if (response.ok) {
                        successCount++;
                    } else {
                        console.error(`Simulation call ${i+1} to ${model} failed with status: ${response.status}`);
                    }
                })
                .catch(error => {
                    console.error(`Simulation call ${i+1} to ${model} had a network error:`, error.message);
                });

            promises.push(promise);
        }

        await Promise.all(promises);

        return NextResponse.json({
            message: `Simulation complete. Triggered ${successCount} out of ${count} successful calls.`,
            simulated_successes: successCount,
            total_requests: count,
        });

    } catch (error: any) {
        console.error('[API Simulation Error]', error);
        return NextResponse.json({ error: 'An unexpected server error occurred during simulation.', details: error.message }, { status: 500 });
    }
}