import { buildRecommendations, buildTrends, type ApiPlace, type LocationInput } from '../../_shared/local-discovery';

type PagesContext = {
  request: Request;
  env: Record<string, string | undefined>;
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300',
      ...(init.headers || {}),
    },
    ...init,
  });
}

export const onRequestPost = async (context: PagesContext) => {
  try {
    const body = await context.request.json() as {
      mode?: 'recommend' | 'trend';
      trendCategory?: string;
      location?: LocationInput;
      places?: ApiPlace[];
    };

    const mode = body.mode || 'recommend';
    const location = body.location || {};
    const places = Array.isArray(body.places) ? body.places : [];

    if (mode === 'trend') {
      const result = buildTrends(location, body.trendCategory);
      const ttl = result.freshnessMinutes <= 20 ? 900 : 7200;
      return json(result, {
        headers: {
          'cache-control': `public, max-age=60, s-maxage=${ttl}, stale-while-revalidate=300`,
        },
      });
    }

    return json(buildRecommendations(location, places), {
      headers: {
        'cache-control': 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
};
