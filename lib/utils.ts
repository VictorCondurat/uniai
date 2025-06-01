import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateApiKey(): string {
  return 'sk-' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
  }
  
  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo']
  const promptCost = (promptTokens / 1000) * modelPricing.prompt
  const completionCost = (completionTokens / 1000) * modelPricing.completion
  
  // Add 10% markup
  return (promptCost + completionCost) * 1.1
}
