import { getStore, getDeployStore } from '@netlify/blobs';
import adminAuth from './_lib/admin-auth.js';

const { requireAdmin } = adminAuth;

const DEFAULT_MEDIA = {
  hero: '/assets/hero-20260928.webp',
  logo: '/assets/logo-20260928.webp',
  americano_hot: '/assets/americano-hot.webp',
  americano_iced: '/assets/americano-iced.webp',
  cafe_latte: '/assets/cafe-latte.webp',
  cappuccino: '/assets/cappuccino.webp',
  vanilla_latte: '/assets/vanilla-latte.webp',
  cream_coffee: '/assets/cream-coffee.webp'
};

const allowedKeys = new Set(Object.keys(DEFAULT_MEDIA));
const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

function production() {
  return String(process.env.CONTEXT || '').toLowerCase() === 'production';
}
function store(name) {
  return production() ? getStore(name, { consistency: 'strong' }) : getDeployStore(name);
}
function eventFromRequest(request) {
  return { headers: Object.fromEntries(request.headers.entries()) };
}
function cleanMediaConfig(input = {}) {
  const result = { ...DEFAULT_MEDIA };
  for (const key of allowedKeys) {
    const value = String(input[key] || '').trim();
    if (!value) continue;
    if (!/^(?:\/assets\/|\/media\/|https:\/\/)/i.test(value)) continue;
    result[key] = value.slice(0, 1000);
  }
  return result;
}
async function getConfig() {
  const saved = await store('shins-house-content').get('homepage-media', { type: 'json' });
  return cleanMediaConfig(saved || DEFAULT_MEDIA);
}
function contentTypeFromKey(key) {
  if (/\.png$/i.test(key)) return 'image/png';
  if (/\.jpe?g$/i.test(key)) return 'image/jpeg';
  if (/\.gif$/i.test(key)) return 'image/gif';
  return 'image/webp';
}

export default async (request) => {
  const url = new URL(request.url);
  const route = String(url.searchParams.get('route') || '').replace(/^\/+|\/+$/g, '');
  const method = request.method.toUpperCase();

  try {
    if (method === 'GET' && route === 'site-content') {
      return json(200, { ok: true, media: await getConfig() });
    }

    if (method === 'GET' && route.startsWith('media/')) {
      const key = route.slice('media/'.length);
      if (!/^[a-zA-Z0-9._/-]+$/.test(key)) return new Response('Not found', { status: 404 });
      const value = await store('shins-house-media').get(key, { type: 'arrayBuffer' });
      if (!value) return new Response('Not found', { status: 404 });
      return new Response(value, {
        status: 200,
        headers: {
          'content-type': contentTypeFromKey(key),
          'cache-control': 'public, max-age=31536000, immutable',
          'x-content-type-options': 'nosniff'
        }
      });
    }

    if (route === 'admin/config' && ['POST', 'PUT'].includes(method)) {
      await requireAdmin(eventFromRequest(request));
      const body = await request.json();
      const media = cleanMediaConfig(body?.media || body || {});
      await store('shins-house-content').setJSON('homepage-media', media);
      return json(200, { ok: true, media });
    }

    if (route === 'admin/upload' && method === 'POST') {
      await requireAdmin(eventFromRequest(request));
      const body = await request.json();
      const filename = String(body?.filename || 'image.webp').slice(0, 180);
      const match = String(body?.data_url || '').match(/^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/i);
      if (!match) return json(400, { ok: false, code: 'INVALID_IMAGE', message: 'WEBP, PNG, JPG 이미지만 업로드할 수 있습니다.' });
      const bytes = Buffer.from(match[2], 'base64');
      if (!bytes.length || bytes.length > 5 * 1024 * 1024) return json(400, { ok: false, code: 'IMAGE_TOO_LARGE', message: '이미지는 5MB 이하로 업로드해 주세요.' });
      const ext = match[1].toLowerCase() === 'image/png' ? 'png' : match[1].toLowerCase() === 'image/jpeg' ? 'jpg' : 'webp';
      const safeBase = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';
      const key = `${Date.now()}-${crypto.randomUUID()}-${safeBase}.${ext}`;
      await store('shins-house-media').set(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      return json(201, { ok: true, url: `/media/${key}` });
    }

    return json(404, { ok: false, code: 'NOT_FOUND' });
  } catch (error) {
    const code = String(error?.message || 'CONTENT_ERROR');
    if (code === 'ADMIN_AUTH_REQUIRED') return json(401, { ok: false, code });
    if (code === 'ADMIN_NOT_ALLOWED') return json(403, { ok: false, code });
    if (code === 'ADMIN_AUTH_NOT_CONFIGURED') return json(503, { ok: false, code, message: '관리자 인증 설정이 필요합니다.' });
    console.error('[content]', error);
    return json(500, { ok: false, code: 'CONTENT_ERROR', message: '콘텐츠 처리 중 오류가 발생했습니다.' });
  }
};
