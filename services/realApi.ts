import { MarketEvent, Market } from './polymarket';

// Polymarket Gamma API
const POLYMARKET_API = 'https://gamma-api.polymarket.com';

// Search for specific markets on Polymarket
export const searchPolymarkets = async (query: string): Promise<MarketEvent[]> => {
    try {
        const response = await fetch(
            `${POLYMARKET_API}/events?limit=10&active=true&closed=false&tag_slug=${encodeURIComponent(query)}`
        );
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error('[API] Polymarket search error:', error);
        return [];
    }
};

// Fetch specific market by slug
export const fetchPolymarketBySlug = async (slug: string): Promise<MarketEvent | null> => {
    try {
        const response = await fetch(`${POLYMARKET_API}/events?slug=${encodeURIComponent(slug)}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data[0] || null;
    } catch (error) {
        console.error('[API] Polymarket slug fetch error:', error);
        return null;
    }
};

// Predefined Polymarket event slugs for our signals
export const POLYMARKET_SLUGS = {
    fed_rate: 'fed-rate-decision-december-18',
    btc_100k: 'will-bitcoin-reach-100k-in-2024',
    eth_etf: 'will-sec-approve-ethereum-spot-etf',
    btc_reserve: 'will-trump-create-strategic-bitcoin-reserve',
    crypto_bill: 'will-congress-pass-crypto-bill-2025',
};

// Fetch real Polymarket data for our prediction market signals
export const fetchRealPolymarketData = async (): Promise<Map<string, MarketEvent>> => {
    const results = new Map<string, MarketEvent>();

    try {
        // Fetch top crypto/economics markets
        const [cryptoMarkets, politicsMarkets] = await Promise.all([
            fetch(`${POLYMARKET_API}/events?limit=20&active=true&closed=false&tag_slug=crypto`).then(r => r.json()).catch(() => []),
            fetch(`${POLYMARKET_API}/events?limit=20&active=true&closed=false&tag_slug=politics`).then(r => r.json()).catch(() => []),
        ]);

        const allMarkets = [...cryptoMarkets, ...politicsMarkets];

        // Find relevant markets by title keywords
        for (const market of allMarkets) {
            const title = (market.title || '').toLowerCase();

            // Bitcoin price targets
            if (title.includes('bitcoin') && (title.includes('100k') || title.includes('$100'))) {
                results.set('btc_price', market);
            }
            // Fed rate decisions
            if (title.includes('fed') && (title.includes('rate') || title.includes('cut'))) {
                results.set('fed_rate', market);
            }
            // Crypto regulation
            if (title.includes('crypto') && (title.includes('bill') || title.includes('legislation'))) {
                results.set('crypto_bill', market);
            }
            // Strategic reserve
            if (title.includes('bitcoin') && title.includes('reserve')) {
                results.set('btc_reserve', market);
            }
            // ETH ETF
            if (title.includes('ethereum') && title.includes('etf')) {
                results.set('eth_etf', market);
            }
        }

        console.log('[API] Found Polymarket data:', results.size, 'markets');
    } catch (error) {
        console.error('[API] Polymarket batch fetch error:', error);
    }

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
export const fetchAllRealData = async () => {
    const [polymarkets, btcDominance, fearGreed] = await Promise.all([
        fetchRealPolymarketData(),
        fetchBtcDominance(),
        fetchFearGreedIndex(),
    ]);

    return {
        polymarkets,
        btcDominance,
        fearGreed,
    };
};
