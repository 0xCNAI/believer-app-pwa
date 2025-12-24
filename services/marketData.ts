import { MarketEvent } from './polymarket';
export { MarketEvent };

export type EventCategory = 'Macro' | 'Liquidity' | 'Risk' | 'Supply' | 'Political' | 'Narrative';

export const BELIEVER_SIGNALS: MarketEvent[] = [
    // --- ⓪ Liquidity Regime (The Amplifier) ---
    {
        id: 'liq_global_m2',
        title: '全球 M2 流動性',
        description: '全球資金是否停止緊縮並開始注入',
        source: 'Central Banks',
        category: 'Liquidity',
        slug: 'liq-m2',
        markets: [{
            id: 'l1',
            question: '全球 M2 變動率是否轉正？',
            outcomePrices: JSON.stringify(["0.60", "0.40"]) as any, // Slightly positive
            volume: "High",
            outcomes: ["轉正", "縮減"]
        }]
    },
    {
        id: 'liq_usd_pressure',
        title: '美元指數 (DXY) 壓力',
        description: '美元是否不再強勢吸血',
        source: 'DXY Index',
        category: 'Liquidity',
        slug: 'liq-dxy',
        markets: [{
            id: 'l2',
            question: 'DXY 是否跌破關鍵支撐轉弱？',
            outcomePrices: JSON.stringify(["0.50", "0.50"]) as any,
            volume: "Active",
            outcomes: ["轉弱", "強勢"]
        }]
    },
    {
        id: 'liq_real_rates',
        title: '實質利率壓力',
        description: '實質資金成本是否下降',
        source: 'Bond Market',
        category: 'Liquidity',
        slug: 'liq-rates',
        markets: [{
            id: 'l3',
            question: '實質利率是否從高點顯著回落？',
            outcomePrices: JSON.stringify(["0.40", "0.60"]) as any, // Still high stress
            volume: "Active",
            outcomes: ["回落", "高檔"]
        }]
    },

    // --- ① Macro Policy ---
    {
        id: 'macro_rate_cut',
        title: '利率政策預期',
        description: '降息預期是否鬆動或是提前',
        source: 'Polymarket/Fed',
        category: 'Macro',
        slug: 'macro-rate',
        markets: [{
            id: 'm1',
            question: '降息機率是否顯著上升？',
            outcomePrices: JSON.stringify(["0.65", "0.35"]) as any,
            volume: "High",
            outcomes: ["上升", "持平/下降"]
        }]
    },
    {
        id: 'macro_inflation',
        title: '通膨趨勢 (CPI/PCE)',
        description: '通膨下行趨勢是否確立',
        source: 'Official Data',
        category: 'Macro',
        slug: 'macro-inflation',
        markets: [{
            id: 'm2',
            question: '通膨數據是否顯示持續改善？',
            outcomePrices: JSON.stringify(["0.70", "0.30"]) as any,
            volume: "Active",
            outcomes: ["改善", "惡化/停滯"]
        }]
    },
    {
        id: 'macro_yield_curve',
        title: '殖利率曲線結構',
        description: '長短期利差與實質利率壓力',
        source: 'Kalshi/Rates',
        category: 'Macro',
        slug: 'macro-yield',
        markets: [{
            id: 'm3',
            question: '殖利率曲線是否趨於陡峭化（正常化）？',
            outcomePrices: JSON.stringify(["0.55", "0.45"]) as any,
            volume: "Active",
            outcomes: ["陡峭化", "倒掛持續"]
        }]
    },

    // --- ② Market Risk Sentiment ---
    {
        id: 'risk_on_off',
        title: '風險偏好 (Risk-On/Off)',
        description: '市場是否開始承受壞消息',
        source: 'Market Data',
        category: 'Risk',
        slug: 'risk-sentiment',
        markets: [{
            id: 'r1',
            question: '傳統風險資產是否展現抗跌性？',
            outcomePrices: JSON.stringify(["0.60", "0.40"]) as any,
            volume: "High",
            outcomes: ["抗跌", "脆弱"]
        }]
    },
    {
        id: 'risk_volatility',
        title: '波動率壓縮',
        description: '波動率壓縮與方向選擇',
        source: 'Options IV',
        category: 'Risk',
        slug: 'risk-vol',
        markets: [{
            id: 'r2',
            question: '隱含波動率 (IV) 是否處於歷史低位並開始反彈？',
            outcomePrices: JSON.stringify(["0.80", "0.20"]) as any,
            volume: "Active",
            outcomes: ["是", "否"]
        }]
    },
    {
        id: 'risk_btc_dom',
        title: '比特幣市佔率 (BTC.D)',
        description: '資金避險與吸血效應',
        source: 'Market Structure',
        category: 'Risk',
        slug: 'risk-btc-dom',
        markets: [{
            id: 'r3',
            question: 'BTC.D 是否持續上升吸血 Altcoins？',
            outcomePrices: JSON.stringify(["0.75", "0.25"]) as any,
            volume: "High",
            outcomes: ["吸血中", "流出"]
        }]
    },

    // --- ③ Structural Supply/Demand (BTC Only) ---
    {
        id: 'supply_exchange_flow',
        title: '交易所淨流量',
        description: '現貨供給壓力趨勢',
        source: 'On-Chain',
        category: 'Supply',
        slug: 'supply-exchange',
        markets: [{
            id: 's1',
            question: '交易所淨流出是否加速？',
            outcomePrices: JSON.stringify(["0.50", "0.50"]) as any,
            volume: "High",
            outcomes: ["加速流出", "流入/持平"]
        }]
    },
    {
        id: 'supply_lth',
        title: '長期持有者 (LTH)',
        description: '長期持有者是否停止拋售',
        source: 'On-Chain',
        category: 'Supply',
        slug: 'supply-lth',
        markets: [{
            id: 's2',
            question: 'LTH 供應量是否開始回升（累積）？',
            outcomePrices: JSON.stringify(["0.45", "0.55"]) as any,
            volume: "Active",
            outcomes: ["累積中", "派發中"]
        }]
    },
    {
        id: 'supply_sth',
        title: '短期持有者 (STH) 拋壓',
        description: '短期持有者虧損賣壓釋放',
        source: 'On-Chain',
        category: 'Supply',
        slug: 'supply-sth',
        markets: [{
            id: 's3',
            question: 'STH 虧損籌碼是否已清洗完畢？',
            outcomePrices: JSON.stringify(["0.30", "0.70"]) as any,
            volume: "Active",
            outcomes: ["完畢", "仍有賣壓"]
        }]
    },
    {
        id: 'supply_whale',
        title: '巨鯨累積',
        description: '大額資金系統性吸收模式',
        source: 'On-Chain',
        category: 'Supply',
        slug: 'supply-whale',
        markets: [{
            id: 's4',
            question: '是否觀測到鯨魚群體的一致性買入？',
            outcomePrices: JSON.stringify(["0.60", "0.40"]) as any,
            volume: "Medium",
            outcomes: ["有", "無"]
        }]
    },
    {
        id: 'supply_etf',
        title: 'ETF 資金流向',
        description: '機構買盤連續性',
        source: 'ETF Data',
        category: 'Supply',
        slug: 'supply-etf',
        markets: [{
            id: 's5',
            question: 'ETF 是否呈現連續多日淨流入？',
            outcomePrices: JSON.stringify(["0.40", "0.60"]) as any,
            volume: "High",
            outcomes: ["連續流入", "流出/震盪"]
        }]
    },

    // --- ④ Political & Regulatory ---
    {
        id: 'pol_election',
        title: '美國政治局勢',
        description: '政治立場對加密貨幣的轉向',
        source: 'Polymarket',
        category: 'Political',
        slug: 'pol-election',
        markets: [{
            id: 'p1',
            question: '對加密友善的政治勝率是否上升？',
            outcomePrices: JSON.stringify(["0.55", "0.45"]) as any,
            volume: "Active",
            outcomes: ["上升", "下降"]
        }]
    },
    {
        id: 'pol_regulation',
        title: '監管進展',
        description: '法案與監管語氣放鬆',
        source: 'Polymarket',
        category: 'Political',
        slug: 'pol-reg',
        markets: [{
            id: 'p2',
            question: '關鍵加密法案通過機率是否增加？',
            outcomePrices: JSON.stringify(["0.30", "0.70"]) as any,
            volume: "Low",
            outcomes: ["增加", "停滯"]
        }]
    },

    // --- ⑤ Narrative Shift ---
    {
        id: 'narrative_shift',
        title: '低機率黑天鵝',
        description: '長期被忽視敘事的重新定價',
        source: 'Prediction Mkts',
        category: 'Narrative',
        slug: 'narrative-shift',
        markets: [{
            id: 'n1',
            question: '某個低機率敘事的發生機率是否突然跳升？',
            outcomePrices: JSON.stringify(["0.20", "0.80"]) as any,
            volume: "Low",
            outcomes: ["跳升", "低迷"]
        }]
    }
];

