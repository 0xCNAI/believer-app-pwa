/**
 * Technical Analysis Engine
 * 
 * Evaluates 8 technical conditions organized in 3 groups:
 * - Engine Gates (4): Core conditions for Phase transitions
 * - Evidence Boosters (4): Confidence/cap modifiers
 * - Personal Modifiers: User-adjustable parameters
 */

import {
    calculateMA,
    calculateRSI,
    calculateSlope,
    calculateVolatility,
    checkHigherLow,
    fetchBTCKlines,
    findHighestHigh,
    KlineData,
    percentileRank,
} from './priceService';

// ============ Types ============

export type ConditionGroup = 'Gate' | 'Booster' | 'Personal';

export interface ConditionResult {
    id: string;
    group: ConditionGroup;
    name: string;
    enabled: boolean;
    score: number;       // 0-1 normalized strength
    passed: boolean;     // Whether threshold is met
    confidence: number;  // 0-1 data quality
    detail?: string;     // Human-readable detail
}

export interface PersonalParams {
    maPeriod: 120 | 200 | 250;
    hlWindow: 4 | 6 | 8;        // weeks
    volPercentile: 10 | 15 | 20;
    supportDistance: 3 | 5 | 8; // %
}

export const DEFAULT_PERSONAL_PARAMS: PersonalParams = {
    maPeriod: 200,
    hlWindow: 6,
    volPercentile: 20,
    supportDistance: 5,
};

// ============ Condition Definitions ============

interface ConditionDef {
    id: string;
    group: ConditionGroup;
    name: string;
    nameCN: string;
    explanation: string;
    defaultEnabled: boolean;
}

export const CONDITION_DEFS: ConditionDef[] = [
    // Engine Gates
    {
        id: 'price_vs_200d',
        group: 'Gate',
        name: 'Price vs 200D MA',
        nameCN: '價格 vs 長期均線',
        explanation: '觀察價格與 200 日均線的距離。當價格接近或突破均線時，代表長期趨勢可能正在轉變。均線是市場成本的共識，往往是機構的心理防線。',
        defaultEnabled: true
    },
    {
        id: 'ma_slope_flat',
        group: 'Gate',
        name: 'MA Slope Flatten',
        nameCN: '均線斜率趨平',
        explanation: '觀察長期均線的斜率變化。當均線從下跌轉為走平，代表下跌動能正在衰竭，是趨勢反轉的必要條件。',
        defaultEnabled: true
    },
    {
        id: 'higher_low',
        group: 'Gate',
        name: 'Higher Low',
        nameCN: '結構性低點抬升',
        explanation: '比較近期兩個低點，確認是否出現「更高的低點」。這是道氏理論的基礎，代表買盤在更高的價格願意承接。',
        defaultEnabled: true
    },
    {
        id: 'vol_compression',
        group: 'Gate',
        name: 'Volatility Compression',
        nameCN: '波動率壓縮',
        explanation: '當波動率降至歷史低位時，代表市場正在蓄能。如同彈簧壓縮，低波動往往是大行情的前兆。',
        defaultEnabled: true
    },

    // Evidence Boosters
    {
        id: 'momentum_divergence',
        group: 'Booster',
        name: 'Momentum Divergence',
        nameCN: '動能背離',
        explanation: '當價格創新低但 RSI 指標未創新低時，形成「看漲背離」。這代表賣壓正在減弱，是反轉的早期信號。',
        defaultEnabled: true
    },
    {
        id: 'volume_confirmation',
        group: 'Booster',
        name: 'Volume Confirmation',
        nameCN: '成交量確認',
        explanation: '觀察上漲時是否伴隨放量。沒有成交量支持的價格變動通常不可持續，量價配合是驗證趨勢真實性的關鍵。',
        defaultEnabled: false
    },
    {
        id: 'range_breakout',
        group: 'Booster',
        name: 'Range Breakout',
        nameCN: '區間突破',
        explanation: '觀察價格是否突破近 90 天的高點。長期盤整後的突破，通常代表新趨勢的開始。',
        defaultEnabled: false
    },
    {
        id: 'vol_expansion',
        group: 'Booster',
        name: 'Volatility Expansion',
        nameCN: '波動率擴張',
        explanation: '當短期波動率突然高於長期波動率 1.5 倍以上，代表市場正在變盤。若方向向下則需警惕假突破。',
        defaultEnabled: true
    },
];

