/**
 * News Service - Fetches news from Google News RSS
 * Free, no API key required
 */

import * as https from 'https';

export interface NewsItem {
    headline: string;
    url: string;
    sourceDate: number;
}

// Category to search query mapping
const CATEGORY_QUERIES: Record<string, string> = {
    'Macro': 'bitcoin macroeconomics OR federal reserve crypto OR interest rate bitcoin',
    'Structural': 'bitcoin ETF OR bitcoin halving OR bitcoin institutional adoption',
    'Political': 'crypto regulation OR SEC bitcoin OR government cryptocurrency',
    'Narrative': 'bitcoin market sentiment OR crypto fear greed OR web3 trends'
};

/**
 * Fetch news from Google News RSS
 */
export async function fetchNewsForCategory(category: string): Promise<NewsItem[]> {
    const query = CATEGORY_QUERIES[category] || 'bitcoin cryptocurrency';
    const encodedQuery = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

    console.log(`[NewsService] Fetching news for: ${category}`);

    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => { data += chunk; });

            res.on('end', () => {
                try {
                    // Parse RSS XML
                    const items = parseRssItems(data);
                    console.log(`[NewsService] Found ${items.length} items for ${category}`);
                    resolve(items.slice(0, 5)); // Return top 5 for evaluation
                } catch (error) {
                    console.error('[NewsService] Parse error:', error);
                    resolve([]);
                }
            });

        }).on('error', (error) => {
            console.error('[NewsService] Fetch error:', error);
            resolve([]);
        });
    });
}

/**
 * Simple RSS XML parser (no external dependencies)
 */
function parseRssItems(xml: string): NewsItem[] {
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;

    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];

        const titleMatch = titleRegex.exec(itemXml);
        const linkMatch = linkRegex.exec(itemXml);
        const dateMatch = pubDateRegex.exec(itemXml);

        if (titleMatch && linkMatch) {
            const headline = (titleMatch[1] || titleMatch[2] || '').trim();
            const url = linkMatch[1].trim();
            const sourceDate = dateMatch
                ? new Date(dateMatch[1]).getTime()
                : Date.now();

            // Skip if headline contains unwanted patterns
            if (headline && !headline.includes('Google News')) {
                items.push({ headline, url, sourceDate });
            }
        }
    }

    return items;
}
