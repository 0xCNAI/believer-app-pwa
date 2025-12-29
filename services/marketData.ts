import { MarketEvent } from './polymarket';
import { fetchRealPolymarketData } from './realApi';
import { PredictionTopic } from '@/stores/userStore';

export { MarketEvent };

export type EventCategory = 'Macro' | 'Structural' | 'Political' | 'Narrative';

/**
 * BELIEVER SIGNALS - STRICT 4 TOPICS ONLY (V2.0)
 * 
 * description: 說明此事件對加密市場的影響方式
 * impactWeight: 影響程度權重 (0.5 = 中等, 1 = 高)
 */
export const BELIEVER_SIGNALS: MarketEvent[] = [
    {
        id: 'fed_policy',
        title: '聯準會降息預期',
        description: '降息通常利好風險資產，對加密市場有正面影響',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/fed-decision-in-january',
        category: 'Macro',
        slug: 'fed',
        endDate: '2025-12-31',
        markets: []
    },
    {
        id: 'us_recession',
        title: '美國衰退風險',
        description: '經濟衰退可能導致風險資產拋售，對加密市場有負面影響',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/search?_q=recession',
        category: 'Macro',
        slug: 'recession',
        endDate: '2025-12-31',
        markets: []
    },
    {
        id: 'gov_shutdown',
        title: '美國財政穩定性',
        description: '政府停擺增加市場不確定性，可能影響短期波動',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/search?_q=shutdown',
        category: 'Political',
        slug: 'shutdown',
        endDate: '2025-12-31',
        markets: []
    },
    {
        id: 'btc_reserve',
        title: '比特幣戰略儲備',
        description: '國家級採納 BTC 為戰略資產，對加密市場有極大正面影響',
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
    'fed_policy': 0.7,      // Medium-high impact
    'us_recession': 1.0,    // High negative impact (inverted)
    'gov_shutdown': 0.5,    // Medium impact (inverted)
    'btc_reserve': 1.0,     // Highest positive impact
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
        const relevantMarkets = realDataMap.get(event.id);

        if (!relevantMarkets || relevantMarkets.length === 0) {
            return { ...event, markets: [] };
        }

        // Find the most relevant market (highest volume or first)
        const bestMarket = relevantMarkets[0];

        // Parse outcomes from API (keep original outcomes/prices)
        const { outcomes, prices } = parseOutcomePrices(bestMarket);

        // Construct the Market Object with ORIGINAL outcomes
        return {
            ...event,
            markets: [{
                id: bestMarket.id || 'agg',
                question: (bestMarket as any).title || (bestMarket as any).question || event.title,
                volume: (bestMarket as any).volume || (bestMarket as any).volumeNum || 'N/A',
                outcomePrices: JSON.stringify(prices.map(p => (p * 100).toFixed(1))),
                outcomes: outcomes
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

// Calculate weighted impact score for a belief
export const getImpactScore = (eventId: string, probability: number): number => {
    const weight = IMPACT_WEIGHTS[eventId] || 0.5;
    // For inverse events (recession, shutdown), higher prob = negative impact
    if (eventId === 'us_recession' || eventId === 'gov_shutdown') {
        return (1 - probability) * weight * 100;
    }
    return probability * weight * 100;
};

