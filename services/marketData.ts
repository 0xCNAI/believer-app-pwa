import { MarketEvent } from './polymarket';
import { fetchRealPolymarketData } from './realApi';
import { PredictionTopic } from '@/stores/userStore';

export { MarketEvent };

export type EventCategory = 'Macro' | 'Structural' | 'Political' | 'Narrative';

/**
 * BELIEVER SIGNALS - V3.4 (Aggregated Timeframes)
 * 
 * Generic signals that aggregate markets across timeframes (2025, 2026).
 * Weighted by time-to-expiration.
 */
export const BELIEVER_SIGNALS: MarketEvent[] = [
    // Monetary Policy (Fed)
    {
        id: 'fed_policy_risk', // Aggregates Rate Path + Emergency Cut
        title: 'Fed 政策風險路徑',
        description: '綜合考量利率決策與緊急降息風險，反映流動性預期',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/fed-decision-in-january',
        category: 'Macro',
        slug: 'fed',
        endDate: '2025-12-31',
        markets: []
    },
    // Macro Downturn (Recession)
    {
        id: 'us_recession_risk', // Aggregates 2025 + 2026
        title: '美國衰退風險 (綜合)',
        description: '綜合 2025 與 2026 衰退機率，權重偏向近期風險',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-recession-in-2025',
        category: 'Macro',
        slug: 'recession',
        endDate: '2026-12-31',
        markets: []
    },
    // Fiscal / Credit
    {
        id: 'us_debt_risk', // Aggregates Default + Shutdown?
        title: '美債/財政信用風險',
        description: '綜合美債違約與財政壓力，反映系統性信用風險',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-defaults-on-debt-by-2027',
        category: 'Political',
        slug: 'debt',
        endDate: '2026-12-31',
        markets: []
    },
    // Sovereign BTC
    {
        id: 'sovereign_btc_adoption',
        title: '主權級 BTC 採用',
        description: '美國戰略儲備與主權採用預期',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-national-bitcoin-reserve-before-2027',
        category: 'Structural',
        slug: 'reserve',
        endDate: '2026-12-31',
        markets: []
    }
];

// Impact weights for score calculation
export const IMPACT_WEIGHTS: Record<string, number> = {
    'fed_policy_risk': 0.8,
    'us_recession_risk': 1.0,
    'us_debt_risk': 1.0,
    'sovereign_btc_adoption': 1.0,
};

// Parse all outcome prices from API response
const parseOutcomePrices = (market: any): { outcomes: string[]; prices: number[] } => {
    try {
        const prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices || [];

        const outcomes = typeof market.outcomes === 'string'
            ? JSON.parse(market.outcomes)
            : market.outcomes || [];

        if (Array.isArray(prices) && prices.length > 0) {
            return {
                outcomes: outcomes.length > 0 ? outcomes : prices.map((_: any, i: number) => `選項 ${i + 1}`),
                prices: prices.map((p: any) => parseFloat(p) || 0)
            };
        }
    } catch (e) { }
    return { outcomes: ['Yes', 'No'], prices: [0, 0] };
};

