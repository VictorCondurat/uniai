import { ModelConfig} from "@/lib/modelsConfig";

const BASE_OUTPUT_SIZE_RATIO: number = 2;

export function calculateInputTokens(inputString: string): number {
    if (!inputString) return 0;
    return Math.ceil(inputString.length / 4);
}

export function calculateOutputTokens(inputString: string): number {
    if (!inputString) return 0;
    return Math.ceil(inputString.length / 4 * BASE_OUTPUT_SIZE_RATIO);
}

export function calculateCostPerTokenFromMillion(totalCostPerMillion: number) {
    return totalCostPerMillion / 1000000;
}

export function calculateModelInputCost(prompt: string, model: ModelConfig) {
    const tokens: number = calculateInputTokens(prompt);
    return tokens * calculateCostPerTokenFromMillion(model.inputCostPerMillionTokens);
}

export function calculateModelOutputCost(prompt: string, model: ModelConfig) {
    const tokens: number = calculateOutputTokens(prompt);
    return tokens * calculateCostPerTokenFromMillion(model.outputCostPerMillionTokens);
}