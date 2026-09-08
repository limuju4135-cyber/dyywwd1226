/**
 * Cloudflare Pages Function — private R2 media gateway
 *
 * Required Pages R2 binding:
 *   MEDIA_BUCKET -> dyywwd1226-media
 *
 * Requests are same-origin, for example:
 *   /media/gallery/4.webp
 *   /media/hero/2.webp
 *   /media/og/6.jpg
 */

export async function onRequest(context) {
  const { request, env, params } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': 'GET, HEAD',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (!env.MEDIA_BUCKET) {
    return new Response('R2 binding unavailable', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  const rawPath = Array.isArray(params.path)
    ? params.path.join('/')
    : String(params.path || '');

  let key;
  try {
    key = decodeURIComponent(rawPath).replace(/^\/+/, '');
  } catch {
    return notFound();
  }

  const valid =
    /^(hero|gallery|og|ending)\/[A-Za-z0-9._-]+\.(webp|avif|jpg|jpeg|png)$/i.test(key);

  if (!valid) {
    return notFound();
  }

  const object = request.method === 'HEAD'
    ? await env.MEDIA_BUCKET.head(key)
    : await env.MEDIA_BUCKET.get(key);

  if (!object) {
    return notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', contentTypeFromKey(key));
  }

  if (object.httpEtag) {
    headers.set('ETag', object.httpEtag);
  }

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Referrer-Policy', 'no-referrer');

  if (key.startsWith('og/')) {
    headers.set('Cache-Control', 'public, max-age=86400, immutable');
  } else {
    headers.set('Cache-Control', 'private, max-age=3600');
  }

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

  return new Response(object.body, {
    status: 200,
    headers
  });
}

function notFound() {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function contentTypeFromKey(key) {
  const ext = key.split('.').pop().toLowerCase();
  return ({
    webp: 'image/webp',
    avif: 'image/avif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  })[ext] || 'application/octet-stream';
}
