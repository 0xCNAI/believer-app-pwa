import { MarketEvent } from './polymarket';
import { fetchSignalsByIds } from './realApi';
import { PredictionTopic } from '@/stores/userStore';

export { MarketEvent };

export type ScoringType = 'binary_good' | 'binary_bad' | 'fed_cut';

// V5.0 Strict Schema
export interface NarrativeSignal {
    id: string;
    title: string;
    description: string;
    scoring: ScoringType;
    source: {
        type: 'polymarket';
        slug: string;   // Primary: The specific event slug
        marketId?: string; // Optional: Specific market ID if multi-market event
    };
    // Display metadata
    category: 'Macro' | 'Structural' | 'Political' | 'Narrative';
    markets?: any[]; // Populated at runtime
}

// V5.0 HARDCODED SIGNALS
export const BELIEVER_SIGNALS: NarrativeSignal[] = [
    {
        id: 'fed_decision',
        title: 'Fed 利率決策 (Jan/Mar)',
        description: '多選項市場：以「降息機率」作為敘事分數',
        scoring: 'fed_cut',
        category: 'Macro',
        source: {
            type: 'polymarket',
            // Falling back to a known active prediction if specific meeting not found.
            // Ideally: 'fed-decision-in-march-2025' or similar.
            // Using a search-friendly slug based on "Fed" search results or known pattern.
            // Note: If this 404s, API will need a manual update.
            slug: 'fed-policy-decision-january-2025'
        }
    },
    {
        id: 'us_recession',
        title: '美國衰退風險 (2025)',
        description: '風險事件：(1 - P(Yes)) 代表「無衰退」',
        scoring: 'binary_bad',
        category: 'Macro',
        source: {
            type: 'polymarket',
            slug: 'us-recession-in-2025'
        }
    },
    {
        id: 'gov_shutdown',
        title: '政府停擺風險 (Jan 31)',
        description: '風險事件：(1 - P(Yes)) 代表「正常運作」',
        scoring: 'binary_bad',
        category: 'Political',
        source: {
            type: 'polymarket',
            slug: 'us-government-funding-lapse-on-january-31'
        }
    },
    {
        id: 'us_debt_default',
        title: '美債違約風險 (2027)',
        description: '風險事件：(1 - P(Yes)) 代表「無違約」',
        scoring: 'binary_bad',
        category: 'Political',
        source: {
            type: 'polymarket',
            slug: 'us-defaults-on-debt-by-2027'
        }
    },
    {
        id: 'btc_reserve',
        title: '比特幣戰略儲備 (2025)',
        description: '正向事件：P(Yes) 代表「主權採用」',
        scoring: 'binary_good',
        category: 'Structural',
        source: {
            type: 'polymarket',
            slug: 'us-national-bitcoin-reserve-in-2025'
        }
    }
];

// Calculate Score Contribution (Max 25 pts)
export const calculateNarrativeScore = (signal: NarrativeSignal, totalSignals: number): number => {
    const market = signal.markets?.[0];
    if (!market) return 0;

    // 1. Get Positive Probability (0-1)
    const prob = getPositiveProbability(signal);

    // 2. Calculate Strict Contribution
    // Formula: 25 * (1/k) * Prob
    const weight = 1 / totalSignals;
    const score = 25 * weight * prob;

    return Math.round(score * 10) / 10; // Round to 1 decimal
};

export const getPositiveProbability = (signal: NarrativeSignal): number => {
    const market = signal.markets?.[0];
    if (!market?.outcomePrices) return 0.5; // Default neutral

    let prices: number[] = [];
    try {
        prices = JSON.parse(market.outcomePrices).map((p: string) => parseFloat(p));
    } catch { return 0; }

    const outcomes = JSON.parse(market.outcomes || '[]');

    // A. Binary Good: P(Yes)
    if (signal.scoring === 'binary_good') {
        const yesIdx = outcomes.findIndex((o: string) => o.toLowerCase() === 'yes');
        // Fallback to index 0 if binary and "Yes" not explicit, but usually Yes is first or second.
        // Polymarket binary: often ["Yes", "No"] or ["No", "Yes"]. NEED TO BE CAREFUL.
        // Actually Polymarket API outcomes are ["Yes", "No"] usually.
        // Safest: Use "Yes" index.
        const idx = yesIdx >= 0 ? yesIdx : 0;
        return prices[idx] || 0;
    }

    // B. Binary Bad: 1 - P(Yes)
    if (signal.scoring === 'binary_bad') {
        const yesIdx = outcomes.findIndex((o: string) => o.toLowerCase() === 'yes');
        const idx = yesIdx >= 0 ? yesIdx : 0;
        const pYes = prices[idx] || 0;
        return 1 - pYes;
    }

    // C. Fed Cut: Sum(Cut outcomes)
    if (signal.scoring === 'fed_cut') {
        let cutSum = 0;
        outcomes.forEach((o: string, i: number) => {
            const label = o.toLowerCase();
            if (label.includes('cut') || label.includes('decrease') || label.includes('lower')) {
                cutSum += prices[i] || 0;
            }
        });
        return cutSum;
    }

    return 0;
};

// Simplified Fetch
export const fetchUnifiedMarkets = async (
    userTopics: PredictionTopic[] // Legacy arg, kept for compatibility but effectively ignored by strict list
): Promise<NarrativeSignal[]> => {
    console.log('[MarketData] Fetching V5.0 Strict Signals...');

    // 1. Get Base Signals
    const baseSignals = [...BELIEVER_SIGNALS];

    // 2. Fetch Live Data
    const populated = await fetchSignalsByIds(baseSignals);

    return populated;
};

