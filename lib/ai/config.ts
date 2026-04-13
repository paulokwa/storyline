/**
 * AI Pricing and Safeguard Configuration
 * 
 * Centralized location for AI cost estimation, model pricing, 
 * and confirmation thresholds.
 */

export interface ModelPricing {
    inputCostPer1MTokens: number; // in USD
    outputCostPer1MTokens: number; // in USD
}

/**
 * Gemini pricing based on current Google Cloud / Vertex AI tiers
 */
export const AI_PRICING: Record<string, ModelPricing> = {
    'gemini-1.5-flash': {
        inputCostPer1MTokens: 0.10,
        outputCostPer1MTokens: 0.40
    },
    'gemini-1.5-pro': {
        inputCostPer1MTokens: 3.50,
        outputCostPer1MTokens: 10.50
    },
    'gemini-2.0-flash-exp': {
        inputCostPer1MTokens: 0.10,
        outputCostPer1MTokens: 0.40
    }
    // No 'default' fallback here to prevent understating costs for unknown models
};

export const SAFEGUARD_THRESHOLDS = {
    COST_CONFIRMATION_USD: 0.25, // Require modal confirmation above this
    INLINE_NOTICE_COST_USD: 0.05, // Show small notice above this
    EXTREME_CONTEXT_CHARS: 150000, // Trigger "Extreme context" selection
    PERFORMANCE_WARNING_LOCAL_CHARS: 30000, // Warn about speed for local models
};

/**
 * Rough token estimation (approx 4 chars per token)
 */
export function estimateTokensApprox(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Calculates estimated cost for input. Returns null if pricing is unknown.
 */
export function calculateEstimatedInputCost(text: string, provider: string, model?: string): number | null {
    if (provider === 'ollama') return 0;
    
    const pricing = AI_PRICING[model || ''];
    if (!pricing) return null;
    
    const tokens = estimateTokensApprox(text);
    return (tokens / 1_000_000) * pricing.inputCostPer1MTokens;
}

export type ContextSizingResult = {
    charCount: number;
    estimatedTokens: number;
    estimatedCost: number | null; // Null if unknown
    level: 'low' | 'medium' | 'high' | 'extreme';
};

export function analyzeContextSize(text: string, provider: string, model?: string): ContextSizingResult {
    const charCount = text.length;
    const tokens = estimateTokensApprox(text);
    const cost = calculateEstimatedInputCost(text, provider, model);

    let level: ContextSizingResult['level'] = 'low';
    
    if (charCount > SAFEGUARD_THRESHOLDS.EXTREME_CONTEXT_CHARS) {
        level = 'extreme';
    } else if (cost === null) {
        // Unknown pricing + high token count = require confirmation for safety
        if (tokens > 50000) level = 'high';
        else if (tokens > 10000) level = 'medium';
    } else {
        if (cost > SAFEGUARD_THRESHOLDS.COST_CONFIRMATION_USD) level = 'high';
        else if (cost > SAFEGUARD_THRESHOLDS.INLINE_NOTICE_COST_USD) level = 'medium';
    }

    return {
        charCount,
        estimatedTokens: tokens,
        estimatedCost: cost,
        level
    };
}
