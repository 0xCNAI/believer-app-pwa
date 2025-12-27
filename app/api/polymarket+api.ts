export async function GET(request: Request) {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Construct upstream URL
    const upstreamUrl = new URL('https://gamma-api.polymarket.com/events');
    searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.append(key, value);
    });

    try {
        const res = await fetch(upstreamUrl.toString(), {
            headers: {
                'Accept': 'application/json',
                // 'User-Agent': 'BelieverApp/1.0' // Optional, sometimes prevents blocking
            }
        });

        if (!res.ok) {
            return Response.json({ error: 'Upstream error' }, { status: res.status });
        }

        const data = await res.json();
        return Response.json(data);
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
