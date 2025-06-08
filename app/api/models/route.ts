import { NextRequest, NextResponse } from 'next/server';
import { ALL_MODELS_CONFIG, ALL_PROVIDERS_CONFIG } from '@/lib/modelsConfig';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';
interface ModelPerformanceAPI {
    speed: number;
    cost: number;
    quality: number;
    label: string;
}

interface ModelAPI {
    id: string;
    name: string;
    provider: string;
    description: string;
    capabilities: string[];
    contextWindow?: string | null;
    pricing?: string | null;
    status: 'available' | 'beta' | 'deprecated' | 'restricted' | 'preview';
    performance: ModelPerformanceAPI;
}

interface ModelProviderAPI {
    id: string;
    name: string;
    icon?: string | null;
    models: ModelAPI[];
}

export async function GET(request: NextRequest) {
    try {
        const startTime = Date.now();
        const formattedData: ModelProviderAPI[] = ALL_PROVIDERS_CONFIG
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(providerConfig => {
                const modelsForProvider = ALL_MODELS_CONFIG
                    .filter(modelConfig => modelConfig.providerId === providerConfig.providerId)
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map(modelConfig => {
                        return {
                            id: modelConfig.modelIdentifier,
                            name: modelConfig.name,
                            provider: providerConfig.providerId,
                            description: modelConfig.description,
                            capabilities: modelConfig.capabilities,
                            contextWindow: modelConfig.contextWindow,
                            pricing: `Input: $${modelConfig.inputCostPerMillionTokens.toFixed(2)}/M, Output: $${modelConfig.outputCostPerMillionTokens.toFixed(2)}/M`,
                            status: modelConfig.status as ModelAPI['status'],
                            performance: modelConfig.performance,
                        };
                    });
                return {
                    id: providerConfig.providerId,
                    name: providerConfig.name,
                    icon: providerConfig.iconUrl,
                    models: modelsForProvider,
                };
            });

        const totalModels = formattedData.reduce((sum, provider) => sum + provider.models.length, 0);
        await auditHelpers.logUserAction(
            'anonymous',
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            {
                action: 'models_list_viewed',
                providersCount: formattedData.length,
                totalModels,
                duration: Date.now() - startTime,
            },
            request
        );
        return NextResponse.json(formattedData);

    } catch (error) {
        console.error("Error constructing models response from local config:", error);
        return NextResponse.json({ error: "An error occurred while fetching available models. Please try again later." }, { status: 500 });
    }
}