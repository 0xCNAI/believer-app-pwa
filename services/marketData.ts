import { MarketEvent } from './polymarket';
export { MarketEvent };

export type EventCategory = 'Macro' | 'Political' | 'Narrative';

/**
 * BELIEVER SIGNALS - 8 Prediction Market Topics Only
 * 
 * 敘事層唯一接受「市場化預期」，不接受數據、指標、價格或主觀判斷。
 * Source: Polymarket / Kalshi only
 */
export const BELIEVER_SIGNALS: MarketEvent[] = [
    // ============================================
    // Topic 1: Fed Rate Cuts Expectation (聯準會降息預期)
    // ============================================
    {
        id: 'macro_rate_cut',
        title: '聯準會降息預期',
        description: 'Fed 利率決策、降息時機與次數',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/fed-rate-decision',
        category: 'Macro',
        slug: 'fed-rate',
        markets: [{
            id: 'm1',
            question: 'Will the Federal Reserve cut interest rates in 2025?',
            outcomePrices: JSON.stringify(["0.65", "0.35"]) as any,
            volume: "High",
            outcomes: ["Yes", "No"]
        }]
    },

    // ============================================
    // Topic 2: Yield Curve Outlook (殖利率曲線轉向預期)
    // ============================================
    {
        id: 'macro_yield_curve',
        title: '殖利率曲線轉向預期',
        description: '倒掛解除、曲線正常化',
        source: 'Kalshi',
        sourceUrl: 'https://kalshi.com/markets/yield-curve',
        category: 'Macro',
        slug: 'yield-curve',
        markets: [{
            id: 'm2',
            question: 'Will the U.S. yield curve uninvert by end of 2025?',
            outcomePrices: JSON.stringify(["0.55", "0.45"]) as any,
            volume: "Active",
            outcomes: ["Yes", "No"]
        }]
    },

    // ============================================
    // Topic 3: U.S. Crypto Regulation (美國加密監管與法案進展)
    // ============================================
    {
        id: 'pol_regulation',
        title: '美國加密監管與法案進展',
        description: '國會法案、SEC 訴訟結果',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/crypto-legislation',
        category: 'Political',
        slug: 'crypto-regulation',
        markets: [{
            id: 'p1',
            question: 'Will major U.S. crypto legislation pass in 2025?',
            outcomePrices: JSON.stringify(["0.40", "0.60"]) as any,
            volume: "Active",
            outcomes: ["Yes", "No"]
        }]
    },

    // ============================================
    // Topic 4: U.S. Bitcoin Strategic Reserve (美國比特幣戰略儲備)
    // ============================================
    {
        id: 'pol_btc_reserve',
        title: '美國比特幣戰略儲備',
        description: '國家級 BTC 儲備政策',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-bitcoin-reserve',
        category: 'Political',
        slug: 'btc-reserve',
        markets: [{
            id: 'p2',
            question: 'Will the U.S. establish a Bitcoin strategic reserve?',
            outcomePrices: JSON.stringify(["0.35", "0.65"]) as any,
            volume: "High",
            outcomes: ["Yes", "No"]
        }]
    },

    // ============================================
    // Topic 5: Pro-Crypto Political Outcome (親加密政治結果)
    // ============================================
    {
        id: 'pol_pro_crypto',
        title: '親加密政治結果',
        description: '選舉、政權更替對加密的影響',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/pro-crypto-politics',
        category: 'Political',
        slug: 'pro-crypto-pol',
        markets: [{
            id: 'p3',
            question: 'Will the next U.S. administration be pro-crypto?',
            outcomePrices: JSON.stringify(["0.70", "0.30"]) as any,
            volume: "Very High",
            outcomes: ["Yes", "No"]
        }]
    },

    // ============================================
    // Topic 6: ETH Spot ETF Approval (ETH 現貨 ETF 預期)
    // ============================================
    {
        id: 'narrative_eth_etf',
        title: 'ETH 現貨 ETF 預期',
        description: 'SEC 批准 ETH 現貨 ETF',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/eth-spot-etf',
        category: 'Narrative',
        slug: 'eth-etf',
        markets: [{
            id: 'n1',
            question: 'Will an ETH spot ETF be approved in 2025?',
            outcomePrices: JSON.stringify(["0.85", "0.15"]) as any,
            volume: "High",
            outcomes: ["Yes", "No"]
        }]
    },

    // ============================================
    // Topic 7: Institutional Crypto Adoption (機構級加密採用)
    // ============================================
    {
        id: 'narrative_institutional',
        title: '機構級加密採用',
        description: '銀行託管、機構產品擴展',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/institutional-crypto',
        category: 'Narrative',
        slug: 'institutional',
        markets: [{
            id: 'n2',
            question: 'Will major U.S. banks offer crypto custody services?',
            outcomePrices: JSON.stringify(["0.50", "0.50"]) as any,
            volume: "Active",
            outcomes: ["Yes", "No"]
        }]
    },

    // ============================================
    // Topic 8: Systemic Financial Risk (系統性金融風險事件)
    // ============================================
    {
        id: 'narrative_systemic_risk',
        title: '系統性金融風險事件',
        description: '銀行倒閉、政府停擺、金融危機',
        source: 'Kalshi',
        sourceUrl: 'https://kalshi.com/markets/financial-crisis',
        category: 'Narrative',
        slug: 'systemic-risk',
        markets: [{
            id: 'n3',
            question: 'Will a major U.S. bank fail in 2025?',
            outcomePrices: JSON.stringify(["0.15", "0.85"]) as any,
            volume: "Active",
            outcomes: ["Yes", "No"]
        }]
    },
];

