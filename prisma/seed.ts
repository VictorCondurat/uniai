import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(`Start seeding ...`);

    const openaiProvider = await prisma.modelProviderInfo.upsert({
        where: { providerId: 'openai' },
        update: {},
        create: {
            providerId: 'openai',
            name: 'OpenAI',
            iconUrl: '/assets/icons/openai_logo.svg',
            description: 'Advanced AI models by OpenAI, including the GPT series.',
        },
    });

    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: openaiProvider.id, modelIdentifier: 'gpt-4-turbo' } },
        update: {},
        create: {
            modelIdentifier: 'gpt-4-turbo',
            name: 'GPT-4 Turbo',
            providerInfoId: openaiProvider.id,
            description: 'OpenAI\'s most advanced model with a large context window and up-to-date knowledge.',
            capabilities: ['text-generation', 'chat', 'code-completion', 'vision'],
            contextWindow: '128K tokens',
            pricingInfo: 'Input: $10.00/M tokens, Output: $30.00/M tokens',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 1,
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: openaiProvider.id, modelIdentifier: 'gpt-3.5-turbo' } },
        update: {},
        create: {
            modelIdentifier: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            providerInfoId: openaiProvider.id,
            description: 'A fast and cost-effective model for a wide range of general tasks.',
            capabilities: ['text-generation', 'chat', 'code-completion'],
            contextWindow: '16K tokens',
            pricingInfo: 'Input: $0.50/M tokens, Output: $1.50/M tokens',
            status: 'available',
            inputModalities: ['text'],
            outputModalities: ['text'],
            isFineTuneable: true,
            displayOrder: 2,
        },
    });

    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: openaiProvider.id, modelIdentifier: 'gpt-4o-mini' } },
        update: {},
        create: {
            modelIdentifier: 'gpt-4o-mini',
            name: 'GPT-4o mini',
            providerInfoId: openaiProvider.id,
            description: 'A cost-efficient small language model, strong in reasoning and function calling.',
            capabilities: ['text-generation', 'vision', 'chat', 'function-calling'],
            contextWindow: '128K tokens',
            pricingInfo: 'Input: $0.15/M tokens, Output: $0.60/M tokens',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 3,
            notes: 'Released July 18, 2024.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: openaiProvider.id, modelIdentifier: 'o3-mini' } },
        update: {},
        create: {
            modelIdentifier: 'o3-mini',
            name: 'OpenAI o3-mini',
            providerInfoId: openaiProvider.id,
            description: 'A reasoning-optimized model focused on coding, math, and science tasks.',
            capabilities: ['text-generation', 'reasoning', 'coding', 'chat', 'function-calling'],
            contextWindow: '128K tokens',
            status: 'available',
            inputModalities: ['text'],
            outputModalities: ['text'],
            displayOrder: 4,
            notes: 'Released January 31, 2025. Does not handle vision.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: openaiProvider.id, modelIdentifier: 'o3' } },
        update: {},
        create: {
            modelIdentifier: 'o3',
            name: 'OpenAI o3',
            providerInfoId: openaiProvider.id,
            description: 'Flagship reasoning model with visual understanding and agentic tool use (web search, code execution).',
            capabilities: ['text-generation', 'reasoning', 'vision', 'tool-use', 'agent'],
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 5,
            notes: 'Released April 16, 2025. Agentic tool use.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: openaiProvider.id, modelIdentifier: 'o4-mini' } },
        update: {},
        create: {
            modelIdentifier: 'o4-mini',
            name: 'OpenAI o4-mini',
            providerInfoId: openaiProvider.id,
            description: 'High-throughput model for fast, cost-effective reasoning with visual and tool-use capabilities.',
            capabilities: ['text-generation', 'reasoning', 'vision', 'tool-use', 'agent'],
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 6,
            notes: 'Released April 16, 2025. Agentic tool use.'
        },
    });

    const googleProvider = await prisma.modelProviderInfo.upsert({
        where: { providerId: 'google' },
        update: {},
        create: {
            providerId: 'google',
            name: 'Google AI',
            iconUrl: '/assets/icons/google_ai_logo.svg',
            description: 'Cutting-edge multimodal models from Google.',
        },
    });

    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: googleProvider.id, modelIdentifier: 'gemini-1.5-pro' } },
        update: {},
        create: {
            modelIdentifier: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            providerInfoId: googleProvider.id,
            description: 'Google\'s next-generation highly capable multimodal model with a long context window.',
            capabilities: ['text-generation', 'chat', 'vision', 'audio-processing', 'video-understanding'],
            contextWindow: '1M tokens',
            pricingInfo: 'Varies by modality and usage',
            status: 'available',
            inputModalities: ['text', 'image', 'audio', 'video'],
            outputModalities: ['text'],
            displayOrder: 1,
        },
    });

    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: googleProvider.id, modelIdentifier: 'gemini-2.0-flash' } },
        update: {},
        create: {
            modelIdentifier: 'gemini-2.0-flash',
            name: 'Gemini 2.0 Flash',
            providerInfoId: googleProvider.id,
            description: "Highly efficient 'workhorse' model with low latency for everyday tasks.",
            capabilities: ['text-generation', 'chat', 'vision', 'audio-processing', 'video-understanding'],
            contextWindow: '32K tokens',
            status: 'available',
            inputModalities: ['text', 'image', 'audio', 'video'],
            outputModalities: ['text'],
            displayOrder: 2,
            notes: 'GA in February 2025.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: googleProvider.id, modelIdentifier: 'gemini-2.5-flash' } },
        update: {},
        create: {
            modelIdentifier: 'gemini-2.5-flash',
            name: 'Gemini 2.5 Flash',
            providerInfoId: googleProvider.id,
            description: "Upgraded model with strong coding and reasoning abilities and 'Deep Think' mode.",
            capabilities: ['text-generation', 'chat', 'coding', 'reasoning'],
            status: 'preview',
            inputModalities: ['text', 'image', 'audio', 'video'],
            outputModalities: ['text'],
            displayOrder: 3,
            notes: 'Public preview May 2025.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: googleProvider.id, modelIdentifier: 'imagen-4' } },
        update: {},
        create: {
            modelIdentifier: 'imagen-4',
            name: 'Imagen 4',
            providerInfoId: googleProvider.id,
            description: 'Highest-quality text-to-image model with outstanding text fidelity and multilingual support.',
            capabilities: ['image-generation'],
            contextWindow: 'N/A',
            status: 'preview',
            inputModalities: ['text'],
            outputModalities: ['image'],
            displayOrder: 4,
            notes: 'Public preview May 20, 2025.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: googleProvider.id, modelIdentifier: 'veo-3' } },
        update: {},
        create: {
            modelIdentifier: 'veo-3',
            name: 'Veo 3',
            providerInfoId: googleProvider.id,
            description: 'State-of-the-art text-to-video model with synchronized audio generation.',
            capabilities: ['video-generation', 'audio-generation'],
            contextWindow: 'N/A',
            status: 'preview',
            inputModalities: ['text', 'image'],
            outputModalities: ['video', 'audio'],
            displayOrder: 5,
            notes: 'Public preview May 2025.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: googleProvider.id, modelIdentifier: 'lyria-2' } },
        update: {},
        create: {
            modelIdentifier: 'lyria-2',
            name: 'Lyria 2',
            providerInfoId: googleProvider.id,
            description: 'AI music generation model for high-fidelity, professional-grade audio tracks.',
            capabilities: ['audio-generation', 'music-generation'],
            contextWindow: 'N/A',
            status: 'available',
            inputModalities: ['text'],
            outputModalities: ['audio'],
            displayOrder: 6,
            notes: 'GA in May 2025.'
        },
    });

    const anthropicProvider = await prisma.modelProviderInfo.upsert({
        where: { providerId: 'anthropic' },
        update: {},
        create: {
            providerId: 'anthropic',
            name: 'Anthropic',
            iconUrl: '/assets/icons/anthropic_logo.svg',
            description: 'AI models focused on safety and helpfulness.',
        },
    });

    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: anthropicProvider.id, modelIdentifier: 'claude-3-opus' } },
        update: {},
        create: {
            modelIdentifier: 'claude-3-opus',
            name: 'Claude 3 Opus',
            providerInfoId: anthropicProvider.id,
            description: 'Anthropic\'s most powerful model for highly complex tasks and top-level performance.',
            capabilities: ['text-generation', 'chat', 'vision', 'reasoning'],
            contextWindow: '200K tokens',
            pricingInfo: 'Input: $15.00/M tokens, Output: $75.00/M tokens',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 1,
        },
    });

    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: anthropicProvider.id, modelIdentifier: 'claude-3.5-sonnet' } },
        update: {},
        create: {
            modelIdentifier: 'claude-3.5-sonnet',
            name: 'Claude 3.5 Sonnet',
            providerInfoId: anthropicProvider.id,
            description: 'High-performance model with industry-leading coding capabilities and experimental computer use.',
            capabilities: ['text-generation', 'chat', 'coding', 'vision', 'agent'],
            contextWindow: '100K tokens',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 2,
            notes: 'Released October 2024.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: anthropicProvider.id, modelIdentifier: 'claude-3.5-haiku' } },
        update: {},
        create: {
            modelIdentifier: 'claude-3.5-haiku',
            name: 'Claude 3.5 Haiku',
            providerInfoId: anthropicProvider.id,
            description: 'Fast and small model matching the performance of the previous Claude 3 Opus.',
            capabilities: ['text-generation', 'chat', 'vision'],
            contextWindow: '100K tokens',
            pricingInfo: 'Input: $0.80/M tokens, Output: $4.00/M tokens',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 3,
            notes: 'Released October 2024.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: anthropicProvider.id, modelIdentifier: 'claude-3.7-sonnet' } },
        update: {},
        create: {
            modelIdentifier: 'claude-3.7-sonnet',
            name: 'Claude 3.7 Sonnet',
            providerInfoId: anthropicProvider.id,
            description: "First hybrid reasoning LLM with visible step-by-step thinking for complex tasks.",
            capabilities: ['text-generation', 'chat', 'coding', 'vision', 'reasoning'],
            contextWindow: '64K tokens (deliberation)',
            pricingInfo: 'Input: $3.00/M tokens, Output: $15.00/M tokens',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 4,
            notes: 'Released February 24, 2025. Hybrid reasoning mode.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: anthropicProvider.id, modelIdentifier: 'claude-4-opus' } },
        update: {},
        create: {
            modelIdentifier: 'claude-4-opus',
            name: 'Claude 4 Opus',
            providerInfoId: anthropicProvider.id,
            description: 'Next-gen flagship model, state-of-the-art for coding and long-running agent workflows.',
            capabilities: ['text-generation', 'chat', 'coding', 'vision', 'reasoning', 'tool-use', 'agent'],
            contextWindow: '200K tokens',
            pricingInfo: 'Input: $15.00/M tokens, Output: $75.00/M tokens',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 5,
            notes: 'Released May 22, 2025. Built-in tool use.'
        },
    });
    await prisma.modelDescription.upsert({
        where: { providerInfoId_modelIdentifier: { providerInfoId: anthropicProvider.id, modelIdentifier: 'claude-4-sonnet' } },
        update: {},
        create: {
            modelIdentifier: 'claude-4-sonnet',
            name: 'Claude 4 Sonnet',
            providerInfoId: anthropicProvider.id,
            description: 'Highly capable model with superior coding and reasoning, and built-in tool use.',
            capabilities: ['text-generation', 'chat', 'coding', 'vision', 'reasoning', 'tool-use', 'agent'],
            contextWindow: '200K tokens',
            pricingInfo: 'Input: $3.00/M tokens, Output: $15.00/M tokens',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            displayOrder: 6,
            notes: 'Released May 22, 2025. Built-in tool use.'
        },
    });

    console.log(`Seeding finished.`);
}

main()
    .catch(async (e) => {
        console.error("Error during seeding:", e);
        await prisma.$disconnect();
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });