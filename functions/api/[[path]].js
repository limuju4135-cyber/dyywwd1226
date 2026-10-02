/**
 * Cloudflare Pages Function — private JSON gateway
 *
 * Required Pages R2 binding:
 *   MEDIA_BUCKET -> dyywwd1226-media
 *
 * Browser-visible requests stay on dyw261226.pages.dev.
 * The private R2 bucket is never exposed directly.
 */

const JSON_OBJECTS = Object.freeze({
  '/api/invitation': 'data/invitation.json',
  '/api/contacts': 'data/contacts.json',
  '/api/accounts': 'data/accounts.json',
  '/api/gallery': 'data/gallery.json'
});

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': 'GET, HEAD',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (url.pathname === '/api/special-gallery') {
    return specialGalleryIndex(request, env);
  }

  const key = JSON_OBJECTS[url.pathname];
  if (!key) {
    return jsonError('Not Found', 404);
  }

  if (!env.MEDIA_BUCKET) {
    return jsonError('R2 binding unavailable', 500);
  }

  const object = request.method === 'HEAD'
    ? await env.MEDIA_BUCKET.head(key)
    : await env.MEDIA_BUCKET.get(key);

  if (!object) {
    return jsonError('Not Found', 404);
  }

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

  let text;
  try {
    text = await object.text();
    JSON.parse(text);
  } catch {
    return jsonError('Invalid JSON', 500);
  }

  return new Response(text, { status: 200, headers });
}

async function specialGalleryIndex(request, env) {
  if (!env.MEDIA_BUCKET) {
    return jsonError('R2 binding unavailable', 500);
  }

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

  const listed = await env.MEDIA_BUCKET.list({ prefix: 'special/' });

  const images = listed.objects
    .map(object => object.key)
    .filter(key =>
      /^special\/[A-Za-z0-9._-]+\.(webp|avif|jpg|jpeg|png)$/i.test(key)
    )
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return new Response(JSON.stringify({ images }), {
    status: 200,
    headers
  });
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin'
    }
  });
}
