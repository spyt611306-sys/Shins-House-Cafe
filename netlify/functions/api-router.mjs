import apiModule from './api.js';
import adminModule from './admin.js';
import legalModule from './legal.js';
import contentHandler from './content.mjs';

const publicHandler = apiModule?.handler || apiModule?.default?.handler;
const adminHandler = adminModule?.handler || adminModule?.default?.handler;
const legalHandler = legalModule?.handler || legalModule?.default?.handler;

function legacyResponse(result = {}) {
  const headers = new Headers(result.headers || {});
  return new Response(result.body ?? '', {
    status: Number(result.statusCode || 200),
    headers
  });
}

async function legacyEvent(request, route) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  query.route = route;
  return {
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    queryStringParameters: query,
    body: ['GET', 'HEAD'].includes(request.method) ? null : await request.text(),
    rawUrl: request.url,
    path: url.pathname
  };
}

async function contentRequest(request, route) {
  const url = new URL(request.url);
  url.searchParams.set('route', route);
  const init = {
    method: request.method,
    headers: request.headers
  };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = await request.arrayBuffer();
  return new Request(url.toString(), init);
}

export default async (request, context) => {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '');

  if (pathname === '/api/site-content' || pathname.startsWith('/api/site-content/')) {
    const suffix = pathname.slice('/api/site-content'.length).replace(/^\/+/, '');
    const route = suffix || 'site-content';
    return contentHandler(await contentRequest(request, route), context);
  }

  if (pathname.startsWith('/api/admin/')) {
    if (typeof adminHandler !== 'function') return new Response('Admin API unavailable', { status: 503 });
    const route = pathname.slice('/api/admin/'.length);
    return legacyResponse(await adminHandler(await legacyEvent(request, route), context));
  }

  if (pathname.startsWith('/api/legal/')) {
    if (typeof legalHandler !== 'function') return new Response('Legal API unavailable', { status: 503 });
    const route = pathname.slice('/api/legal/'.length);
    return legacyResponse(await legalHandler(await legacyEvent(request, route), context));
  }

  if (typeof publicHandler !== 'function') return new Response('Commerce API unavailable', { status: 503 });
  const route = pathname.slice('/api/'.length);
  return legacyResponse(await publicHandler(await legacyEvent(request, route), context));
};

export const config = {
  path: '/api/*'
};
