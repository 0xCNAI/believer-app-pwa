import { Platform } from 'react-native';
import { MarketEvent } from './polymarket';

// Polymarket Gamma API Base
const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com/events';

// Helper to get correct URL based on platform
const getPolymarketUrl = (queryString: string): string => {
    if (Platform.OS === 'web') {
        // Use local API proxy on web (bypasses CORS)
        return `/api/polymarket?${queryString}`;
    }
    // Direct fetch on native
    return `${POLYMARKET_API_BASE}?${queryString}`;
};

// Helper to normalize API response (snake_case -> camelCase)
const _normalizeMarketEvent = (raw: any): MarketEvent => {
    return {
        id: raw.id,
        title: raw.title,
        description: raw.description,
        slug: raw.slug,
        category: raw.category || 'Unknown',
        endDate: raw.end_date || raw.endDate, // Handle both
        active: raw.active,
        closed: raw.closed,
        image: raw.image,
        icon: raw.icon,
        volume: typeof raw.volume === 'number' ? raw.volume : parseFloat(raw.volume || '0'),
        outcomes: raw.outcomes, // Often stringified JSON
        outcomePrices: raw.outcome_prices || raw.outcomePrices, // CRITICAL FIX
        groupItemTitle: raw.groupItemTitle, // Map groupItemTitle for Fed Rate logic
        markets: raw.markets ? raw.markets.map(_normalizeMarketEvent) : []
    };
};

// Search for specific markets on Polymarket
export const fetchPolymarketBySlug = async (slug: string): Promise<MarketEvent | null> => {
    try {
        const response = await fetch(getPolymarketUrl(`slug=${encodeURIComponent(slug)}`));
        if (!response.ok) return null;
        const data = await response.json();
        // API often returns array for slug search
        const eventData = Array.isArray(data) ? data[0] : data;
        return eventData ? _normalizeMarketEvent(eventData) : null;
    } catch (error) {
        console.error('[API] Polymarket slug fetch error:', error);
        return null;
    }
};

// V5.0 Strict Fetch
import { NarrativeSignal } from './marketData';

export const fetchSignalsByIds = async (signals: NarrativeSignal[]): Promise<NarrativeSignal[]> => {
    console.log('[API] V5.0 strict fetch starting...');

    const results: NarrativeSignal[] = [];

    await Promise.all(signals.map(async (signal) => {
        const slug = signal.source.slug;
        const mkData = await fetchPolymarketBySlug(slug);

        if (mkData) {
            // Check if we need a specific market ID (if 'markets' has multiple)
            // But usually slug points to one event.
            // We just attach the markets array found.
            results.push({
                ...signal,
                markets: mkData.markets
            });
            console.log(`[API] Loaded: ${signal.title} (Slug: ${slug})`);
        } else {
            console.warn(`[API] 404/Error for Signal: ${signal.title} (${slug})`);
            // Return signal without markets (UI will handle empty state)
            results.push(signal);
        }
    }));

    return results;
};


// FRED API (Federal Reserve Economic Data) - Free, no auth needed
const FRED_API = 'https://api.stlouisfed.org/fred';
const FRED_API_KEY = 'YOUR_FRED_API_KEY'; // Free key from https://fred.stlouisfed.org/docs/api/api_key.html

export interface FredObservation {
    date: string;
    value: string;
}

// Note: FRED requires API key. For demo, we'll show the structure
export const fetchFredSeries = async (seriesId: string): Promise<FredObservation[]> => {
    // In production, you'd use:
    // const url = `${FRED_API}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&limit=10&sort_order=desc`;
    console.log(`[API] FRED series ${seriesId} - requires API key`);
    return [];
};

// CoinGecko API (already used for BTC price, expand for more data)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface CoinData {
    id: string;
    symbol: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
    market_cap_dominance?: number;
}

export const fetchBtcDominance = async (): Promise<number | null> => {
    try {
        const response = await fetch(`${COINGECKO_API}/global`);
        const data = await response.json();
        return data.data?.market_cap_percentage?.btc || null;
    } catch (error) {
        console.error('[API] CoinGecko dominance error:', error);
        return null;
    }
};

// Fear & Greed Index (alternative.me API - free)
const FEAR_GREED_API = 'https://api.alternative.me/fng';

export interface FearGreedData {
    value: string;
    value_classification: string;
    timestamp: string;
}

export const fetchFearGreedIndex = async (): Promise<FearGreedData | null> => {
    try {
        const response = await fetch(`${FEAR_GREED_API}/?limit=1`);
        const data = await response.json();
        return data.data?.[0] || null;
    } catch (error) {
        console.error('[API] Fear & Greed error:', error);
        return null;
    }
};

// Aggregate function to fetch all real data
// ==========================================
// CACHING LOGIC (Firebase System Metrics)
// ==========================================

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Internal function to hit actual 3rd party APIs
const _fetchFromExternalApis = async () => {
    const [btcDominance, fearGreed, derivatives, mvrvZ, puell] = await Promise.all([
        fetchBtcDominance(),
        fetchFearGreedIndex(),
        fetchDerivativesData(),
        fetchMvrvZScore(),
        fetchPuellMultiple()
    ]);

    return {
        btcDominance,
        fearGreed,
        derivatives,
        mvrvZ,
        puell
    };
};

