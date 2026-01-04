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
    addedAt: number;
}

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
你是一位專業的加密貨幣市場分析師。請評估以下新聞對 ${category} 類別的重要性。

新聞標題: ${news.headline}

請回應以下 JSON 格式 (不要有其他文字):
{
  "importance": <1-10 的整數，10 為最重要>,
  "analysis": "<繁體中文，一句話說明這則新聞為什麼重要，最多 40 字>"
}

評估標準:
- 對加密市場的潛在影響程度
- 事件的即時性和新穎性
- 與 ${category} 類別的相關性
`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
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
            addedAt: Date.now()
        };

    } catch (error) {
        console.error('[AI Evaluator] Gemini API error:', error);
        return null;
    }
}