// ============ Individual Condition Evaluators ============

/**
 * Gate 1: Price vs 200D MA
 * passed = price within 5% below or above MA
 * score = normalized distance (-10% = 0, +5% = 1)
 */
function evaluatePriceVsMA(data: KlineData[], period: number): ConditionResult {
    const ma = calculateMA(data, period);
    const lastMA = ma[ma.length - 1];
    const lastClose = data[data.length - 1]?.close || 0;

    if (lastMA === 0) {
        return {
            id: 'price_vs_200d',
            group: 'Gate',
            name: 'Price vs 200D MA',
            enabled: true,
            score: 0,
            passed: false,
            confidence: 0,
            detail: 'Insufficient data',
        };
    }

    const distance = (lastClose - lastMA) / lastMA;
    const passed = distance > -0.05; // Within 5% below
    const score = Math.max(0, Math.min(1, (distance + 0.1) / 0.15)); // -10% -> 0, +5% -> 1

    console.log(`[TechEngine] Gate 1 (Price vs MA): Close=${lastClose}, MA=${lastMA}, Dist=${distance.toFixed(3)}, Passed=${passed}`);

    return {
        id: 'price_vs_200d',
        group: 'Gate',
        name: 'Price vs 200D MA',
        enabled: true,
        score,
        passed,
        confidence: data.length >= period ? 1 : data.length / period,
        detail: `Distance: ${(distance * 100).toFixed(1)}%`,
    };
}

/**
 * Gate 2: MA Slope Flatten
 * passed = slope is no longer significantly negative
 */
function evaluateMASlope(data: KlineData[], period: number): ConditionResult {
    const ma = calculateMA(data, period);
    const recentMA = ma.slice(-30).filter(v => v > 0);

    if (recentMA.length < 10) {
        return {
            id: 'ma_slope_flat',
            group: 'Gate',
            name: 'MA Slope Flatten',
            enabled: true,
            score: 0,
            passed: false,
            confidence: 0,
            detail: 'Insufficient data',
        };
    }

    const slope = calculateSlope(recentMA);
    const normalizedSlope = slope / recentMA[0]; // Normalize by MA value

    // Threshold: slope should be > -0.001 (roughly flat or rising)
    const passed = normalizedSlope > -0.0005;
    const score = Math.max(0, Math.min(1, (normalizedSlope + 0.002) / 0.003));

    return {
        id: 'ma_slope_flat',
        group: 'Gate',
        name: 'MA Slope Flatten',
        enabled: true,
        score,
        passed,
        confidence: 1,
        detail: `Slope: ${(normalizedSlope * 10000).toFixed(2)}bps/day`,
    };
}

/**
 * Gate 3: Higher Low
 */
function evaluateHigherLow(data: KlineData[], windowWeeks: number): ConditionResult {
    const hasHL = checkHigherLow(data, windowWeeks);

    return {
        id: 'higher_low',
        group: 'Gate',
        name: 'Higher Low',
        enabled: true,
        score: hasHL ? 1 : 0,
        passed: hasHL,
        confidence: data.length >= windowWeeks * 7 * 2 ? 1 : 0.5,
        detail: hasHL ? 'Structure improving' : 'No higher low detected',
    };
}

/**
 * Gate 4: Volatility Compression
 * passed = current vol is in bottom N percentile of last year
 */
function evaluateVolCompression(data: KlineData[], threshold: number): ConditionResult {
    const vol = calculateVolatility(data, 30);
    const currentVol = vol[vol.length - 1];
    const history = vol.slice(-365).filter(v => v > 0);

    if (history.length < 30) {
        return {
            id: 'vol_compression',
            group: 'Gate',
            name: 'Volatility Compression',
            enabled: true,
            score: 0,
            passed: false,
            confidence: 0,
            detail: 'Insufficient history',
        };
    }

    const pct = percentileRank(currentVol, history);
    const passed = pct < threshold;
    const score = Math.max(0, Math.min(1, (threshold - pct) / threshold));

    return {
        id: 'vol_compression',
        group: 'Gate',
        name: 'Volatility Compression',
        enabled: true,
        score,
        passed,
        confidence: 1,
        detail: `Percentile: ${pct.toFixed(0)}%`,
    };
}

