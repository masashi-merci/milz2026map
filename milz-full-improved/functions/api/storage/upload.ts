type PagesContext = {
  request: Request;
  env: {
    R2_BUCKET?: {
      put: (key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob, options?: { httpMetadata?: { contentType?: string } }) => Promise<void>;
    };
    R2_PUBLIC_DOMAIN?: string;
  };
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
    ...init,
  });
}

export const onRequestPost = async ({ request, env }: PagesContext) => {
  try {
    if (!env.R2_BUCKET) {
      return json({ error: 'R2 bucket binding is missing' }, { status: 500 });
    }

    const body = await request.json() as { fileName?: string; contentType?: string };
    const fileName = (body.fileName || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
    const contentType = body.contentType || 'application/octet-stream';

    const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
    const uploadUrl = new URL(request.url);
    uploadUrl.pathname = '/api/storage/upload';
    uploadUrl.searchParams.set('key', key);

    const publicBase = (env.R2_PUBLIC_DOMAIN || '').replace(/\/$/, '');

    return json({
      signedUrl: uploadUrl.toString(),
      publicUrl: publicBase ? `${publicBase}/${key}` : key,
      key,
      method: 'PUT',
      contentType,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
};

export const onRequestPut = async ({ request, env }: PagesContext) => {
  try {
    if (!env.R2_BUCKET) {
      return json({ error: 'R2 bucket binding is missing' }, { status: 500 });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return json({ error: 'Missing key' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const body = await request.blob();
    await env.R2_BUCKET.put(key, body, {
      httpMetadata: { contentType },
    });

    return new Response(null, { status: 200 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
};
