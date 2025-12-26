import { MarketEvent } from './polymarket';
export { MarketEvent };

export type EventCategory = 'Macro' | 'Liquidity' | 'Risk' | 'Supply' | 'Political' | 'Narrative';

// Source types:
// - 'prediction_market': Has real probability data (Polymarket, Kalshi)
// - 'official_data': Government/institutional data (Fed, BLS) - NO probability
// - 'market_data': Live market metrics (DXY, yields) - NO probability
// - 'on_chain': Blockchain data (Glassnode, etc.) - NO probability

export const BELIEVER_SIGNALS: MarketEvent[] = [
    // ============================================
    // MACRO - 宏觀趨勢
    // ============================================

    // 預測市場 - 有真實機率數據
    {
        id: 'macro_rate_cut',
        title: '聯準會降息預期',
        description: '2025年首次降息的市場預期機率',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/fed-rate-decision',
        category: 'Macro',
        slug: 'macro-rate',
        markets: [{
            id: 'm1',
            question: '2025年第一次降息將在何時？',
            outcomePrices: JSON.stringify(["0.65", "0.35"]) as any,
            volume: "High",
            outcomes: ["Q1-Q2", "Q3以後"]
        }]
    },
    {
        id: 'macro_yield_curve',
        title: '殖利率曲線預測',
        description: '2/10年期利差正常化的市場預期',
        source: 'Kalshi',
        sourceUrl: 'https://kalshi.com/markets/yield-curve',
        category: 'Macro',
        slug: 'macro-yield',
        markets: [{
            id: 'm3',
            question: '殖利率曲線是否將在2025年解除倒掛？',
            outcomePrices: JSON.stringify(["0.55", "0.45"]) as any,
            volume: "Active",
            outcomes: ["是", "否"]
        }]
    },

    // 官方數據 - 無機率，只有狀態追蹤
    {
        id: 'macro_inflation',
        title: 'CPI/PCE 通膨數據',
        description: '美國官方通膨數據追蹤（每月發佈）',
        source: 'BLS / BEA',
        sourceUrl: 'https://www.bls.gov/cpi/',
        category: 'Macro',
        slug: 'macro-inflation',
        markets: [] // 官方數據無預測市場
    },

    // ============================================
    // LIQUIDITY - 流動性
    // ============================================

    // 市場數據 - 無機率
    {
        id: 'liq_usd_pressure',
        title: '美元指數 (DXY)',
        description: '美元強弱對風險資產的壓力',
        source: 'TradingView',
        sourceUrl: 'https://www.tradingview.com/symbols/TVC-DXY/',
        category: 'Liquidity',
        slug: 'liq-dxy',
        markets: []
    },
    {
        id: 'liq_global_m2',
        title: '全球 M2 流動性',
        description: '主要央行貨幣供應變化率',
        source: 'FRED',
        sourceUrl: 'https://fred.stlouisfed.org/series/M2SL',
        category: 'Liquidity',
        slug: 'liq-m2',
        markets: []
    },
    {
        id: 'liq_real_rates',
        title: '實質利率 (TIPS)',
        description: '10年期抗通膨債券殖利率',
        source: 'FRED',
        sourceUrl: 'https://fred.stlouisfed.org/series/DFII10',
        category: 'Liquidity',
        slug: 'liq-rates',
        markets: []
    },

    // ============================================
    // RISK - 風險情緒
    // ============================================

    // 市場數據 - 無機率
    {
        id: 'risk_volatility',
        title: 'VIX 恐慌指數',
        description: 'S&P 500 隱含波動率',
        source: 'CBOE',
        sourceUrl: 'https://www.cboe.com/tradable_products/vix/',
        category: 'Risk',
        slug: 'risk-vix',
        markets: []
    },
    {
        id: 'risk_btc_vol',
        title: 'BTC 隱含波動率',
        description: 'Deribit ATM IV 指數',
        source: 'Deribit',
        sourceUrl: 'https://www.deribit.com/statistics/BTC/volatility-index',
        category: 'Risk',
        slug: 'risk-btc-vol',
        markets: []
    },
    {
        id: 'risk_btc_dom',
        title: '比特幣市佔率 (BTC.D)',
        description: 'BTC 在加密貨幣總市值中的占比',
        source: 'TradingView',
        sourceUrl: 'https://www.tradingview.com/symbols/CRYPTOCAP-BTC.D/',
        category: 'Risk',
        slug: 'risk-btc-dom',
        markets: []
    },

    // ============================================
    // SUPPLY - 供給結構 (鏈上數據)
    // ============================================

    // 鏈上數據 - 無機率
    {
        id: 'supply_exchange_flow',
        title: '交易所淨流量',
        description: 'BTC 交易所餘額與淨流出追蹤',
        source: 'Glassnode',
        sourceUrl: 'https://studio.glassnode.com/metrics?m=distribution.ExchangeNetPositionChange',
        category: 'Supply',
        slug: 'supply-exchange',
        markets: []
    },
    {
        id: 'supply_lth',
        title: '長期持有者 (LTH) 供應',
        description: '持幣超過155天的地址餘額變化',
        source: 'Glassnode',
        sourceUrl: 'https://studio.glassnode.com/metrics?m=supply.LTHSum',
        category: 'Supply',
        slug: 'supply-lth',
        markets: []
    },
    {
        id: 'supply_sth',
        title: '短期持有者 (STH) MVRV',
        description: 'STH 未實現盈虧比率',
        source: 'Glassnode',
        sourceUrl: 'https://studio.glassnode.com/metrics?m=market.SthMvrv',
        category: 'Supply',
        slug: 'supply-sth',
        markets: []
    },
    {
        id: 'supply_etf',
        title: 'ETF 資金流向',
        description: '美國現貨 BTC ETF 每日淨流入',
        source: 'SoSoValue',
        sourceUrl: 'https://sosovalue.xyz/assets/etf/us-btc-spot',
        category: 'Supply',
        slug: 'supply-etf',
        markets: []
    },

    // ============================================
    // POLITICAL - 政治與監管
    // ============================================

    // 預測市場 - 有真實機率數據
    {
        id: 'pol_btc_reserve',
        title: '美國戰略比特幣儲備',
        description: '美國是否將建立國家級 BTC 儲備',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/us-bitcoin-reserve',
        category: 'Political',
        slug: 'pol-btc-reserve',
        markets: [{
            id: 'p1',
            question: '美國是否將在2025年建立戰略 BTC 儲備？',
            outcomePrices: JSON.stringify(["0.35", "0.65"]) as any,
            volume: "High",
            outcomes: ["是", "否"]
        }]
    },
    {
        id: 'pol_regulation',
        title: '加密法案進展',
        description: 'FIT21 或其他重大法案通過機率',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/crypto-legislation',
        category: 'Political',
        slug: 'pol-reg',
        markets: [{
            id: 'p2',
            question: '加密法案是否將在2025年通過？',
            outcomePrices: JSON.stringify(["0.40", "0.60"]) as any,
            volume: "Active",
            outcomes: ["通過", "未通過"]
        }]
    },

    // ============================================
    // NARRATIVE - 敘事轉變
    // ============================================

    // 預測市場
    {
        id: 'narrative_btc_100k',
        title: 'BTC 價格里程碑',
        description: 'BTC 是否將達到 $100,000',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/bitcoin-100k',
        category: 'Narrative',
        slug: 'narrative-100k',
        markets: [{
            id: 'n1',
            question: 'BTC 是否將在2025年達到 $100,000？',
            outcomePrices: JSON.stringify(["0.72", "0.28"]) as any,
            volume: "Very High",
            outcomes: ["是", "否"]
        }]
    },
    {
        id: 'narrative_eth_etf',
        title: 'ETH 現貨 ETF 審批',
        description: 'SEC 是否將批准 ETH 現貨 ETF',
        source: 'Polymarket',
        sourceUrl: 'https://polymarket.com/event/eth-spot-etf',
        category: 'Narrative',
        slug: 'narrative-eth-etf',
        markets: [{
            id: 'n2',
            question: 'ETH 現貨 ETF 是否將在2025年獲批？',
            outcomePrices: JSON.stringify(["0.85", "0.15"]) as any,
            volume: "High",
            outcomes: ["獲批", "未獲批"]
        }]
    }
];

