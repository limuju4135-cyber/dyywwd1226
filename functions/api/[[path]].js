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
