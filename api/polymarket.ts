import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Construct upstream URL
    const upstreamUrl = new URL('https://gamma-api.polymarket.com/events');

    // Forward query params
    Object.entries(req.query).forEach(([key, value]) => {
        if (typeof value === 'string') {
            upstreamUrl.searchParams.append(key, value);
        }
    });

    try {
        const response = await fetch(upstreamUrl.toString(), {
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Upstream error' });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}
