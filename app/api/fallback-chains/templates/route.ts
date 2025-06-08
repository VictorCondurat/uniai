import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';

const FALLBACK_TEMPLATES = {
    high_availability: {
        name: 'High Availability',
        description: 'Ensures requests always complete by falling back across multiple providers',
        type: 'high_availability',
        triggers: {
            onHttpError: {
                enabled: true,
                codes: [429, 500, 502, 503, 504]
            },
            onProviderError: {
                enabled: true,
                errorTypes: ['rate_limit_error', 'server_error', 'overloaded']
            },
            onLatency: {
                enabled: true,
                thresholdMs: 5000
            }
        },
        steps: [
            {
                modelId: 'claude-3-opus',
                timeout: 10000,
                conditions: {}
            },
            {
                modelId: 'gemini-1.5-pro',
                timeout: 8000,
                conditions: {}
            },
            {
                modelId: 'gpt-3.5-turbo',
                timeout: 5000,
                conditions: {}
            }
        ]
    },
    cost_optimized: {
        name: 'Cost Optimizer',
        description: 'Automatically switches to cheaper models when approaching budget limits',
        type: 'cost_optimized',
        triggers: {
            onCost: {
                enabled: true,
                thresholdUSD: 0.50
            },
            onHttpError: {
                enabled: true,
                codes: [429]
            }
        },
        steps: [
            {
                modelId: 'gpt-3.5-turbo',
                conditions: {
                    skipIf: 'daily_budget_80_percent'
                }
            },
            {
                modelId: 'claude-3-haiku',
                conditions: {}
            }
        ]
    },
    performance: {
        name: 'Speed First',
        description: 'Prioritizes fast responses, falls back to quicker models under load',
        type: 'performance',
        triggers: {
            onLatency: {
                enabled: true,
                thresholdMs: 3000
            }
        },
        steps: [
            {
                modelId: 'claude-3-haiku',
                timeout: 3000
            },
            {
                modelId: 'gpt-3.5-turbo',
                timeout: 5000
            }
        ]
    }
};

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(FALLBACK_TEMPLATES);
}