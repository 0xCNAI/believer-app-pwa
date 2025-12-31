import { MarketEvent } from './marketData';
import { useBeliefStore } from '@/stores/beliefStore';
import { getPositiveProbability } from './marketData';

// Model: Gemini 2.0 Flash Lite Preview 02-05
const MODEL_NAME = 'gemini-2.0-flash-lite-preview-02-05';
// NOTE: In a real app, use a backend proxy or secure storage. 
// For this scratchpad/demo, we'll look for an env var or expect the user to fill it.
// You can get a key from https://aistudio.google.com/
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';

export const generateMarketSummary = async (): Promise<string> => {
    // 1. Gather Context
    const beliefs = useBeliefStore.getState().beliefs;
    const trackedEvents = beliefs.filter(b => !b.id.startsWith('custom'));

    if (trackedEvents.length === 0) {
        return "No market signals tracked. Please track some events first.";
    }

    // 2. Format Data for AI
    const eventsDescription = trackedEvents.map(b => {
        const market = b.marketEvent.markets?.[0];
        let range = 'N/A';
        try {
            if (market) {
                const prob = Math.round(getPositiveProbability(b.id, market) * 100);
                range = `${prob}%`;
            }
        } catch (e) { }

        return `- Event: ${b.marketEvent.title}\n  Current Probability: ${range}\n  Description: ${b.marketEvent.description}`;
    }).join('\n\n');

    const prompt = `
    You are a professional financial analyst for the "Believer" system.
    Analyze the following prediction market signals and their probabilities.
    provide a concise (max 3 sentences) summary of the current market sentiment and potential risks.
    Focus on the "Narrative" and "Macro" implications.
    Logic: High probability (>60%) means consensus is forming. Low (<40%) means skepticism.
    
    Current Signals:
    ${eventsDescription}
    
    Output in Traditional Chinese (繁體中文).
    `;

    // 3. Call Gemini API via Fetch
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gemini API Error');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return text || "無法產生分析結果。";

    } catch (error: any) {
        console.error('[AI Service] Error:', error);
        if (error.message.includes('API key')) {
            return "請設定 Gemini API Key (services/aiService.ts)";
        }
        return "AI 分析暫時無法使用。";
    }
};
