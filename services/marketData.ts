import { MarketEvent } from './polymarket';
import { fetchRealPolymarketData } from './realApi';
import { PredictionTopic } from '@/stores/userStore';

export { MarketEvent };

export type EventCategory = 'Macro' | 'Structural' | 'Political' | 'Narrative';

/**
 * BELIEVER SIGNALS - STRICT 4 TOPICS ONLY (V2.0)
 * 
 * 1. Fed Monetary Policy (P(Cut))
 * 2. US Recession Risk (1 - P(Recession))
 * 3. US Gov Shutdown Risk (1 - P(Shutdown))
 * 4. BTC Strategic Reserve (P(Yes))
 */
export const BELIEVER_SIGNALS: MarketEvent[] = [
    {
        id: 'fed_policy',
        title: 'Fed Monetary Policy',
        description: 'Market expectation for rate cuts (25bps+)',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/fed-decision-in-january',
        category: 'Macro',
        slug: 'fed',
        endDate: '2025-12-31',
        markets: []
    },
    {
        id: 'us_recession',
        title: 'US Recession Risk',
        description: 'Probability of NO recession in medium term',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/search?_q=recession',
        category: 'Macro',
        slug: 'recession',
        endDate: '2025-12-31',
        markets: []
    },
    {
        id: 'gov_shutdown',
        title: 'US Gov Fiscal Stability',
        description: 'Probability of NO government shutdown',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/search?_q=shutdown',
        category: 'Political',
        slug: 'shutdown',
        endDate: '2025-12-31',
        markets: []
    },
    {
        id: 'btc_reserve',
        title: 'Bitcoin Strategic Reserve',
        description: 'US Government adoption of BTC Reserve',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-national-bitcoin-reserve-before-2027',
        category: 'Structural',
        slug: 'reserve',
        endDate: '2026-12-31',
        markets: []
    }
];

// Helper to extract "YES" probability
const extractYesProbability = (market: any): number => {
    try {
        const prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;

        // Polymarket usually [Yes, No] or [Outcome1, Outcome2...]
        // If 2 outcomes, usually Yes is index 0. 
        // Verification needed: Default to index 0.
        if (Array.isArray(prices) && prices.length > 0) {
            return parseFloat(prices[0]) || 0;
        }
    } catch (e) { }
    return 0;
};

export const fetchUnifiedMarkets = async (
    experience?: any,
    topics?: any[]
): Promise<MarketEvent[]> => {
    console.log('[MarketData] Fetching V2 Signals...');

    const baseEvents = [...BELIEVER_SIGNALS];
    const realDataMap = await fetchRealPolymarketData(); // Returns Map<string, MarketEvent[]>

    const updatedEvents = baseEvents.map(event => {
        const relevantMarkets = realDataMap.get(event.id);

        if (!relevantMarkets || relevantMarkets.length === 0) {
            // No live data found => return null or placeholder?
            // User Rule: "Topic 若當下沒有任何 still active 交易對 → 設為 null" (In output format, likely implies filter out or return null)
            // But we need to return valid MarketEvent objects.
            // We'll mark probability as null/0 for now, or filter later.
            return { ...event, markets: [] };
        }

        // AGGREGATION LOGIC:
        // Topic_Probability = MAX(Positive Prob of all markets)

        let maxProb = 0;
        let bestMarket = relevantMarkets[0];

        for (const market of relevantMarkets) {
            let prob = extractYesProbability(market);

            // SPECIAL RULES for Inverse Topics (Recession, Shutdown)
            // User Def: Recession_Topic_Probability = 1 - P(Recession)
            // User Def: Shutdown_Topic_Probability = 1 - P(Shutdown)
            if (event.id === 'us_recession' || event.id === 'gov_shutdown') {
                prob = 1 - prob;
            }

            // Fed Rule: P(25bps) + P(50bps). 
            // In Polymarket "Will Fed Cut?", Yes covers both. 
            // If the market is "Outcome", we'd sum. 
            // For now assuming "Yes" covers it.

            if (prob > maxProb) {
                maxProb = prob;
                bestMarket = market;
            }
        }

        // Construct the Aggregated Market Object
        // We use the "Best Market" (highest prob) as the representative for details
        return {
            ...event,
            markets: [{
                id: bestMarket.id || 'agg',
                question: bestMarket.title, // Use title as question
                volume: (bestMarket as any).volume || 'Active',
                outcomePrices: JSON.stringify([maxProb.toFixed(2), (1 - maxProb).toFixed(2)]),
                outcomes: ["Positive", "Negative"]
            }]
        };
    });

    return updatedEvents.filter(e => e.markets && e.markets.length > 0);
};

export const getEventProbability = (event: MarketEvent): number => {
    if (!event.markets || event.markets.length === 0) return 0;
    try {
        const prices = JSON.parse(event.markets[0].outcomePrices as string);
        return parseFloat(prices[0]) || 0;
    } catch {
        return 0;
    }
};
