export interface MarketEvent {
    id: string;
    title: string;
    description: string;
    category?: string;
    source?: string;
    sourceUrl?: string;
    slug: string;
    endDate?: string;
    volume?: string; // Top level volume from specific endpoints
    markets: Market[];
    positiveOutcome?: 'Yes' | 'No'; // Which outcome represents the "Bullish/Positive" scenario?
    active?: boolean;
    closed?: boolean;
}

export interface Market {
    id: string;
    question: string;
    outcomePrices: string | string[] | any; // JSON string or array
    volume: string;
    outcomes: string[] | any; // ["Yes", "No"]
    groupItemTitle?: string; // For grouped markets (e.g. Fed Rates)
    title?: string; // Sometimes markets have individual titles
}

const BASE_URL = 'https://gamma-api.polymarket.com';

export const fetchTopMarkets = async (): Promise<MarketEvent[]> => {
    try {
        // Fetch active events sorted by volume
        const response = await fetch(`${BASE_URL}/events?limit=20&active=true&closed=false&order=volume&ascending=false`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Polymarket data:', error);
        return [];
    }
};
