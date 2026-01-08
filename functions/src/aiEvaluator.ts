/**
 * AI Evaluator - Uses Gemini to evaluate news importance
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from 'firebase-functions';
import { NewsItem } from './newsService';

export interface MarketInsight {
    headline: string;
    url: string;
    analysis: string;
    importance: number;
    signalId?: string | null; // Optional: Link to a specific tracker
    addedAt: number;
}

// Tracked Signals Metadata for AI Context
const TRACKED_SIGNALS = [
    { id: 'fed_decision', name: 'Fed 利率決策', keywords: ['Fed', 'Powell', 'Rate Cut', 'FOMC', '利率', '鮑威爾'] },
    { id: 'us_recession', name: '美國衰退風險', keywords: ['Recession', 'GDP', 'Unemployment', '衰退', '失業率', '經濟數據'] },
    { id: 'gov_shutdown', name: '政府停擺', keywords: ['Shutdown', 'Government Funding', 'Congress', 'Budget', '停擺', '預算'] },
    { id: 'us_debt_default', name: '美債違約', keywords: ['Debt Ceiling', 'Default', 'Treasury', '美債', '違約'] },
    { id: 'btc_reserve', name: 'BTC 戰略儲備', keywords: ['Strategic Reserve', 'Trump', 'Lummis', 'Bitcoin Reserve', '儲備', '法案'] }
];

// Initialize Gemini using Firebase config
const apiKey = functions.config().gemini?.apikey || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Evaluate new news and merge with existing insights
 * Keep top 3 by importance
 */
export async function evaluateAndMergeInsights(
    existing: MarketInsight[],
    newNews: NewsItem[],
    category: string
): Promise<MarketInsight[]> {
    if (newNews.length === 0) {
        return existing;
    }

    // Evaluate each new news item
    const evaluatedNews: MarketInsight[] = [];

    for (const news of newNews) {
        try {
            const evaluation = await evaluateSingleNews(news, category);
            if (evaluation) {
                evaluatedNews.push(evaluation);
            }
        } catch (error) {
            console.error('[AI Evaluator] Error evaluating news:', error);
        }
    }

    // Merge with existing (remove duplicates by URL)
    const allInsights = [...existing];
    const existingUrls = new Set(existing.map(e => e.url));

    for (const newInsight of evaluatedNews) {
        if (!existingUrls.has(newInsight.url)) {
            allInsights.push(newInsight);
        }
    }

    // Sort by importance (desc) and take top 3
    allInsights.sort((a, b) => b.importance - a.importance);

    return allInsights.slice(0, 3);
}

/**
 * Evaluate a single news item using Gemini
 */
async function evaluateSingleNews(
    news: NewsItem,
    category: string
): Promise<MarketInsight | null> {
    const prompt = `
你是一位專業的加密貨幣市場分析師。請評估以下新聞對 ${category} 類別的重要性，並判斷是否與我們追蹤的特定預測市場訊號相關。

追蹤訊號列表:
${TRACKED_SIGNALS.map(s => `- ID: ${s.id} | 名稱: ${s.name} | 關鍵字: ${s.keywords.join(', ')}`).join('\n')}

新聞標題: ${news.headline}

請回應以下 JSON 格式 (不要有其他文字):
{
  "importance": <1-10 的整數，10 為最重要>,
  "analysis": "<繁體中文，直接陳述觀察與結論，嚴禁使用「這則新聞」、「報導指出」等贅詞。例如：『川普重申支持，預期推升法案通過機率』。最多 40 字>",
  "signalId": "<請務必優先歸類至上述追蹤訊號 ID (如 'btc_reserve')。僅在完全無關時填 null>"
}

評估標準:
- 嚴格禁止使用「這則新聞...」、「該文章...」開頭。直接講重點。
- 優先尋找與 ${category} 類別及追蹤訊號的關聯性。
- 若新聞明確提到相關關鍵字，請優先歸類至該訊號。
`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[AI Evaluator] No JSON in response:', text);
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            headline: news.headline,
            url: news.url,
            analysis: parsed.analysis || '分析生成中...',
            importance: Math.min(10, Math.max(1, parseInt(parsed.importance) || 5)),
            signalId: parsed.signalId || null, // Capture signalId
            addedAt: Date.now()
        };

    } catch (error) {
        console.error('[AI Evaluator] Gemini API error:', error);
        return null;
    }
}
