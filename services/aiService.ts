import { NarrativeSignal } from './marketData';
import { useBeliefStore } from '@/stores/beliefStore';
import { getPositiveProbability } from './marketData';

// Model: Gemini 2.0 Flash Lite Preview 02-05
const MODEL_NAME = 'gemini-2.0-flash-lite-preview-02-05';

// API Key from Environment
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export const generateMarketSummary = async (): Promise<string> => {
    // 1. Gather Context
    const beliefs = useBeliefStore.getState().beliefs;
    const trackedEvents = beliefs.filter(b => !b.id.startsWith('custom'));

    if (trackedEvents.length === 0) {
        return "尚未追蹤任何市場信號，請先新增關注事件。";
    }

    if (!API_KEY || API_KEY.includes('YOUR_KEY')) {
        return "請設定 Gemini API Key (於專案根目錄建立 .env 檔案並設定 EXPO_PUBLIC_GEMINI_API_KEY)。";
    }

    // 2. Format Data for AI
    const eventsDescription = trackedEvents.map(b => {
        const signal = b.signal;
        let range = 'N/A';
        try {
            if (signal) {
                const prob = Math.round(getPositiveProbability(signal) * 100);
                range = `${prob}%`;
            }
        } catch (e) { }

        // Determine if it's a risk event (bad) or opportunity (good)
        const typeLabel = signal.scoring === 'binary_bad' ? '(Risk Metric: Low % is Good)' : '(Positive Probability)';

        return `- Signal: ${signal.title}\n  Score/Prob: ${range} ${typeLabel}\n  Context: ${signal.description}`;
    }).join('\n\n');

    const prompt = `
    You are a professional financial analyst for the "Believer" system.
    Analyze the following prediction market signals and their probabilities.
    provide a concise (max 3 sentences) summary of the current market sentiment and potential risks.
    Focus on the "Narrative" and "Macro" implications.
    Logic: 
    - For Risk Metrics (binary_bad), HIGH probability means HIGH RISK (Bad).
    - For Opportunity Metrics (binary_good/fed_cut), HIGH probability means HIGH CONVICTION (Good/Consensus).
    
    Current Signals:
    ${eventsDescription}
    
    Output directly in Traditional Chinese (繁體中文).
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
        return "AI 分析暫時無法使用，請檢查 API Key 或網路連線。";
    }
};