import { ExperienceLevel, FocusArea } from '@/stores/userStore';

export const fetchUnifiedMarkets = async (
    experience?: ExperienceLevel | null,
    focusAreas?: FocusArea[]
): Promise<MarketEvent[]> => {
    // Debug Log
    console.log('[MarketData] Fetching with prefs:', { experience, focusAreas });

    return new Promise((resolve) => {
        setTimeout(() => {
            let events = [...BELIEVER_SIGNALS];

            // 1. Filter/Sort by Experience (Mock Logic)
            // If novice, maybe hide complex 'Supply' or 'Liquidity' complexity? 
            // For now, we will just keep all but could prioritize simpler ones.

            // 2. Weight by Focus Area
            if (focusAreas && focusAreas.length > 0) {
                events = events.sort((a, b) => {
                    const aMatch = isMatch(a, focusAreas);
                    const bMatch = isMatch(b, focusAreas);
                    if (aMatch && !bMatch) return -1;
                    if (!aMatch && bMatch) return 1;
                    return 0;
                });
            }

            resolve(events);
        }, 500);
    });
};

// Helper to map FocusArea to EventCategory/Slug
const isMatch = (event: MarketEvent, focusAreas: FocusArea[]): boolean => {
    // Map FocusArea to logic
    // 'macro' -> Category: Macro, Liquidity
    // 'extreme_repair' -> Category: Risk
    // 'btc_structure' -> Category: Supply
    // 'policy' -> Category: Political
    // 'low_prob' -> Category: Narrative

    const cat = event.category;
    if (focusAreas.includes('macro') && (cat === 'Macro' || cat === 'Liquidity')) return true;
    if (focusAreas.includes('extreme_repair') && cat === 'Risk') return true;
    if (focusAreas.includes('btc_structure') && cat === 'Supply') return true;
    if (focusAreas.includes('policy') && cat === 'Political') return true;
    if (focusAreas.includes('low_prob') && cat === 'Narrative') return true;

    return false;
};
