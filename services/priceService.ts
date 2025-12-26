/**
 * Price Service - Binance Kline API Integration
 * 
 * Fetches BTC/USDT OHLCV data and provides calculation helpers
 * for technical analysis conditions.
 */

export interface KlineData {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// Cache to avoid excessive API calls
let klineCache: KlineData[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch BTC/USDT daily klines from Binance
 * @param days Number of days to fetch (max 1000)
 */
export async function fetchBTCKlines(days: number = 365): Promise<KlineData[]> {
    // Return cached data if fresh
    const now = Date.now();
    if (klineCache.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
        return klineCache.slice(-days);
    }

    try {
        const response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${Math.min(days, 1000)}`
        );

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status}`);
        }

        const data = await response.json();

        // Binance kline format: [openTime, open, high, low, close, volume, ...]
        klineCache = data.map((k: any[]) => ({
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
        }));

        lastFetchTime = now;
        return klineCache;
    } catch (error) {
        console.error('[PriceService] Failed to fetch klines:', error);
        // Return cached data if available, otherwise empty
        return klineCache.length > 0 ? klineCache : [];
    }
}

/**
 * Get current BTC price
 */
export async function getCurrentPrice(): Promise<number> {
    const klines = await fetchBTCKlines(1);
    return klines.length > 0 ? klines[klines.length - 1].close : 0;
}

// ============ Risk Modifier APIs ============

/**
 * Fetch BTC Funding Rate from Binance Futures
 * Returns annualized funding rate percentage
 */
export async function fetchFundingRate(): Promise<number> {
    try {
        const response = await fetch(
            'https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1'
        );
        if (!response.ok) return 0;
        const data = await response.json();
        if (data.length === 0) return 0;
        // fundingRate is in decimal, e.g., 0.0001 = 0.01%
        return parseFloat(data[0].fundingRate) * 100;
    } catch (error) {
        console.error('[PriceService] Funding rate fetch failed:', error);
        return 0;
    }
}

/**
 * Fetch BTC Open Interest from Binance Futures
 * Returns OI in USD and 24h change percentage
 */
export async function fetchOpenInterest(): Promise<{ oi: number; change24h: number }> {
    try {
        const response = await fetch(
            'https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT'
        );
        if (!response.ok) return { oi: 0, change24h: 0 };
        const data = await response.json();
        const currentOI = parseFloat(data.openInterest);

        // For change, we'd need historical data - approximating with 0 for now
        // In production, store and compare to previous fetch
        return { oi: currentOI, change24h: 0 };
    } catch (error) {
        console.error('[PriceService] OI fetch failed:', error);
        return { oi: 0, change24h: 0 };
    }
}

/**
 * Fetch Stablecoin Supply from CoinGecko
 * Returns total supply and 30d growth rate
 */
export async function fetchStablecoinSupply(): Promise<{ total: number; growth30d: number }> {
    try {
        // CoinGecko free API for USDT market cap
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/tether?localization=false&tickers=false&community_data=false&developer_data=false'
        );
        if (!response.ok) return { total: 0, growth30d: 0 };
        const data = await response.json();

        const marketCap = data.market_data?.market_cap?.usd || 0;
        const change30d = data.market_data?.market_cap_change_percentage_30d_in_currency?.usd || 0;

        return { total: marketCap, growth30d: change30d };
    } catch (error) {
        console.error('[PriceService] Stablecoin supply fetch failed:', error);
        return { total: 0, growth30d: 0 };
    }
}

/**
 * Determine liquidity status based on stablecoin supply growth
 */
export async function getLiquidityStatus(): Promise<'improving' | 'neutral' | 'tight'> {
    const { growth30d } = await fetchStablecoinSupply();

    if (growth30d > 2) return 'improving';
    if (growth30d < -2) return 'tight';
    return 'neutral';
}

// ============ Calculation Helpers ============

/**
 * Calculate Simple Moving Average
 */
export function calculateMA(data: KlineData[], period: number): number[] {
    const closes = data.map(d => d.close);
    const result: number[] = [];

    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) {
            result.push(0); // Not enough data
        } else {
            const slice = closes.slice(i - period + 1, i + 1);
            const sum = slice.reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
    }

    return result;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(data: KlineData[], period: number = 14): number[] {
    const closes = data.map(d => d.close);
    const result: number[] = [];

    let gains = 0;
    let losses = 0;

    for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
            result.push(50); // Default
            continue;
        }

        const change = closes[i] - closes[i - 1];

        if (i < period) {
            if (change > 0) gains += change;
            else losses -= change;
            result.push(50);
        } else if (i === period) {
            if (change > 0) gains += change;
            else losses -= change;

            const avgGain = gains / period;
            const avgLoss = losses / period;
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
        } else {
            const avgGain = (gains * (period - 1) + (change > 0 ? change : 0)) / period;
            const avgLoss = (losses * (period - 1) + (change < 0 ? -change : 0)) / period;

            gains = avgGain * period;
            losses = avgLoss * period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
        }
    }

    return result;
}

/**
 * Calculate linear regression slope
 * @param values Array of values
 * @returns Slope (rate of change per period)
 */
export function calculateSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;

    return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Calculate percentile rank of a value within a history
 */
export function percentileRank(value: number, history: number[]): number {
    if (history.length === 0) return 50;

    const sorted = [...history].sort((a, b) => a - b);
    const below = sorted.filter(v => v < value).length;

    return (below / sorted.length) * 100;
}

/**
 * Calculate rolling standard deviation (volatility)
 */
export function calculateVolatility(data: KlineData[], period: number): number[] {
    const logReturns = data.map((d, i) =>
        i === 0 ? 0 : Math.log(d.close / data[i - 1].close)
    );

    const result: number[] = [];

    for (let i = 0; i < logReturns.length; i++) {
        if (i < period - 1) {
            result.push(0);
        } else {
            const slice = logReturns.slice(i - period + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b, 0) / period;
            const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
            result.push(Math.sqrt(variance));
        }
    }

    return result;
}

/**
 * Find lowest low in a given window
 */
export function findLowestLow(data: KlineData[], startIdx: number, endIdx: number): number {
    let lowest = Infinity;
    for (let i = Math.max(0, startIdx); i <= Math.min(data.length - 1, endIdx); i++) {
        if (data[i].low < lowest) {
            lowest = data[i].low;
        }
    }
    return lowest === Infinity ? 0 : lowest;
}

/**
 * Find highest high in a given window
 */
export function findHighestHigh(data: KlineData[], startIdx: number, endIdx: number): number {
    let highest = -Infinity;
    for (let i = Math.max(0, startIdx); i <= Math.min(data.length - 1, endIdx); i++) {
        if (data[i].high > highest) {
            highest = data[i].high;
        }
    }
    return highest === -Infinity ? 0 : highest;
}

/**
 * Check if price made a Higher Low
 * @param data Kline data
 * @param windowWeeks Number of weeks for each comparison window
 */
export function checkHigherLow(data: KlineData[], windowWeeks: number = 6): boolean {
    const windowDays = windowWeeks * 7;
    const n = data.length;

    if (n < windowDays * 2) return false;

    // Compare last two windows
    const low1 = findLowestLow(data, n - windowDays * 2, n - windowDays - 1);
    const low2 = findLowestLow(data, n - windowDays, n - 1);

    return low2 > low1;
}
