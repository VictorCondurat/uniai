import { ModelConfig } from '@/lib/modelsConfig';
import {  calculateModelInputCost,calculateModelOutputCost,calculateInputTokens,calculateOutputTokens} from '@/lib/costCalculator';

export function simulateApiCall(
    prompt: string,
    model: ModelConfig,
) {
    const costInput = calculateModelInputCost(prompt, model);
    const costOutput = calculateModelOutputCost(prompt,model)
    const tokensInput = calculateInputTokens(prompt);
    const tokensOutput = calculateOutputTokens(prompt);

    const response = `[Mock Response] Input Prompt: ${prompt}.`;

    return {
        tokensInput,
        tokensOutput,
        totalTokens: tokensInput + tokensOutput,
        costInput,
        costOutput,
        totalCost: costInput + costOutput,
        response
    };
}