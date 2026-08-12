// backend/services/anthropicService.js

/**
 * Service Abstraction for Anthropic (Claude 3.5 Sonnet)
 * Incorporates the "Tomorrow" Constraint with a 1-second delay for MOCK testing.
 */

const isMock = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'MOCK';

exports.generateReport = async (summaryText, transcriptText, templateType, language = null) => {
    if (isMock) {
        console.log(`[MOCK] Anthropic key missing, throwing error to trigger OpenAI fallback...`);
        throw new Error("Anthropic API Key missing, falling back to OpenAI");
    }

    // Production Anthropic Claude logic goes here
    throw new Error("Anthropic generation not fully implemented yet");
};
