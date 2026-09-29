import adminModule from './admin.js';

const legacyHandler = adminModule?.handler || adminModule?.default?.handler;

function toResponse(result = {}) {
  return new Response(result.body ?? '', {
    status: Number(result.statusCode || 200),
    headers: result.headers || { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export default async request => {
  if (typeof legacyHandler !== 'function') {
    return new Response(JSON.stringify({ ok: false, code: 'ADMIN_HANDLER_UNAVAILABLE' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const url = new URL(request.url);
  const event = {
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    queryStringParameters: {
      ...Object.fromEntries(url.searchParams.entries()),
      route: String(url.searchParams.get('route') || '').replace(/^\/+|\/+$/g, '')
    },
    body: ['GET', 'HEAD'].includes(request.method) ? null : await request.text(),
    rawUrl: request.url,
    path: url.pathname
  };

  return toResponse(await legacyHandler(event));
};
