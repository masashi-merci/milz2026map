type PagesContext = { request: Request };

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
    ...init,
  });
}

export const onRequestPost = async ({ request }: PagesContext) => {
  try {
    const body = await request.json() as { query?: string };
    const query = body.query?.trim();
    if (!query) {
      return json({ error: 'Missing query' }, { status: 400 });
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'accept-language': 'ja,en;q=0.8',
        'user-agent': 'milz-app/1.0 (cloudflare-pages-function)',
      },
    });

    if (!response.ok) {
      return json({ error: 'Failed to geocode' }, { status: 502 });
    }

    const results = await response.json() as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) {
      return json({ error: 'Location not found' }, { status: 404 });
    }

    return json({ lat: Number(first.lat), lng: Number(first.lon) }, {
      headers: {
        'cache-control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
};