export const fetchAllRealData = async () => {
    const CACHE_Collection = 'system_metrics';
    const CACHE_DOC = 'latest';
    const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 Hours

    let cachedData: any = null;

    try {
        console.log('[API] Checking firebase cache...');
        const docRef = doc(db, CACHE_Collection, CACHE_DOC);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            cachedData = docSnap.data();
            const now = Date.now();
            const elapsed = now - (cachedData.updatedAt || 0);

            if (elapsed < CACHE_DURATION) {
                console.log(`[API] Returning cached data (${(elapsed / 1000 / 60).toFixed(1)} min old)`);
                return reconstituteMap(cachedData);
            }
            console.log('[API] Cache stale, fetching new data...');
        } else {
            console.log('[API] No cache found, fetching new data...');
        }
    } catch (e) {
        console.warn('[API] Cache check failed, falling back to live fetch:', e);
    }

    // fallback or fresh fetch
    const freshData = await _fetchFromExternalApis();

    // Strategy: Merge-Update
    // If we have cachedData (stale), use it to fill in any gaps where freshData is null
    const mergedData = {
        ...(cachedData || {}), // Start with old data
        ...Object.fromEntries(
            Object.entries(freshData).filter(([_, v]) => v !== null) // Overwrite with NEW non-null data
        ),
        updatedAt: Date.now() // Always bump timestamp if we attempted a fetch? 
        // Or only if we got *some* data? 
        // Let's bump it so we don't spam API loop if APIs are permanently down.
    };



    // Save to Cache
    try {
        const docRef = doc(db, CACHE_Collection, CACHE_DOC);
        await setDoc(docRef, mergedData);
        console.log('[API] System metrics cached to Firestore (Merged).');
    } catch (e) {
        console.error('[API] Failed to cache system metrics:', e);
    }

    return reconstituteMap(mergedData);
};

// Helper: Reconstruct Map(s) from Object for App Consumption
const reconstituteMap = (data: any) => {
    return {
        ...data
    };
};

// ==========================================
// NEW INDICATORS (Puell, MVRV, Derivatives)
// ==========================================

export interface DerivativesData {
    funding24hWeighted: number; // % (e.g. 0.01)
    oiTotalUsd: number;         // USD
    oi3dChangePct: number;      // % (e.g. 5.2)
}

// 1. Derivatives (Binance)
// Open Interest History Endpoint: https://fapi.binance.com/futures/data/openInterestHist
export const fetchDerivativesData = async (): Promise<DerivativesData | null> => {
    try {
        // Fetch Current OI & Funding & Price
        // Funding: https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=3 (Last 24h = 3 * 8h)
        // OI Current: https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT
        // OI History: https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=4
        // Mark Price: https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT

        const [fundingRes, oiRes, oiHistRes, priceRes] = await Promise.all([
            fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=3'),
            fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT'),
            fetch('https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=4'),
            fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT')
        ]);

        if (!fundingRes.ok || !oiRes.ok || !oiHistRes.ok || !priceRes.ok) return null;

        const fundingData = await fundingRes.json();
        const oiData = await oiRes.json();
        const oiHistData = await oiHistRes.json();
        const priceData = await priceRes.json();

        // 1. Funding 24h (Average of last 3 records)
        // Rate is returned as string "0.00010000"
        let fundingSum = 0;
        fundingData.forEach((f: any) => fundingSum += parseFloat(f.fundingRate));
        const funding24h = (fundingSum / fundingData.length) * 100; // Convert to %? Or keep as raw? Typically funding is e.g. 0.01%. 
        // Let's keep it as is? Request says "funding_24h_weighted". 
        // We'll return it as a percentage number (e.g. 0.01 for 0.01%)
        const funding24hPct = (fundingSum / fundingData.length) * 100;

        // 2. OI Total USD
        // Use real-time Mark Price from premiumIndex endpoint
        const currentPrice = parseFloat(priceData.markPrice);
        const currentOiUsd = parseFloat(oiData.openInterest) * currentPrice;

        // 3. OI 3d Change
        // 3 days ago = index 0 (if we fetched 4 items: [D-3, D-2, D-1, Today/Partial?])
        // If we fetch limit=4 daily candles.
        // The array is usually Oldest -> Newest.
        // So index 2 is yesterday, index 3 is today (open?).
        // Actually checking the timestamp is safer.
        const sortedHist = oiHistData.sort((a: any, b: any) => b.timestamp - a.timestamp); // Newest first
        // Newest is likely "yesterday close" or "today current"? API docs say "Open Interest Statistics". 
        // Verification output showed `sumOpenInterestValue`.
        // If we want exactly 3 days ago shift.
        // Let's compare Current (calculated) vs 3 days ago (from hist).
        // 3 days ago approx = sortedHist[3] (index 3 if 0-based, so 4th item).
        const oi3d = sortedHist[3]?.sumOpenInterestValue
            ? parseFloat(sortedHist[3].sumOpenInterestValue)
            : currentOiUsd; // fallback

        const oiChange = ((currentOiUsd - oi3d) / oi3d) * 100;

        return {
            funding24hWeighted: funding24hPct,
            oiTotalUsd: currentOiUsd,
            oi3dChangePct: oiChange
        };

    } catch (e) {
        console.error('[API] Derivatives fetch error:', e);
        return null;
    }
}