/**
 * Booster 1: Momentum Divergence
 * Price makes lower low but RSI makes higher low
 */
function evaluateMomentumDivergence(data: KlineData[]): ConditionResult {
    if (data.length < 90) {
        return {
            id: 'momentum_divergence',
            group: 'Booster',
            name: 'Momentum Divergence',
            enabled: true,
            score: 0,
            passed: false,
            confidence: 0,
            detail: 'Insufficient data',
        };
    }

    const rsi = calculateRSI(data, 14);
    const window = 30; // days

    // Get two windows
    const priceRecent = data.slice(-window);
    const pricePrev = data.slice(-window * 2, -window);
    const rsiRecent = rsi.slice(-window);
    const rsiPrev = rsi.slice(-window * 2, -window);

    const priceLowRecent = Math.min(...priceRecent.map(d => d.low));
    const priceLowPrev = Math.min(...pricePrev.map(d => d.low));
    const rsiLowRecent = Math.min(...rsiRecent);
    const rsiLowPrev = Math.min(...rsiPrev);

    // Bullish divergence: price LL + RSI HL
    const priceMadeLL = priceLowRecent < priceLowPrev;
    const rsiMadeHL = rsiLowRecent > rsiLowPrev;
    const passed = priceMadeLL && rsiMadeHL;

    return {
        id: 'momentum_divergence',
        group: 'Booster',
        name: 'Momentum Divergence',
        enabled: true,
        score: passed ? 1 : 0,
        passed,
        confidence: 1,
        detail: passed ? 'Bullish divergence detected' : 'No divergence',
    };
}

/**
 * Booster 2: Volume Confirmation
 * Recent up candles have above-average volume
 */
function evaluateVolumeConfirmation(data: KlineData[]): ConditionResult {
    if (data.length < 30) {
        return {
            id: 'volume_confirmation',
            group: 'Booster',
            name: 'Volume Confirmation',
            enabled: true,
            score: 0,
            passed: false,
            confidence: 0,
            detail: 'Insufficient data',
        };
    }

    const recent = data.slice(-14);
    const avgVolume = data.slice(-90).reduce((s, d) => s + d.volume, 0) / 90;

    // Count up candles with above-avg volume
    const upCandlesWithVol = recent.filter(
        d => d.close > d.open && d.volume > avgVolume
    ).length;

    const passed = upCandlesWithVol >= 4;
    const score = Math.min(1, upCandlesWithVol / 7);

    return {
        id: 'volume_confirmation',
        group: 'Booster',
        name: 'Volume Confirmation',
        enabled: true,
        score,
        passed,
        confidence: 1,
        detail: `${upCandlesWithVol} strong up days (14d)`,
    };
}

/**
 * Booster 3: Range Breakout
 * Price breaks above 90-day range high
 */
function evaluateRangeBreakout(data: KlineData[]): ConditionResult {
    if (data.length < 90) {
        return {
            id: 'range_breakout',
            group: 'Booster',
            name: 'Range Breakout',
            enabled: true,
            score: 0,
            passed: false,
            confidence: 0,
            detail: 'Insufficient data',
        };
    }

    const rangeHigh = findHighestHigh(data, data.length - 90, data.length - 2);
    const currentClose = data[data.length - 1].close;
    const passed = currentClose > rangeHigh;
    const distance = (currentClose - rangeHigh) / rangeHigh;

    return {
        id: 'range_breakout',
        group: 'Booster',
        name: 'Range Breakout',
        enabled: true,
        score: passed ? Math.min(1, distance * 10) : 0,
        passed,
        confidence: 1,
        detail: passed
            ? `Broke ${rangeHigh.toFixed(0)} by ${(distance * 100).toFixed(1)}%`
            : `${((rangeHigh - currentClose) / rangeHigh * 100).toFixed(1)}% below range high`,
    };
}