import { ExperienceLevel, FocusArea } from '@/stores/userStore';
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
    focusAreas?: FocusArea[]
): Promise<MarketEvent[]> => {
    console.log('[MarketData] Fetching with prefs:', { experience, focusAreas });

    // Start with static signals
    let events = [...BELIEVER_SIGNALS];

    try {
        // Fetch real Polymarket data
        const [realPolymarkets, btcDominance, fearGreed] = await Promise.all([
            fetchRealPolymarketData(),
            fetchBtcDominance(),
            fetchFearGreedIndex(),
        ]);

        console.log('[MarketData] Got real data:', {
            polymarkets: realPolymarkets.size,
            btcDominance,
            fearGreed: fearGreed?.value
        });

        // Update events with real data where available
        events = events.map(event => {
            // Fed rate market
            if (event.id === 'macro_rate_cut' && realPolymarkets.has('fed_rate')) {
                const realData = realPolymarkets.get('fed_rate')!;
                const prob = extractProbability(realData);
                return {
                    ...event,
                    title: realData.title || event.title,
                    description: realData.description || event.description,
                    markets: [{
                        id: realData.id,
                        question: realData.markets?.[0]?.question || event.markets[0]?.question,
                        outcomePrices: JSON.stringify([prob.toString(), (1 - prob).toString()]) as any,
                        volume: realData.markets?.[0]?.volume || "High",
                        outcomes: realData.markets?.[0]?.outcomes || ["Yes", "No"]
                    }]
                };
            }

            // BTC price target
            if (event.id === 'narrative_btc_100k' && realPolymarkets.has('btc_price')) {
                const realData = realPolymarkets.get('btc_price')!;
                const prob = extractProbability(realData);
                return {
                    ...event,
                    title: realData.title || event.title,
                    description: realData.description || event.description,
                    markets: [{
                        id: realData.id,
                        question: realData.markets?.[0]?.question || event.markets[0]?.question,
                        outcomePrices: JSON.stringify([prob.toString(), (1 - prob).toString()]) as any,
                        volume: realData.markets?.[0]?.volume || "Very High",
                        outcomes: realData.markets?.[0]?.outcomes || ["Yes", "No"]
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
                    description: realData.description || event.description,
                    markets: [{
                        id: realData.id,
                        question: realData.markets?.[0]?.question || event.markets[0]?.question,
                        outcomePrices: JSON.stringify([prob.toString(), (1 - prob).toString()]) as any,
                        volume: realData.markets?.[0]?.volume || "High",
                        outcomes: realData.markets?.[0]?.outcomes || ["Yes", "No"]
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
                    description: realData.description || event.description,
                    markets: [{
                        id: realData.id,
                        question: realData.markets?.[0]?.question || event.markets[0]?.question,
                        outcomePrices: JSON.stringify([prob.toString(), (1 - prob).toString()]) as any,
                        volume: realData.markets?.[0]?.volume || "Active",
                        outcomes: realData.markets?.[0]?.outcomes || ["Yes", "No"]
                    }]
                };
            }

            // BTC Dominance - add real data
            if (event.id === 'risk_btc_dom' && btcDominance !== null) {
                return {
                    ...event,
                    description: `BTC 市佔率: ${btcDominance.toFixed(1)}%`,
                };
            }

            return event;
        });

    } catch (error) {
        console.error('[MarketData] Error fetching real data:', error);
    }

    // Filter/sort by focus areas
    if (focusAreas && focusAreas.length > 0) {
        events = events.sort((a, b) => {
            const aMatch = isMatch(a, focusAreas);
            const bMatch = isMatch(b, focusAreas);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
        });
    }

    return events;
};

// Helper to map FocusArea to EventCategory
const isMatch = (event: MarketEvent, focusAreas: FocusArea[]): boolean => {
    const cat = event.category;
    if (focusAreas.includes('macro') && (cat === 'Macro' || cat === 'Liquidity')) return true;
    if (focusAreas.includes('extreme_repair') && cat === 'Risk') return true;
    if (focusAreas.includes('btc_structure') && cat === 'Supply') return true;
    if (focusAreas.includes('policy') && cat === 'Political') return true;
    if (focusAreas.includes('low_prob') && cat === 'Narrative') return true;
    return false;
};
