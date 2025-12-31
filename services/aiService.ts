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

    // 2. Format Data for AI (Focus on keywords for search)
    const keywords = trackedEvents.map(b => b.signal?.title).filter(Boolean).join(', ');
    const context = trackedEvents.map(b => {
        const signal = b.signal;
        let probDisplay = 'N/A';
        try {
            if (signal) {
                const prob = Math.round(getPositiveProbability(signal) * 100);
                probDisplay = `${prob}%`;
            }
        } catch { }
        return `${signal.title} (Current Prob: ${probDisplay})`;
    }).join('; ');

    const prompt = `
    You are an expert financial news researcher.
    
    My focus list: ${keywords}
    Current Prediction Markets Data: ${context}

    Your Task:
    1. Use Google Search to find the *latest* news (last 7 days) regarding these specific topics.
    2. Synthesize the Prediction Market data with the Real News.
    3. Provide a summary in exactly 3 key points (Traditional Chinese).
    
    Format:
    1. [事件] ... (引用新聞)
    2. [市場] ... (結合預測數據)
    3. [風險] ... (潛在影響)

    Keep it concise. Max 3 sentences per point.
    `;

    // 3. Call Gemini API via Fetch with proper error handling
    try {
        // Use gemini-1.5-flash for speed and stability (no search tool needed, model has recent knowledge)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        console.log('[AI Service] Requesting Gemini Flash...');

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
                // Removed tools: [{ google_search: {} }] to prevent permission errors
            })
        });

        if (!response.ok) {
            const errBody = await response.json();
            const errMsg = errBody.error?.message || response.statusText;
            console.error('[AI Service] API Error Details:', JSON.stringify(errBody, null, 2));
            throw new Error(`Gemini API Error: ${errMsg}`);
        }

        const data = await response.json();

        // Extract text and grounding metadata (optional to display sources, but for now just text)
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (!text) {
            console.error('[AI Service] Empty response:', data);
            return "AI 未返回分析結果。";
        }

        return text;

    } catch (error: any) {
        console.error('[AI Service] Network/Logic Error:', error);
        return `分析失敗: ${error.message}`;
    }
};
