import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(`Start seeding ...`);

    const openaiProvider = await prisma.modelProviderInfo.upsert({
        where: {providerId: 'openai'},
        update: {},
        create: {
            providerId: 'openai',
            name: 'OpenAI',
            iconUrl: '/assets/icons/openai_logo.svg',
            description: 'Advanced AI models by OpenAI, including the GPT series.',
        },
    });

    await prisma.modelDescription.upsert({
        where: {providerInfoId_modelIdentifier: {providerInfoId: openaiProvider.id, modelIdentifier: 'gpt-4-turbo'}},
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
            isFineTuneable: false,
            order: 1,
        },
    });

    await prisma.modelDescription.upsert({
        where: {providerInfoId_modelIdentifier: {providerInfoId: openaiProvider.id, modelIdentifier: 'gpt-3.5-turbo'}},
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
            order: 2,
        },
    });

    const googleProvider = await prisma.modelProviderInfo.upsert({
        where: {providerId: 'google'},
        update: {},
        create: {
            providerId: 'google',
            name: 'Google AI',
            iconUrl: '/assets/icons/google_ai_logo.svg',
            description: 'Cutting-edge multimodal models from Google.',
        },
    });

    await prisma.modelDescription.upsert({
        where: {providerInfoId_modelIdentifier: {providerInfoId: googleProvider.id, modelIdentifier: 'gemini-1.5-pro'}},
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
            order: 1,
        },
    });

    await prisma.modelDescription.upsert({
        where: {providerInfoId_modelIdentifier: {providerInfoId: googleProvider.id, modelIdentifier: 'gemini-1.0-pro'}},
        update: {},
        create: {
            modelIdentifier: 'gemini-1.0-pro',
            name: 'Gemini 1.0 Pro',
            providerInfoId: googleProvider.id,
            description: 'Google\'s highly capable multimodal model for complex reasoning tasks.',
            capabilities: ['text-generation', 'chat', 'vision'],
            contextWindow: '32K tokens',
            pricingInfo: '$0.000125/char input, $0.000375/char output',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            order: 2,
        },
    });


    const anthropicProvider = await prisma.modelProviderInfo.upsert({
        where: {providerId: 'anthropic'},
        update: {},
        create: {
            providerId: 'anthropic',
            name: 'Anthropic',
            iconUrl: '/assets/icons/anthropic_logo.svg',
            description: 'AI models focused on safety and helpfulness.',
        },
    });

    await prisma.modelDescription.upsert({
        where: {
            providerInfoId_modelIdentifier: {
                providerInfoId: anthropicProvider.id,
                modelIdentifier: 'claude-3-opus'
            }
        },
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
            order: 1,
        },
    });

    await prisma.modelDescription.upsert({
        where: {
            providerInfoId_modelIdentifier: {
                providerInfoId: anthropicProvider.id,
                modelIdentifier: 'claude-3-sonnet'
            }
        },
        update: {},
        create: {
            modelIdentifier: 'claude-3-sonnet',
            name: 'Claude 3 Sonnet',
            providerInfoId: anthropicProvider.id,
            description: 'Ideal balance of intelligence and speed for enterprise workloads.',
            capabilities: ['text-generation', 'chat', 'vision'],
            contextWindow: '200K tokens',
            pricingInfo: 'Input: $3.00/M tokens, Output: $15.00/M tokens',
            status: 'available',
            inputModalities: ['text', 'image'],
            outputModalities: ['text'],
            order: 2,
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