// 2. MVRV Z-Score
// Using CoinMetrics Community API (Free, Daily)
// Strategy:
// 1. Fetch MVRV Ratio (CapMVRVCur) and Market Cap (CapMrktCurUSD)
// 2. Derive Realized Cap = Market Cap / MVRV Ratio
// 3. Fetch full history of Market Cap to calculate Standard Deviation
// 4. Z-Score = (Market Cap - Realized Cap) / StdDev(Market Cap)

const COINMETRICS_API = 'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics';

interface CoinMetricsData {
    time: string;
    CapMrktCurUSD?: string;
    CapMVRVCur?: string;
}

export const fetchMvrvZScore = async (): Promise<number | null> => {
    try {
        console.log('[API] Fetching MVRV Z-Score data from CoinMetrics...');

        // 1. Fetch Latest Data (Market Cap & MVRV Ratio)
        const latestResponse = await fetch(
            `${COINMETRICS_API}?assets=btc&metrics=CapMrktCurUSD,CapMVRVCur&frequency=1d&page_size=1`
        );

        if (!latestResponse.ok) {
            console.error('[API] CoinMetrics latest fetch failed');
            return null;
        }

        const latestJson = await latestResponse.json();
        const latestData = latestJson.data?.[0];

        if (!latestData || !latestData.CapMrktCurUSD || !latestData.CapMVRVCur) {
            console.error('[API] Missing latest data from CoinMetrics');
            return null;
        }

        const currentMarketCap = parseFloat(latestData.CapMrktCurUSD);
        const currentMvrvRatio = parseFloat(latestData.CapMVRVCur);

        // Derive Realized Cap
        const currentRealizedCap = currentMarketCap / currentMvrvRatio;

        // 2. Fetch Historical Market Cap (for StdDev)
        // We need the full history to calculate the "population standard deviation" used in Z-Score
        const historyResponse = await fetch(
            `${COINMETRICS_API}?assets=btc&metrics=CapMrktCurUSD&frequency=1d&page_size=10000`
        );

        if (!historyResponse.ok) {
            console.error('[API] CoinMetrics history fetch failed');
            return null;
        }

        const historyJson = await historyResponse.json();
        const historyRows = historyJson.data;

        if (!historyRows || historyRows.length === 0) {
            console.error('[API] No historical data found');
            return null;
        }

        const marketCaps: number[] = historyRows
            .map((r: any) => parseFloat(r.CapMrktCurUSD))
            .filter((v: number) => !isNaN(v));

        if (marketCaps.length === 0) return null;

        // 3. Calculate Standard Deviation of Market Cap
        const n = marketCaps.length;
        const mean = marketCaps.reduce((a, b) => a + b, 0) / n;
        const variance = marketCaps.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        // 4. Calculate Z-Score
        if (stdDev === 0) return null;

        const zScore = (currentMarketCap - currentRealizedCap) / stdDev;

        console.log('[API] MVRV Z-Score calculated:', {
            marketCap: currentMarketCap,
            realizedCap: currentRealizedCap,
            stdDev,
            zScore
        });

        return zScore;

    } catch (e) {
        console.error('[API] CoinMetrics MVRV calculation error:', e);
        return null;
    }
};

// 3. Puell Multiple
// Daily Coin Issuance (USD) / 365-day MA of Daily Coin Issuance (USD)
export const fetchPuellMultiple = async (): Promise<number | null> => {
    try {
        // 1. Fetch 365 days of price
        const res = await fetch(`${COINGECKO_API}/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily`);
        const data = await res.json();
        const prices: [number, number][] = data.prices; // [timestamp, price]

        if (!prices || prices.length < 365) return null;

        // 2. Calculate Issuance
        // Block Reward Schedule:
        // Before 2024-04-20: 6.25 BTC/block (~900/day)
        // After: 3.125 BTC/block (~450/day)
        // We really just need the daily issuance in USD.
        // Timestamp check for halving.

        const HALVING_DATE = new Date('2024-04-20').getTime();
        const BLOCKS_PER_DAY = 144; // approx

        const getDailyEmission = (ts: number) => {
            const reward = ts < HALVING_DATE ? 6.25 : 3.125;
            return reward * BLOCKS_PER_DAY;
        };

        const issuances = prices.map(([ts, price]) => {
            const coins = getDailyEmission(ts);
            return coins * price; // Daily Issuance in USD
        });

        // 3. Current Issuance (Last day)
        const currentIssuance = issuances[issuances.length - 1];

        // 4. MA365
        const sum = issuances.reduce((a, b) => a + b, 0);
        const ma365 = sum / issuances.length;

        // 5. Puell
        return currentIssuance / ma365;

    } catch (e) {
        console.error('[API] Puell fetch error:', e);
        return null;
    }
};
