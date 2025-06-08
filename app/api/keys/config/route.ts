import { NextRequest, NextResponse } from 'next/server';
import { ALL_MODELS_CONFIG} from "@/lib/modelsConfig";
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';
const API_KEY_PERMISSION_STRUCTURE = [
    {
        id: 'inference',
        name: 'LLM Inference',
        subPermissions: [
            { id: 'llm:chat', name: 'Allow chat completion calls (e.g., /v1/chat/completions)' },
            { id: 'llm:completions', name: 'Allow legacy completion calls (e.g., /v1/completions)' },
            { id: 'llm:embeddings', name: 'Allow embedding generation calls (e.g., /v1/embeddings)' },
            { id: 'llm:images', name: 'Allow image generation calls (e.g., /v1/images/generations)' },
        ],
    },
    {
        id: 'caching',
        name: 'Caching Control',
        subPermissions: [
            { id: 'cache:read', name: 'Allow reading from the cache to return saved responses' },
            { id: 'cache:write', name: 'Allow writing new responses to the cache' },
            { id: 'cache:bypass', name: 'Allow requests to bypass the cache (force a new generation)' },
        ]
    },
    {
        id: 'features',
        name: 'Advanced Features',
        subPermissions: [
            { id: 'fallback:trigger', name: 'Allow this key to trigger fallback chains' },
            { id: 'usage:read', name: 'Allow this key to read its own usage data (scoped to this key only)' },
        ]
    },
];


export async function GET(req: NextRequest) {
    const startTime = Date.now();
    try {

        const models = ALL_MODELS_CONFIG.map(model => ({
            id: model.modelIdentifier,
            name: `${model.name} (${model.providerId})`,
            provider: model.providerId,
            providerId: model.providerId,
        }));
        await auditHelpers.logUserAction(
            'anonymous',
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            {
                action: 'api_key_config_viewed',
                modelsCount: models.length,
                permissionsCount: API_KEY_PERMISSION_STRUCTURE.length,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({
            models,
            permissions: API_KEY_PERMISSION_STRUCTURE,
        });
    } catch (error) {
        console.error('Error fetching API key configuration:', error);
        return NextResponse.json(
            { error: 'Failed to fetch configuration' },
            { status: 500 }
        );
    }
}