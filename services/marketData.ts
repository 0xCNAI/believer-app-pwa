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


export type EventCategory = 'Macro' | 'Structural' | 'Political' | 'Narrative';

/**
 * BELIEVER SIGNALS - V4.0 (7 IDs)
 *
 * Rules:
 * - Only fed_decision_series is non-binary (multi-outcome).
 * - All others are treated as binary markets, but scoring uses "BTC-positive probability".
 */
export const BELIEVER_SIGNALS: MarketEvent[] = [
    {
        id: 'fed_decision_series',
        title: 'Fed 利率決策（Series）',
        description: '多選項市場：以「降息機率」作為敘事分數（Cut/Hold/Hike）',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/fed-decision-in-january',
        category: 'Macro',
        slug: 'fed',
        endDate: '2026-12-31',
        markets: []
    },
    {
        id: 'us_recession_end_2026',
        title: '美國衰退風險（至 2026）',
        description: '風險事件：分數使用 (1 - P(Yes)) 代表「無衰退」的正向敘事',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/search?_q=recession',
        category: 'Macro',
        slug: 'recession',
        endDate: '2026-12-31',
        markets: [],
        positiveOutcome: 'No'
    },
    {
        id: 'negative_gdp_2026',
        title: '美國負成長風險（2026）',
        description: '風險事件：分數使用 (1 - P(Yes)) 代表「避免負成長」的正向敘事',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-recession-by-end-of-2026?tid=1767092556971',
        category: 'Macro',
        slug: 'gdp',
        endDate: '2026-12-31',
        markets: [],
        positiveOutcome: 'No'
    },
    {
        id: 'gov_funding_lapse_jan31_2026',
        title: '美國政府停擺/斷糧風險（至 2026-01-31）',
        description: '風險事件：分數使用 (1 - P(Yes)) 代表「政府正常運作」的正向敘事',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/search?_q=funding%20lapse',
        category: 'Political',
        slug: 'shutdown',
        endDate: '2026-01-31',
        markets: [],
        positiveOutcome: 'No'
    },
    {
        id: 'us_default_by_2027',
        title: '美債違約風險（至 2027）',
        description: '風險事件：分數使用 (1 - P(Yes)) 代表「不違約」的正向敘事',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-defaults-on-debt-by-2027',
        category: 'Political',
        slug: 'default',
        endDate: '2026-12-31',
        markets: [],
        positiveOutcome: 'No'
    },
    {
        id: 'us_btc_reserve_before_2027',
        title: '美國比特幣戰略儲備（至 2027）',
        description: '正向事件：分數使用 P(Yes) 代表「主權採用」的正向敘事',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-national-bitcoin-reserve-before-2027',
        category: 'Structural',
        slug: 'reserve',
        endDate: '2026-12-31',
        markets: [],
        positiveOutcome: 'Yes'
    },
    {
        id: 'us_bank_failure_by_mar31_2026',
        title: '美國銀行倒閉風險（至 2026-03-31）',
        description: '風險事件：分數使用 (1 - P(Yes)) 代表「金融穩定」的正向敘事',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/search?_q=bank%20failure',
        category: 'Macro',
        slug: 'bank',
        endDate: '2026-03-31',
        markets: [],
        positiveOutcome: 'No'
    }
];

// Impact weights for score calculation
export const IMPACT_WEIGHTS: Record<string, number> = {
    'fed_decision_series': 0.8,
    'us_recession_end_2026': 1.0,
    // negative_gdp_2026 removed
    'gov_funding_lapse_jan31_2026': 1.0,
    'us_default_by_2027': 1.0,
    'us_btc_reserve_before_2027': 1.0,
    'us_bank_failure_by_mar31_2026': 1.0,
};

// Parse all outcome prices from API response
export const parseOutcomePrices = (market: any): { outcomes: string[], prices: string[] } => {
    try {
        const outcomes = typeof market.outcomes === 'string'
            ? JSON.parse(market.outcomes)
            : market.outcomes;
        const prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        return { outcomes, prices };
    } catch (e) {
        return { outcomes: [], prices: [] };
    }
};

/**
 * Fetch and unify market data for all signals.
 */
