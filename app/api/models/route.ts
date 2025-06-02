import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ModelAPI {
    id: string;
    name: string;
    provider: string;
    description: string;
    capabilities: string[];
    contextWindow?: string | null;
    pricing?: string | null;
    status: 'available' | 'beta' | 'deprecated' | 'restricted';
}

interface ModelProviderAPI {
    id: string;
    name: string;
    icon?: string | null;
    models: ModelAPI[];
}

export async function GET(request: NextRequest) {
    try {
        const providersWithModels = await prisma.modelProviderInfo.findMany({
            include: {
                models: {
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });

        if (!providersWithModels || providersWithModels.length === 0) {
            return NextResponse.json([]);
        }

        const formattedData: ModelProviderAPI[] = providersWithModels.map(p => ({
            id: p.providerId,
            name: p.name,
            icon: p.iconUrl,
            models: p.models.map(m => ({
                id: m.modelIdentifier,
                name: m.name,
                provider: p.providerId,
                description: m.description,
                capabilities: m.capabilities,
                contextWindow: m.contextWindow,
                pricing: m.pricingInfo,
                status: m.status as ModelAPI['status'],
            })),
        }));

        return NextResponse.json(formattedData);
    } catch (error) {
        return NextResponse.json({ error: "An error occurred while fetching available models. Please try again later." }, { status: 500 });
    }
}