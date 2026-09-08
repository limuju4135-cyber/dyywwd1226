/**
 * Pages middleware — scrub legacy workers.dev URL from runtime HTML.
 *
 * This does not hide resources delivered to the browser. It only ensures
 * runtime HTML/metadata no longer exposes the legacy Worker hostname.
 */
export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('Content-Type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  const original = await response.text();
  const rewritten = original.replaceAll(
    'https://dyywwd-media.limuju4135.workers.dev',
    'https://dyw261226.pages.dev'
  );

  const headers = new Headers(response.headers);
  headers.delete('Content-Length');

  return new Response(rewritten, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
