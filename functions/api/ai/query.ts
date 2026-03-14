import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { concretizeTrends, type TrendItem } from '../../_shared/trend-place-map';

export interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

type Mode = 'recommend' | 'trend';

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
    },
  });

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const buildCacheKey = async (mode: Mode, location: string, category: string) => {
  const source = `${mode}|${normalize(location)}|${normalize(category || 'general')}`;
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const timeoutFetch = async <T>(promiseFactory: () => Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promiseFactory(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Upstream timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const verifyAuth = async (request: Request, env: Env): Promise<AuthResult> => {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { ok: false, response: json({ error: 'Supabase auth is not configured' }, 500) };
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }

  return { ok: true, userId: data.user.id };
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: corsHeaders,
  });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const auth = await verifyAuth(request, env);
    if (!auth.ok) return auth.response;

    if (!env.GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY is not configured' }, 500);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mode: Mode = body?.mode === 'trend' ? 'trend' : 'recommend';
    const location = String(body?.location || 'Current map area').trim().slice(0, 120);
    const category = String(body?.category || 'general').trim().slice(0, 80);

    const bodyRefresh = Boolean(body?.refresh);
    const cacheKey = await buildCacheKey(mode, location, category);
    const cacheUrl = new URL(`https://edge-cache.local/api-ai-${cacheKey}`);
    const cache = caches.default;
    const canUseCache = !(mode === 'trend' && bodyRefresh);
    const cached = canUseCache ? await cache.match(cacheUrl.toString()) : null;
    if (cached) {
      return new Response(cached.body, { status: 200, headers: { ...Object.fromEntries(cached.headers.entries()), ...corsHeaders, 'X-AI-Cache': 'HIT' } });
    }

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    let prompt = '';
    let responseSchema: any = {};
    let maxOutputTokens = 500;
    let temperature = 0.3;
    let ttlSeconds = 60 * 60 * 24 * 7;
    let staleWhileRevalidateSeconds = 60 * 60 * 24;

    if (mode === 'recommend') {
      prompt = [
        'You are a concise local discovery assistant.',
        `For the location "${location}", suggest exactly 5 practical spots.`,
        'Prefer stable categories such as restaurants, cafes, shops, parks, transit, and landmarks.',
        'Keep each reason short, concrete, and under 90 characters when possible.',
        'If coordinates are uncertain, return a reasonable estimate near the target area.',
        'Return JSON only.',
      ].join('\n');

      responseSchema = {
        type: Type.OBJECT,
        properties: {
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
                category: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
              },
              required: ['name', 'reason', 'category', 'lat', 'lng'],
            },
          },
        },
        required: ['recommendations'],
      };
      ttlSeconds = 60 * 60 * 24 * 14;
      staleWhileRevalidateSeconds = 60 * 60 * 24 * 2;
    } else {
      prompt = [
        'You are a concise bilingual local trends assistant.',
        `For the location "${location}" and category "${category}", provide exactly 5 local trends.`,
        'Abstract keywords are allowed, but every trend must be convertible to specific local names. Pair topics like cafe hopping or grape picking with actual areas, facilities, or venue names.',
        'If an exact venue is uncertain, prefer a concrete area name over an abstract topic.',
        'Favor durable local interests, seasonal movement, events, transit, food, and shopping themes.',
        'Keep descriptions short and practical.',
        'Return JSON only.',
      ].join('\n');

      responseSchema = {
        type: Type.OBJECT,
        properties: {
          trends: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic_ja: { type: Type.STRING },
                topic_en: { type: Type.STRING },
                description_ja: { type: Type.STRING },
                description_en: { type: Type.STRING },
                category: { type: Type.STRING },
                popularity: { type: Type.NUMBER },
              },
              required: ['topic_ja', 'topic_en', 'description_ja', 'description_en', 'category', 'popularity'],
            },
          },
        },
        required: ['trends'],
      };
      maxOutputTokens = 800;
      temperature = 0.35;
      ttlSeconds = 60 * 60 * 24;
      staleWhileRevalidateSeconds = 60 * 60 * 6;
    }

    const response = await timeoutFetch(
      () =>
        ai.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
            maxOutputTokens,
            temperature,
          },
        }),
      8000,
    );

    const text = response.text;
    if (!text) {
      return json({ error: 'Empty AI response' }, 502);
    }

    const parsed = JSON.parse(text);
    if (mode === 'trend' && Array.isArray(parsed?.trends)) {
      parsed.trends = concretizeTrends(location, category, parsed.trends as TrendItem[]);
    }
    const payload = JSON.stringify({
      ...parsed,
      generatedAt: new Date().toISOString(),
      mode,
      location,
      category,
    });
    const cacheable = new Response(payload, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
        'X-AI-Cache': 'MISS',
      },
    });

    await cache.put(cacheUrl.toString(), cacheable.clone());
    return cacheable;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI request failed';
    return json({ error: message }, 500);
  }
};
