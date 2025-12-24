export interface MarketEvent {
    id: string;
    title: string;
    description: string;
    category?: string;
    source?: string;
    slug: string;
    markets: Market[];
}

export interface Market {
    id: string;
    question: string;
    outcomePrices: string[]; // JSON string of prices e.g. "[\"0.3\", \"0.7\"]"
    volume: string;
    outcomes: string[]; // ["Yes", "No"]
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
