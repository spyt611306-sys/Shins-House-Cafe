'use strict';

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const configured = () => Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const request = async (path, options = {}) => {
  if (!configured()) {
    const error = new Error('SUPABASE_NOT_CONFIGURED');
    error.statusCode = 503;
    throw error;
  }

  const url = new URL(path, SUPABASE_URL.replace(/\/$/, '') + '/');
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
    accept: 'application/json'
  };
  if (options.prefer) headers.prefer = options.prefer;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const error = new Error(data?.message || data?.hint || data?.code || `SUPABASE_${response.status}`);
    error.statusCode = response.status;
    error.supabase = data;
    throw error;
  }
  return data;
};

const rest = (table, options = {}) => request(`rest/v1/${table}`, options);
const rpc = (name, body) => request(`rest/v1/rpc/${name}`, { method: 'POST', body });

const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const clientIpHash = (event, scope) => {
  const raw = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for']?.split(',')[0] || 'unknown';
  return sha256(`${scope}|${String(raw).trim()}`);
};

const rateLimit = async (event, scope, limit, windowSeconds) => {
  const allowed = await rpc('check_rate_limit', {
    p_key: `${scope}:${clientIpHash(event, scope)}`,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });
  return allowed === true;
};

const actionToken = (orderId, phoneNormalized) => {
  const secret = process.env.ACTION_TOKEN_SECRET || '';
  if (!secret) throw new Error('ACTION_TOKEN_SECRET_NOT_CONFIGURED');
  return crypto.createHmac('sha256', secret).update(`${orderId}|${phoneNormalized}`).digest('base64url');
};

const verifyActionToken = (token, orderId, phoneNormalized) => {
  if (!token) return false;
  const expected = actionToken(orderId, phoneNormalized);
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = {
  configured,
  request,
  rest,
  rpc,
  randomToken,
  sha256,
  normalizePhone,
  rateLimit,
  actionToken,
  verifyActionToken
};