import { ExperienceLevel, PredictionTopic } from '@/stores/userStore';
import { fetchRealPolymarketData, fetchBtcDominance, fetchFearGreedIndex } from './realApi';

// Helper to extract probability from Polymarket market
const extractProbability = (market: any): number => {
    try {
        if (market.markets && market.markets.length > 0) {
            const prices = market.markets[0].outcomePrices;
            if (typeof prices === 'string') {
                const parsed = JSON.parse(prices);
                return parseFloat(parsed[0]) || 0.5;
            }
            if (Array.isArray(prices)) {
                return parseFloat(prices[0]) || 0.5;
            }
        }
    } catch (e) { }
    return 0.5;
};

export const fetchUnifiedMarkets = async (
    experience?: ExperienceLevel | null,
    topics?: PredictionTopic[]
): Promise<MarketEvent[]> => {
    console.log('[MarketData] Fetching with prefs:', { experience, topics });

    // Start with all 8 signals
    let events = [...BELIEVER_SIGNALS];

    try {
        // Fetch real Polymarket data
        const realPolymarkets = await fetchRealPolymarketData();

        console.log('[MarketData] Got real Polymarket data:', realPolymarkets.size, 'markets');

        // Update events with real data where available
        events = events.map(event => {
            // Fed rate market
            if (event.id === 'macro_rate_cut' && realPolymarkets.has('fed_rate')) {
                const realData = realPolymarkets.get('fed_rate')!;
                const prob = extractProbability(realData);
                return {
                    ...event,
                    title: realData.title || event.title,
                    markets: [{
                        ...event.markets[0],
                        question: realData.markets?.[0]?.question || event.markets[0]?.question,
                        outcomePrices: JSON.stringify([prob.toString(), (1 - prob).toString()]) as any,
                    }]
                };
            }

            // BTC strategic reserve
            if (event.id === 'pol_btc_reserve' && realPolymarkets.has('btc_reserve')) {
                const realData = realPolymarkets.get('btc_reserve')!;
                const prob = extractProbability(realData);
                return {
                    ...event,
                    title: realData.title || event.title,
                    markets: [{
                        ...event.markets[0],
                        question: realData.markets?.[0]?.question || event.markets[0]?.question,
                        outcomePrices: JSON.stringify([prob.toString(), (1 - prob).toString()]) as any,
                    }]
                };
            }

            // Crypto legislation
            if (event.id === 'pol_regulation' && realPolymarkets.has('crypto_bill')) {
                const realData = realPolymarkets.get('crypto_bill')!;
                const prob = extractProbability(realData);
                return {
                    ...event,
                    title: realData.title || event.title,
                    markets: [{
                        ...event.markets[0],
                        question: realData.markets?.[0]?.question || event.markets[0]?.question,
                        outcomePrices: JSON.stringify([prob.toString(), (1 - prob).toString()]) as any,
                    }]
                };
            }

            // ETH ETF
            if (event.id === 'narrative_eth_etf' && realPolymarkets.has('eth_etf')) {
                const realData = realPolymarkets.get('eth_etf')!;
                const prob = extractProbability(realData);
                return {
                    ...event,
                    title: realData.title || event.title,
                    markets: [{
                        ...event.markets[0],
                        question: realData.markets?.[0]?.question || event.markets[0]?.question,
                        outcomePrices: JSON.stringify([prob.toString(), (1 - prob).toString()]) as any,
                    }]
                };
            }

            return event;
        });

    } catch (error) {
        console.error('[MarketData] Error fetching real data:', error);
    }

    // Filter by selected topics if provided
    if (topics && topics.length > 0) {
        const topicToIds: Record<PredictionTopic, string[]> = {
            'fed_rate': ['macro_rate_cut'],
            'yield_curve': ['macro_yield_curve'],
            'crypto_regulation': ['pol_regulation'],
            'btc_reserve': ['pol_btc_reserve'],
            'pro_crypto_pol': ['pol_pro_crypto'],
            'eth_etf': ['narrative_eth_etf'],
            'institutional': ['narrative_institutional'],
            'systemic_risk': ['narrative_systemic_risk'],
        };

        const selectedIds = new Set(topics.flatMap(t => topicToIds[t] || []));

        // Sort: selected topics first
        events = events.sort((a, b) => {
            const aMatch = selectedIds.has(a.id);
            const bMatch = selectedIds.has(b.id);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
        });
    }

    return events;
};

// Helper function to get event probability
export const getEventProbability = (event: MarketEvent): number => {
    if (!event.markets || event.markets.length === 0) return 0.5;
    const market = event.markets[0];
    try {
        const prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        return parseFloat(prices[0]) || 0.5;
    } catch {
        return 0.5;
    }
};
