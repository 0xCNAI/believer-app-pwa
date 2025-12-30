/**
 * Summary Engine - Dynamic Summary Generation
 * 
 * Enhances the base resolveReversalCopy() with real-time belief/market data.
 * Generates dynamic "市場動態" interpretations based on actual probabilities.
 */

import { Belief } from '@/stores/beliefStore';
import { getPositiveProbability } from './marketData';

// ============ Types ============

export interface MarketDynamicItem {
    title: string;
    probability: number;       // 0-1 scale
    probabilityDisplay: string; // "45%"
    interpretation: string;    // "→ 市場預期偏高"
    impact: string;            // "→ 支撐力道增強"
    isPositive: boolean;       // prob >= 50
}

export interface NarrativeSummary {
    avgProbability: number;         // Average positive probability across all beliefs
    topSignals: MarketDynamicItem[]; // Top 3 signals
    overallSentiment: 'bullish' | 'neutral' | 'bearish';
    summaryText: string;            // One-line narrative summary
}

// ============ Interpretation Logic ============

/**
 * Generate interpretation text based on probability level
 */
export function getInterpretation(prob: number): { interpret: string; impact: string } {
    if (prob >= 70) {
        return { interpret: '→ 市場高度共識', impact: '→ 強化當前趨勢' };
    } else if (prob >= 55) {
        return { interpret: '→ 市場預期偏高', impact: '→ 支撐力道增強' };
    } else if (prob <= 30) {
        return { interpret: '→ 市場預期低落', impact: '→ 潛在利空風險' };
    } else if (prob <= 45) {
        return { interpret: '→ 市場信心不足', impact: '→ 動能稍微轉弱' };
    }
    return { interpret: '→ 市場共識未形成', impact: '→ 影響中性' };
}

/**
 * Convert belief to MarketDynamicItem with proper probability calculation
 */
export function beliefToMarketDynamic(belief: Belief): MarketDynamicItem {
    // Get positive probability using the smart function
    const market = belief.marketEvent.markets?.[0];
    let positiveProbRaw = belief.currentProbability; // Already 0-1 from parsePrice

    // If market data is available, use getPositiveProbability for accurate calculation
    if (market && market.outcomePrices && market.outcomes) {
        positiveProbRaw = getPositiveProbability(belief.id, market);
    }

    const prob = Math.round(positiveProbRaw * 100);
    const { interpret, impact } = getInterpretation(prob);

    return {
        title: belief.marketEvent.title,
        probability: positiveProbRaw,
        probabilityDisplay: `${prob}%`,
        interpretation: interpret,
        impact: impact,
        isPositive: prob >= 50
    };
}

/**
 * Generate narrative summary from beliefs array
 */
export function generateNarrativeSummary(beliefs: Belief[]): NarrativeSummary {
    if (!beliefs || beliefs.length === 0) {
        return {
            avgProbability: 0,
            topSignals: [],
            overallSentiment: 'neutral',
            summaryText: '尚未有足夠的市場數據進行分析。'
        };
    }

    // Convert all beliefs to dynamic items
    const dynamicItems = beliefs.map(b => beliefToMarketDynamic(b));

    // Calculate average probability
    const validItems = dynamicItems.filter(d => d.probability > 0);
    const avgProb = validItems.length > 0
        ? validItems.reduce((sum, d) => sum + d.probability, 0) / validItems.length
        : 0;

    // Determine overall sentiment
    let sentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral';
    const avgPercent = avgProb * 100;
    if (avgPercent >= 55) sentiment = 'bullish';
    else if (avgPercent <= 45) sentiment = 'bearish';

    // Top 3 signals (by probability, descending)
    const topSignals = [...dynamicItems]
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3);

    // Generate summary text
    let summaryText = '';
    if (sentiment === 'bullish') {
        summaryText = `敘事面整體偏多 (${Math.round(avgPercent)}%)，市場預期支撐風險資產。`;
    } else if (sentiment === 'bearish') {
        summaryText = `敘事面整體偏空 (${Math.round(avgPercent)}%)，市場預期對風險資產不利。`;
    } else {
        summaryText = `敘事面中性 (${Math.round(avgPercent)}%)，市場共識尚未形成。`;
    }

    return {
        avgProbability: avgProb,
        topSignals,
        overallSentiment: sentiment,
        summaryText
    };
}

/**
 * Generate enhanced reason lines that incorporate narrative data
 */
export function enhanceReasonLines(
    baseReasons: string[],
    beliefs: Belief[]
): string[] {
    const summary = generateNarrativeSummary(beliefs);

    if (summary.topSignals.length === 0) {
        return baseReasons;
    }

    // Add narrative context to reasons
    const enhanced = [...baseReasons];

    // Add top signal as a reason if it's significant
    const topSignal = summary.topSignals[0];
    if (topSignal && topSignal.probability > 0) {
        const signalReason = `敘事面：${topSignal.title} (${topSignal.probabilityDisplay})`;
        enhanced.push(signalReason);
    }

    return enhanced;
}
