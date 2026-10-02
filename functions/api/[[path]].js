/**
 * Cloudflare Pages Function — private JSON + special playground gateway
 *
 * Required Pages R2 binding:
 *   MEDIA_BUCKET -> dyywwd1226-media
 */

const JSON_OBJECTS = Object.freeze({
  '/api/invitation': 'data/invitation.json',
  '/api/contacts': 'data/contacts.json',
  '/api/accounts': 'data/accounts.json',
  '/api/gallery': 'data/gallery.json'
});

const MESSAGE_PREFIX = 'messages/';
const MESSAGE_LIMIT = 100;
const ADMIN_PIN_SHA256 = '151c9df1bd78ddc4d98eab39c7c9f8220f0b16f9f6d535c956e95eab97435d12';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.pathname === '/api/messages' || url.pathname.startsWith('/api/messages/')) {
    return messageGateway(request, env, url);
  }

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

  const headers = jsonHeaders();

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

async function messageGateway(request, env, url) {
  if (!env.MEDIA_BUCKET) {
    return jsonError('R2 binding unavailable', 500);
  }

  const pathname = url?.pathname || new URL(request.url).pathname;

  if (pathname === '/api/messages/admin/verify') {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          'Allow': 'POST',
          'Cache-Control': 'no-store'
        }
      });
    }

    return verifyAdminPin(request);
  }

  const messageMatch = pathname.match(
    /^\/api\/messages\/(\d{13}-[A-Za-z0-9-]+)$/
  );

  if (messageMatch) {
    if (request.method !== 'DELETE') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          'Allow': 'DELETE',
          'Cache-Control': 'no-store'
        }
      });
    }

    return deleteMessage(request, env, messageMatch[1]);
  }

  if (pathname !== '/api/messages') {
    return jsonError('Not Found', 404);
  }

  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: {
        ...jsonHeaders(),
        'Allow': 'GET, HEAD, POST'
      }
    });
  }

  if (request.method === 'GET') {
    return listMessages(env);
  }

  if (request.method === 'POST') {
    return createMessage(request, env);
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: {
      'Allow': 'GET, HEAD, POST',
      'Cache-Control': 'no-store'
    }
  });
}

async function verifyAdminPin(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const valid = await isValidAdminPin(payload?.pin);

  if (!valid) {
    return jsonError('Invalid PIN', 403);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: jsonHeaders()
  });
}

async function deleteMessage(request, env, id) {
  const pin = request.headers.get('X-Admin-Pin') || '';

  if (!(await isValidAdminPin(pin))) {
    return jsonError('Forbidden', 403);
  }

  const key = MESSAGE_PREFIX + id + '.json';
  const existing = await env.MEDIA_BUCKET.head(key);

  if (!existing) {
    return jsonError('Not Found', 404);
  }

  await env.MEDIA_BUCKET.delete(key);

  return new Response(JSON.stringify({ ok: true, id }), {
    status: 200,
    headers: jsonHeaders()
  });
}

async function isValidAdminPin(pin) {
  const normalized = String(pin ?? '').trim();

  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  );

  const hex = [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  return constantTimeEqual(hex, ADMIN_PIN_SHA256);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;

  let mismatch = 0;

  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

async function listMessages(env) {
  const listed = await env.MEDIA_BUCKET.list({
    prefix: MESSAGE_PREFIX,
    limit: 1000
  });

  const keys = listed.objects
    .map(object => object.key)
    .filter(key => /^messages\/\d{13}-[A-Za-z0-9-]+\.json$/.test(key))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, MESSAGE_LIMIT);

  const messages = (
    await Promise.all(
      keys.map(async key => {
        try {
          const object = await env.MEDIA_BUCKET.get(key);
          if (!object) return null;

          const data = JSON.parse(await object.text());

          return {
            id: key.slice(MESSAGE_PREFIX.length, -5),
            name: cleanText(data.name, 20) || '익명',
            message: cleanText(data.message, 80),
            createdAt: Number(data.createdAt) || Number(key.slice(9, 22))
          };
        } catch {
          return null;
        }
      })
    )
  ).filter(item => item && item.message);

  return new Response(JSON.stringify({ messages }), {
    status: 200,
    headers: jsonHeaders()
  });
}

async function createMessage(request, env) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const name = cleanText(payload?.name, 20) || '익명';
  const message = cleanText(payload?.message, 80);

  if (!message) {
    return jsonError('Message required', 400);
  }

  const createdAt = Date.now();
  const id = `${createdAt}-${crypto.randomUUID()}`;
  const key = `${MESSAGE_PREFIX}${id}.json`;

  const record = {
    name,
    message,
    createdAt
  };

  await env.MEDIA_BUCKET.put(key, JSON.stringify(record), {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8'
    }
  });

  return new Response(
    JSON.stringify({
      id,
      ...record
    }),
    {
      status: 201,
      headers: jsonHeaders()
    }
  );
}

function cleanText(value, maxLength) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

async function specialGalleryIndex(request, env) {
  if (!env.MEDIA_BUCKET) {
    return jsonError('R2 binding unavailable', 500);
  }

  const headers = jsonHeaders();

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

function jsonHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: jsonHeaders()
  });
}