export const fetchUnifiedMarkets = async (
    experience?: any,
    topics?: any[]
): Promise<MarketEvent[]> => {
    console.log('[MarketData] Fetching V2 Signals...');

    const baseEvents = [...BELIEVER_SIGNALS];
    const realDataMap = await fetchRealPolymarketData();

    const updatedEvents = baseEvents.map(event => {
        const markets = realDataMap.get(event.id);
        if (!markets || markets.length === 0) return { ...event, markets: [] };

        // 1. Fed Policy: Best ID Only (Don't aggregate across different meetings)
        if (event.id === 'fed_policy_risk') {
            const bestMarket = markets[0];
            return {
                ...event,
                markets: [{
                    id: bestMarket.id || 'fed_best',
                    question: bestMarket.title,
                    volume: (bestMarket as any).volume || 'N/A',
                    outcomePrices: bestMarket.outcomePrices, // Keep original JSON string
                    outcomes: bestMarket.outcomes // Keep original JSON string
                }]
            };
        }

        // 2. Risk Signals: Time-Weighted Aggregation (2025 + 2026)
        // W = 1 / DaysToEnd (Nearer term = Higher weight)
        let totalWeightedProb = 0;
        let totalWeight = 0;
        const validMarkets = [];

        // Pre-calculate probability for each market
        for (const market of markets) {
            if (!market.endDate) continue;

            // Calculate raw P(Yes) or P(Risk)
            const prob = getPositiveProbability(event.id, market);

            // Calculate Weight
            const end = new Date(market.endDate);
            const now = new Date();
            const daysToEnd = Math.max(1, (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const weight = 1000 / daysToEnd; // Scale up for readability

            totalWeightedProb += prob * weight;
            totalWeight += weight;

            validMarkets.push({
                ...market,
                derivedProb: prob,
                weight
            });
        }

        const aggregatedProb = totalWeight > 0 ? totalWeightedProb / totalWeight : 0;
        const bestMarket = markets[0]; // Use best market for title/metadata

        // Store aggregated probability as a "Yes" outcome for display
        return {
            ...event,
            markets: [{
                id: 'aggregated_' + event.id,
                question: `${event.title} (Aggregated)`,
                volume: 'Aggregated',
                outcomePrices: JSON.stringify([aggregatedProb.toFixed(4), (1 - aggregatedProb).toFixed(4)]),
                outcomes: JSON.stringify(['Yes', 'No']) // Standardized Binary
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
    // Note: In V3.5, PROBABILITY IS ALREADY "RISK PROBABILITY" for risk events
    // because fetchUnifiedMarkets uses getPositiveProbability/aggregation which handles the inverse logic.
    // However, beliefStore usually stores the RAW P(Yes).
    // Let's ensure standard behavior:
    // If we stored Aggregated P(Yes) -> Score = P * Weight.
    // BUT for "Recession", P(Yes) is Bad.

    // Check if the probability passed in is "Positive for Crypto" or "Risk Event Probability"
    // Our aggregation logic returns P(Risk). 
    // Impact Score should differ based on "Good" (BTC) vs "Bad" (Recession).

    // Risk Events (Higher Prob = Higher Impact Score? No, Higher Prob = Bad Impact?)
    // This function usually returns "Impact Magnitude" or "Belief Score"?
    // "Belief Score" usually means "Strength of Belief".
    // If Belief is "Recession Risk", score 100 = High Recession Risk.

    return probability * weight * 100;
};

/**
 * Calculate "positive probability" (or Target Probability) based on signal type.
 * STRICT RULES (V3.5):
 * - Fed: Sum of 'cut'/'decrease'
 * - Recession/Debt: P(Yes) (This represents P(Risk))
 * - BTC: P(Yes)
 */
export const getPositiveProbability = (signalId: string, market: any): number => {
    if (!market?.outcomePrices || !market?.outcomes) return 0;

    const prices = typeof market.outcomePrices === 'string'
        ? JSON.parse(market.outcomePrices)
        : market.outcomePrices;
    const outcomes: string[] = typeof market.outcomes === 'string'
        ? JSON.parse(market.outcomes)
        : market.outcomes;

    // 1. Fed Policy Risk (Multi-Outcome)
    // STRICT RULE: Sum of Cut/Decrease outcomes only
    if (signalId === 'fed_policy_risk' || signalId === 'fed_decision_series') {
        let cutSum = 0;
        outcomes.forEach((outcome, idx) => {
            const lower = outcome.toLowerCase();
            // Cut keywords: decrease, cut
            if (lower.includes('decrease') || lower.includes('cut') || lower.includes('bps decrease')) {
                cutSum += parseFloat(prices[idx]) || 0;
            }
        });
        return Math.min(1, cutSum);
    }

    // 2. Risk Signals (Recession, Debt)
    // Return P(Yes) = P(Risk)
    // Note: getImpactScore will handle if this is "Bad", but here we just return the probability of the event happening.
    if (['us_recession_risk', 'us_debt_risk', 'us_recession_2025', 'us_default_by_2027'].includes(signalId)) {
        // Find "Yes"
        const yesIdx = outcomes.findIndex(o => o.toLowerCase() === 'yes');
        // If Yes exists, return it. If not, default to first (Polymarket standard)
        return yesIdx >= 0 ? parseFloat(prices[yesIdx]) || 0 : parseFloat(prices[0]) || 0;
    }

    // 3. Positive Signals (BTC)
    // Return P(Yes)
    const yesIdx = outcomes.findIndex(o => o.toLowerCase() === 'yes');
    return yesIdx >= 0 ? parseFloat(prices[yesIdx]) || 0 : parseFloat(prices[0]) || 0;
};