export const fetchUnifiedMarkets = async (
    userTopics: PredictionTopic[]
): Promise<MarketEvent[]> => {
    console.log('[MarketData] Fetching V4 Signals...');

    const baseEvents = [...BELIEVER_SIGNALS];
    const realDataMap = await fetchRealPolymarketData();

    const updatedEvents = baseEvents.map(event => {
        const markets = realDataMap.get(event.id);
        if (!markets || markets.length === 0) return { ...event, markets: [] };

        // 1) Fed decision series: keep best market as-is (multi-outcome)
        if (event.id === 'fed_decision_series') {
            const bestMarket = markets[0];
            const marketItm = bestMarket.markets?.[0];
            return {
                ...event,
                markets: [{
                    id: marketItm?.id || 'fed_best',
                    question: marketItm?.question || bestMarket.title,
                    volume: (bestMarket as any).volume || 'N/A',
                    outcomePrices: marketItm?.outcomePrices || '[]',
                    outcomes: marketItm?.outcomes || '[]'
                }]
            };
        }

        // 2) All other signals: allow aggregation if multiple markets returned,
        // but filter out too-short events and use gentle weighting.
        let totalWeightedProb = 0;
        let totalWeight = 0;

        const now = new Date();
        const filteredMarkets = markets.filter((m: any) => {
            if (!m.endDate) return true; // keep if endDate missing
            const end = new Date(m.endDate);
            const daysToEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return daysToEnd >= 14; // hard rule: ignore too-short events without series
        });

        const usedMarkets = filteredMarkets.length > 0 ? filteredMarkets : markets;

        for (const market of usedMarkets) {
            // "BTC-positive probability" (0..1)
            const prob = getPositiveProbability(event.id, market);

            // Gentle weighting: nearer is slightly more important, not dominating
            let weight = 1;
            if (market.endDate) {
                const end = new Date(market.endDate);
                const daysToEnd = Math.max(1, (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                weight = 1 / Math.sqrt(daysToEnd);
            }

            totalWeightedProb += prob * weight;
            totalWeight += weight;
        }

        const aggregatedProb = totalWeight > 0 ? totalWeightedProb / totalWeight : 0;

        // Store aggregated BTC-positive probability as a standardized binary market for display/store
        return {
            ...event,
            markets: [{
                id: 'aggregated_' + event.id,
                question: `${event.title} (Aggregated)`,
                volume: 'Aggregated',
                outcomePrices: JSON.stringify([aggregatedProb.toFixed(4), (1 - aggregatedProb).toFixed(4)]),
                outcomes: JSON.stringify(['Yes', 'No'])
            }]
        };
    });

    return updatedEvents.filter(e => e.markets && e.markets.length > 0);
};

export const getEventProbability = (event: MarketEvent): number => {
    if (!event.markets || event.markets.length === 0) return 0;
    try {
        // For aggregated markets, price[0] is the P(Event)
        const prices = JSON.parse(event.markets[0].outcomePrices as string);
        return parseFloat(prices[0]) || 0;
    } catch {
        return 0;
    }
};

// Calculate weighted impact score for a belief
export const getImpactScore = (eventId: string, probability: number): number => {
    const weight = IMPACT_WEIGHTS[eventId] || 0.5;
    // Probability passed in is standardized as BTC-positive probability (0..1)
    return probability * weight * 100;
};

/**
 * getPositiveProbability()
 * Returns standardized "BTC-positive probability" (0..1).
 * - Fed (multi-outcome): P_cut = sum of decrease/cut outcomes
 * - Risk events (recession/gdp/shutdown/default/bank failure): 1 - P(Yes)
 * - Positive structural event (btc reserve): P(Yes)
 */
export const getPositiveProbability = (signalId: string, market: any): number => {
    if (!market?.outcomePrices || !market?.outcomes) return 0;

    const prices = typeof market.outcomePrices === 'string'
        ? JSON.parse(market.outcomePrices)
        : market.outcomePrices;
    const outcomes: string[] = typeof market.outcomes === 'string'
        ? JSON.parse(market.outcomes)
        : market.outcomes;

    // 1) Fed decision series (non-binary): P_cut
    if (signalId === 'fed_decision_series') {
        let cutSum = 0;
        outcomes.forEach((outcome, idx) => {
            const lower = outcome.toLowerCase();
            if (lower.includes('decrease') || lower.includes('cut') || lower.includes('bps decrease')) {
                cutSum += parseFloat(prices[idx]) || 0;
            }
        });
        return Math.min(1, cutSum);
    }

    const yesIdx = outcomes.findIndex(o => o.toLowerCase() === 'yes');
    const pYes = yesIdx >= 0 ? (parseFloat(prices[yesIdx]) || 0) : (parseFloat(prices[0]) || 0);

    // 2) Risk events: return (1 - P_yes)
    if ([
        'us_recession_end_2026',
        'gov_funding_lapse_jan31_2026',
        'us_default_by_2027',
        'us_bank_failure_by_mar31_2026'
    ].includes(signalId)) {
        return Math.max(0, Math.min(1, 1 - pYes));
    }

    // 3) Positive structural event: return P_yes
    const p = yesIdx >= 0 ? (parseFloat(prices[yesIdx]) || 0) : (parseFloat(prices[0]) || 0);
    return Math.max(0, Math.min(1, p));
};
