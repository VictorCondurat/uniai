export interface ModelPerformance {
    speed: number;
    cost: number;
    quality: number;
    label: 'Speed Optimized' | 'Balanced' | 'Quality First' | 'Standard' | 'Specialized';
}

export interface ModelConfig {
    providerId: 'openai' | 'google' | 'anthropic';
    modelIdentifier: string;
    name: string;
    description: string;
    capabilities: string[];
    contextWindow: string;
    status: 'available' | 'preview' | 'deprecated';
    inputModalities: ('text' | 'image' | 'audio' | 'video')[];
    outputModalities: ('text' | 'image' | 'audio' | 'video')[];
    isFineTuneable?: boolean;
    displayOrder: number;
    notes?: string;
    inputCostPerMillionTokens: number;
    outputCostPerMillionTokens: number;
    performance: ModelPerformance;
}


export const ALL_MODELS_CONFIG: ModelConfig[] = [
    {
        providerId: 'openai', modelIdentifier: 'gpt-4-turbo', name: 'GPT-4 Turbo',
        description: 'OpenAI\'s most advanced model with a large context window and up-to-date knowledge.',
        capabilities: ['text-generation', 'chat', 'code-completion', 'vision'], contextWindow: '128K tokens',
        status: 'available', inputModalities: ['text', 'image'], outputModalities: ['text'], displayOrder: 1,
        inputCostPerMillionTokens: 10.00, outputCostPerMillionTokens: 30.00,
        performance: {speed: 85, cost: 50, quality: 95, label: 'Quality First'}
    },
    {
        providerId: 'openai',
        modelIdentifier: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'A fast and cost-effective model for a wide range of general tasks.',
        capabilities: ['text-generation', 'chat', 'code-completion'],
        contextWindow: '16K tokens',
        status: 'available',
        inputModalities: ['text'],
        outputModalities: ['text'],
        isFineTuneable: true,
        displayOrder: 2,
        inputCostPerMillionTokens: 0.50,
        outputCostPerMillionTokens: 1.50,
        performance: {speed: 95, cost: 95, quality: 80, label: 'Speed Optimized'}
    },
    {
        providerId: 'openai',
        modelIdentifier: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        description: 'A cost-efficient small language model, strong in reasoning and function calling.',
        capabilities: ['text-generation', 'vision', 'chat', 'function-calling'],
        contextWindow: '128K tokens',
        status: 'available',
        inputModalities: ['text', 'image'],
        outputModalities: ['text'],
        displayOrder: 3,
        notes: 'Released July 18, 2024.',
        inputCostPerMillionTokens: 0.15,
        outputCostPerMillionTokens: 0.60,
        performance: {speed: 98, cost: 98, quality: 85, label: 'Speed Optimized'}
    },
    {
        providerId: 'openai',
        modelIdentifier: 'o3-mini',
        name: 'OpenAI o3-mini',
        description: 'A reasoning-optimized model focused on coding, math, and science tasks.',
        capabilities: ['text-generation', 'reasoning', 'coding', 'chat', 'function-calling'],
        contextWindow: '128K tokens',
        status: 'available',
        inputModalities: ['text'],
        outputModalities: ['text'],
        displayOrder: 4,
        notes: 'Released January 31, 2025. Does not handle vision.',
        inputCostPerMillionTokens: 2.00,
        outputCostPerMillionTokens: 6.00,
        performance: {speed: 80, cost: 80, quality: 90, label: 'Balanced'}
    },
    {
        providerId: 'openai',
        modelIdentifier: 'o3',
        name: 'OpenAI o3',
        description: 'Flagship reasoning model with visual understanding and agentic tool use.',
        capabilities: ['text-generation', 'reasoning', 'vision', 'tool-use', 'agent'],
        contextWindow: 'N/A',
        status: 'available',
        inputModalities: ['text', 'image'],
        outputModalities: ['text'],
        displayOrder: 5,
        notes: 'Released April 16, 2025. Agentic tool use.',
        inputCostPerMillionTokens: 12.00,
        outputCostPerMillionTokens: 36.00,
        performance: {speed: 70, cost: 45, quality: 98, label: 'Quality First'}
    },
    {
        providerId: 'openai',
        modelIdentifier: 'o4-mini',
        name: 'OpenAI o4-mini',
        description: 'High-throughput model for fast, cost-effective reasoning with visual and tool-use capabilities.',
        capabilities: ['text-generation', 'reasoning', 'vision', 'tool-use', 'agent'],
        contextWindow: 'N/A',
        status: 'available',
        inputModalities: ['text', 'image'],
        outputModalities: ['text'],
        displayOrder: 6,
        notes: 'Released April 16, 2025. Agentic tool use.',
        inputCostPerMillionTokens: 1.00,
        outputCostPerMillionTokens: 3.00,
        performance: {speed: 92, cost: 90, quality: 88, label: 'Balanced'}
    },

    {
        providerId: 'google',
        modelIdentifier: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Google\'s next-generation highly capable multimodal model with a long context window.',
        capabilities: ['text-generation', 'chat', 'vision', 'audio-processing', 'video-understanding'],
        contextWindow: '1M tokens',
        status: 'available',
        inputModalities: ['text', 'image', 'audio', 'video'],
        outputModalities: ['text'],
        displayOrder: 1,
        inputCostPerMillionTokens: 3.50,
        outputCostPerMillionTokens: 10.50,
        performance: {speed: 75, cost: 75, quality: 94, label: 'Quality First'}
    },
    {
        providerId: 'google',
        modelIdentifier: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: "Highly efficient 'workhorse' model with low latency for everyday tasks.",
        capabilities: ['text-generation', 'chat', 'vision', 'audio-processing', 'video-understanding'],
        contextWindow: '32K tokens',
        status: 'available',
        inputModalities: ['text', 'image', 'audio', 'video'],
        outputModalities: ['text'],
        displayOrder: 2,
        notes: 'GA in February 2025.',
        inputCostPerMillionTokens: 0.70,
        outputCostPerMillionTokens: 2.10,
        performance: {speed: 96, cost: 94, quality: 82, label: 'Speed Optimized'}
    },
    {
        providerId: 'google',
        modelIdentifier: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: "Upgraded model with strong coding and reasoning abilities and 'Deep Think' mode.",
        capabilities: ['text-generation', 'chat', 'coding', 'reasoning'],
        contextWindow: 'N/A',
        status: 'preview',
        inputModalities: ['text', 'image', 'audio', 'video'],
        outputModalities: ['text'],
        displayOrder: 3,
        notes: 'Public preview May 2025.',
        inputCostPerMillionTokens: 1.00,
        outputCostPerMillionTokens: 3.00,
        performance: {speed: 90, cost: 90, quality: 89, label: 'Balanced'}
    },
    {
        providerId: 'google',
        modelIdentifier: 'imagen-4',
        name: 'Imagen 4',
        description: 'Highest-quality text-to-image model with outstanding text fidelity and multilingual support.',
        capabilities: ['image-generation'],
        contextWindow: 'N/A',
        status: 'preview',
        inputModalities: ['text'],
        outputModalities: ['image'],
        displayOrder: 4,
        notes: 'Public preview May 20, 2025.',
        inputCostPerMillionTokens: 2.50,
        outputCostPerMillionTokens: 2.50,
        performance: {speed: 60, cost: 60, quality: 95, label: 'Specialized'}
    },
    {
        providerId: 'google',
        modelIdentifier: 'veo-3',
        name: 'Veo 3',
        description: 'State-of-the-art text-to-video model with synchronized audio generation.',
        capabilities: ['video-generation', 'audio-generation'],
        contextWindow: 'N/A',
        status: 'preview',
        inputModalities: ['text', 'image'],
        outputModalities: ['video', 'audio'],
        displayOrder: 5,
        notes: 'Public preview May 2025.',
        inputCostPerMillionTokens: 5.00,
        outputCostPerMillionTokens: 5.00,
        performance: {speed: 50, cost: 50, quality: 96, label: 'Specialized'}
    },
    {
        providerId: 'google',
        modelIdentifier: 'lyria-2',
        name: 'Lyria 2',
        description: 'AI music generation model for high-fidelity, professional-grade audio tracks.',
        capabilities: ['audio-generation', 'music-generation'],
        contextWindow: 'N/A',
        status: 'available',
        inputModalities: ['text'],
        outputModalities: ['audio'],
        displayOrder: 6,
        notes: 'GA in May 2025.',
        inputCostPerMillionTokens: 4.00,
        outputCostPerMillionTokens: 4.00,
        performance: {speed: 65, cost: 55, quality: 92, label: 'Specialized'}
    },

    {
        providerId: 'anthropic', modelIdentifier: 'claude-3-opus', name: 'Claude 3 Opus',
        description: 'Anthropic\'s most powerful model for highly complex tasks and top-level performance.',
        capabilities: ['text-generation', 'chat', 'vision', 'reasoning'], contextWindow: '200K tokens',
        status: 'available', inputModalities: ['text', 'image'], outputModalities: ['text'], displayOrder: 1,
        inputCostPerMillionTokens: 15.00, outputCostPerMillionTokens: 75.00,
        performance: {speed: 65, cost: 30, quality: 99, label: 'Quality First'}
    },
    {
        providerId: 'anthropic',
        modelIdentifier: 'claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'High-performance model with industry-leading coding capabilities and experimental computer use.',
        capabilities: ['text-generation', 'chat', 'coding', 'vision', 'agent'],
        contextWindow: '100K tokens',
        status: 'available',
        inputModalities: ['text', 'image'],
        outputModalities: ['text'],
        displayOrder: 2,
        notes: 'Released October 2024.',
        inputCostPerMillionTokens: 3.00,
        outputCostPerMillionTokens: 15.00,
        performance: {speed: 88, cost: 78, quality: 92, label: 'Balanced'}
    },
    {
        providerId: 'anthropic',
        modelIdentifier: 'claude-3.5-haiku',
        name: 'Claude 3.5 Haiku',
        description: 'Fast and small model matching the performance of the previous Claude 3 Opus.',
        capabilities: ['text-generation', 'chat', 'vision'],
        contextWindow: '100K tokens',
        status: 'available',
        inputModalities: ['text', 'image'],
        outputModalities: ['text'],
        displayOrder: 3,
        notes: 'Released October 2024.',
        inputCostPerMillionTokens: 0.25,
        outputCostPerMillionTokens: 1.25,
        performance: {speed: 99, cost: 99, quality: 84, label: 'Speed Optimized'}
    },
    {
        providerId: 'anthropic',
        modelIdentifier: 'claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet',
        description: "First hybrid reasoning LLM with visible step-by-step thinking for complex tasks.",
        capabilities: ['text-generation', 'chat', 'coding', 'vision', 'reasoning'],
        contextWindow: '64K tokens (deliberation)',
        status: 'available',
        inputModalities: ['text', 'image'],
        outputModalities: ['text'],
        displayOrder: 4,
        notes: 'Released February 24, 2025. Hybrid reasoning mode.',
        inputCostPerMillionTokens: 3.00,
        outputCostPerMillionTokens: 15.00,
        performance: {speed: 85, cost: 78, quality: 93, label: 'Balanced'}
    },
    {
        providerId: 'anthropic',
        modelIdentifier: 'claude-4-opus',
        name: 'Claude 4 Opus',
        description: 'Next-gen flagship model, state-of-the-art for coding and long-running agent workflows.',
        capabilities: ['text-generation', 'chat', 'coding', 'vision', 'reasoning', 'tool-use', 'agent'],
        contextWindow: '200K tokens',
        status: 'available',
        inputModalities: ['text', 'image'],
        outputModalities: ['text'],
        displayOrder: 5,
        notes: 'Released May 22, 2025. Built-in tool use.',
        inputCostPerMillionTokens: 15.00,
        outputCostPerMillionTokens: 75.00,
        performance: {speed: 70, cost: 30, quality: 100, label: 'Quality First'}
    },
    {
        providerId: 'anthropic',
        modelIdentifier: 'claude-4-sonnet',
        name: 'Claude 4 Sonnet',
        description: 'Highly capable model with superior coding and reasoning, and built-in tool use.',
        capabilities: ['text-generation', 'chat', 'coding', 'vision', 'reasoning', 'tool-use', 'agent'],
        contextWindow: '200K tokens',
        status: 'available',
        inputModalities: ['text', 'image'],
        outputModalities: ['text'],
        displayOrder: 6,
        notes: 'Released May 22, 2025. Built-in tool use.',
        inputCostPerMillionTokens: 3.00,
        outputCostPerMillionTokens: 15.00,
        performance: {speed: 90, cost: 78, quality: 95, label: 'Balanced'}
    },
];

export const ALL_PROVIDERS_CONFIG = [
    {
        providerId: 'openai',
        name: 'OpenAI',
        iconUrl: '/assets/icons/openai_logo.svg',
        description: 'Advanced AI models by OpenAI, including the GPT series.'
    },
    {
        providerId: 'google',
        name: 'Google AI',
        iconUrl: '/assets/icons/google_ai_logo.svg',
        description: 'Cutting-edge multimodal models from Google.'
    },
    {
        providerId: 'anthropic',
        name: 'Anthropic',
        iconUrl: '/assets/icons/anthropic_logo.svg',
        description: 'AI models focused on safety and helpfulness.'
    }
];