/**
 * Booster 4: Volatility Expansion
 * Recent vol is significantly higher than historical
 * Also detects direction (up/down)
 */
function evaluateVolExpansion(data: KlineData[]): ConditionResult {
    const vol30 = calculateVolatility(data, 30);
    const vol60 = calculateVolatility(data, 60);

    const current30 = vol30[vol30.length - 1];
    const current60 = vol60[vol60.length - 1];

    if (current60 === 0) {
        return {
            id: 'vol_expansion',
            group: 'Booster',
            name: 'Volatility Expansion',
            enabled: true,
            score: 0,
            passed: false,
            confidence: 0,
            detail: 'Insufficient data',
        };
    }

    const ratio = current30 / current60;
    const passed = ratio > 1.5;

    // Determine direction: compare to 50D MA
    const ma50 = calculateMA(data, 50);
    const lastMA50 = ma50[ma50.length - 1];
    const lastClose = data[data.length - 1].close;
    const direction = lastClose >= lastMA50 ? 'up' : 'down';

    return {
        id: 'vol_expansion',
        group: 'Booster',
        name: 'Volatility Expansion',
        enabled: true,
        score: passed ? Math.min(1, (ratio - 1) / 1) : 0,
        passed,
        confidence: 1,
        detail: `Vol ratio: ${ratio.toFixed(2)}x (${direction})`,
        // Store direction in detail for downstream use
    };
}

// ============ Main Evaluation Function ============

export interface TechEvaluationResult {
    conditions: ConditionResult[];
    gatesPassedCount: number;
    boostersPassedCount: number;
    dataTimestamp: number;
}

export async function evaluateTechConditions(
    enabledIds: string[],
    params: PersonalParams = DEFAULT_PERSONAL_PARAMS
): Promise<TechEvaluationResult> {
    // Fetch data once
    const data = await fetchBTCKlines(400);

    if (data.length === 0) {
        return {
            conditions: CONDITION_DEFS.map(def => ({
                id: def.id,
                group: def.group,
                name: def.name,
                enabled: enabledIds.includes(def.id),
                score: 0,
                passed: false,
                confidence: 0,
                detail: 'No data available',
            })),
            gatesPassedCount: 0,
            boostersPassedCount: 0,
            dataTimestamp: Date.now(),
        };
    }

    // Evaluate each condition
    const results: ConditionResult[] = [];

    // Gates
    const priceVsMA = evaluatePriceVsMA(data, params.maPeriod);
    priceVsMA.enabled = enabledIds.includes('price_vs_200d');
    results.push(priceVsMA);

    const maSlope = evaluateMASlope(data, params.maPeriod);
    maSlope.enabled = enabledIds.includes('ma_slope_flat');
    results.push(maSlope);

    const higherLow = evaluateHigherLow(data, params.hlWindow);
    higherLow.enabled = enabledIds.includes('higher_low');
    results.push(higherLow);

    const volComp = evaluateVolCompression(data, params.volPercentile);
    volComp.enabled = enabledIds.includes('vol_compression');
    results.push(volComp);

    // Boosters
    const momDiv = evaluateMomentumDivergence(data);
    momDiv.enabled = enabledIds.includes('momentum_divergence');
    results.push(momDiv);

    const volConf = evaluateVolumeConfirmation(data);
    volConf.enabled = enabledIds.includes('volume_confirmation');
    results.push(volConf);

    const rangeBreak = evaluateRangeBreakout(data);
    rangeBreak.enabled = enabledIds.includes('range_breakout');
    results.push(rangeBreak);

    const volExp = evaluateVolExpansion(data);
    volExp.enabled = enabledIds.includes('vol_expansion');
    results.push(volExp);

    // Count passed conditions (only if enabled)
    const gatesPassedCount = results
        .filter(r => r.group === 'Gate' && r.enabled && r.passed)
        .length;

    const boostersPassedCount = results
        .filter(r => r.group === 'Booster' && r.enabled && r.passed)
        .length;

    return {
        conditions: results,
        gatesPassedCount,
        boostersPassedCount,
        dataTimestamp: Date.now(),
    };
}
