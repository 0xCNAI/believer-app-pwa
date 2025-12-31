import { NarrativeSignal } from './marketData';
import { useBeliefStore } from '@/stores/beliefStore';
import { getPositiveProbability } from './marketData';

// Model: Gemini 2.0 Flash Lite Preview 02-05
const MODEL_NAME = 'gemini-2.0-flash-lite-preview-02-05';

// API Key from Environment
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// V5.1 Key Signal Interface
export interface KeySignalContext {
    title: string;
    prob: number;
    delta: number;
    id: string;
}

export const generateMarketSummary = async (targetSignals?: KeySignalContext[]): Promise<string> => {
    // 1. Gather Context
    let contextStr = '';

    // If UI provides specific top 3 signals (V5.1 Logic)
    if (targetSignals && targetSignals.length > 0) {
        contextStr = targetSignals.map(s => {
            const direction = s.delta > 0.001 ? 'Change: Changed' : 'Change: Stable';
            return `Signal: ${s.title} (Prob: ${s.prob}%, ${direction})`;
        }).join('\n');
    } else {
        // Fallback (or legacy)
        const beliefs = useBeliefStore.getState().beliefs;
        const trackedEvents = beliefs.filter(b => !b.id.startsWith('custom'));
        if (trackedEvents.length === 0) return "尚未追蹤任何市場信號。";

        contextStr = trackedEvents.map(b => {
            const p = Math.round(b.currentProbability * 100);
            return `${b.signal.title} (${p}%)`;
        }).join('; ');
    }

    if (!API_KEY || API_KEY.includes('YOUR_KEY')) {
        return "請設定 Gemini API Key。";
    }

    const prompt = `
    You are a professional financial analyst.
    
    Analyze the following 3 Key Market Changes (PolyMarket Data):
    ${contextStr}

    Object: Explain "Why these specific changes matter to the macro market".
    
    Strict Output Format (Traditional Chinese):
    • [Signal Name] ... (Explain the change & its impact, no generic definitions)
    • [Signal Name] ...
    • [Signal Name] ...

    Rules:
    1. Exactly 3 bullet points.
    2. Focus on CAUSALITY (Why it changed -> What it implies).
    3. NO investment advice.
    4. Keep it concise (< 40 words per point).
    `;

    // 3. Call Gemini API via Fetch
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        console.log('[AI Service] Requesting Gemini Flash...');

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(`Gemini API Error: ${errBody.error?.message}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return text || "AI 未返回分析結果。";

    } catch (error: any) {
        console.error('[AI Service] Error:', error);
        return `分析失敗: ${error.message}`;
    }
};
