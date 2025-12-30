import { MarketEvent } from './polymarket';
import { fetchRealPolymarketData } from './realApi';
import { PredictionTopic } from '@/stores/userStore';

export { MarketEvent };

export type EventCategory = 'Macro' | 'Structural' | 'Political' | 'Narrative';

/**
 * BELIEVER SIGNALS - V3.3 (Polymarket Aligned)
 * 
 * 5 core signals matching actual Polymarket markets:
 * - Fed rate decisions (series)
 * - US recession 2025
 * - US default/debt
 * - BTC reserve
 * - Fed emergency cut (bonus)
 */
export const BELIEVER_SIGNALS: MarketEvent[] = [
    // Monetary Policy (Fed)
    {
        id: 'fed_decision_series',
        title: 'Fed 利率決策路徑',
        description: '聯準會降息路徑影響流動性，利好風險資產',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/fed-decision-in-january',
        category: 'Macro',
        slug: 'fed',
        endDate: '2025-12-31',
        markets: []
    },
    // Macro Downturn - Use 2025 version
    {
        id: 'us_recession_2025',
        title: '美國衰退風險 (2025)',
        description: '經濟衰退導致風險資產拋售，對加密市場負面影響',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-recession-in-2025',
        category: 'Macro',
        slug: 'recession',
        endDate: '2025-12-31',
        markets: []
    },
    // Fiscal / Credit
    {
        id: 'us_default_by_2027',
        title: '美債違約風險',
        description: '美國債務違約將引發系統性風險，影響避險資產配置',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-defaults-on-debt-by-2027',
        category: 'Political',
        slug: 'default',
        endDate: '2026-12-31',
        markets: []
    },
    // Sovereign BTC
    {
        id: 'us_btc_reserve_before_2027',
        title: '美國比特幣戰略儲備',
        description: '主權國家採納 BTC 為戰略資產，結構性利多',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-national-bitcoin-reserve-before-2027',
        category: 'Structural',
        slug: 'reserve',
        endDate: '2026-12-31',
        markets: []
    },
    // Bonus: Fed Emergency Cut
    {
        id: 'fed_emergency_cut_2025',
        title: 'Fed 緊急降息',
        description: '緊急降息表示經濟放緩，短期利好風險資產',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/fed-emergency-rate-cut-in-2025',
        category: 'Macro',
        slug: 'emergency',
        endDate: '2025-12-31',
        markets: []
    }
];

// Impact weights for score calculation
export const IMPACT_WEIGHTS: Record<string, number> = {
    'fed_decision_series': 0.7,
    'us_recession_2025': 1.0,
    'us_default_by_2027': 1.0,
    'us_btc_reserve_before_2027': 1.0,
    'fed_emergency_cut_2025': 0.6,
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
                outcomePrices: JSON.stringify(prices.map(p => Number(p.toFixed(4)))),
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
    // For inverse events, higher prob = negative impact
    const inverseEvents = [
        'us_recession_2025',
        'us_default_by_2027'
    ];
    if (inverseEvents.includes(eventId)) {
        return (1 - probability) * weight * 100;
    }
    return probability * weight * 100;
};

/**
 * Calculate "positive probability" based on signal type.
 * Rules (locked):
 * - Fed decisions: Sum of all "decrease/cut" outcomes
 * - Recession/GDP/Lapse/Default/Bank: 1 - P(Yes)
 * - BTC Reserve: P(Yes)
 */
export const getPositiveProbability = (signalId: string, market: any): number => {
    if (!market?.outcomePrices || !market?.outcomes) return 0;

    const prices = typeof market.outcomePrices === 'string'
        ? JSON.parse(market.outcomePrices)
        : market.outcomePrices;
    const outcomes: string[] = typeof market.outcomes === 'string'
        ? JSON.parse(market.outcomes)
        : market.outcomes;

    // Fed decisions: Sum decrease/cut outcomes
    if (signalId.startsWith('fed_')) {
        let decreaseSum = 0;
        outcomes.forEach((outcome, idx) => {
            const lower = outcome.toLowerCase();
            if (lower.includes('decrease') || lower.includes('cut') || lower.includes('bps decrease')) {
                decreaseSum += parseFloat(prices[idx]) || 0;
            }
        });
        return Math.min(1, decreaseSum);
    }

    // Inverse signals: 1 - P(Yes)
    const inverseSignals = [
        'us_recession_2025',
        'us_default_by_2027'
    ];
    if (inverseSignals.includes(signalId)) {
        // Find "Yes" outcome
        const yesIdx = outcomes.findIndex(o => o.toLowerCase() === 'yes');
        if (yesIdx >= 0) {
            return 1 - (parseFloat(prices[yesIdx]) || 0);
        }
        return 1 - (parseFloat(prices[0]) || 0);
    }

    // Positive signals: P(Yes) = first outcome or Yes outcome
    if (signalId === 'us_btc_reserve_before_2027') {
        const yesIdx = outcomes.findIndex(o => o.toLowerCase() === 'yes');
        return yesIdx >= 0 ? parseFloat(prices[yesIdx]) || 0 : parseFloat(prices[0]) || 0;
    }

    // Default: first outcome
    return parseFloat(prices[0]) || 0;
};
