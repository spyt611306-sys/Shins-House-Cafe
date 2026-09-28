'use strict';

const crypto = require('crypto');

const adminEmail = () => String(process.env.ADMIN_EMAIL || 'admin@shinshouse.local').trim().toLowerCase();
const adminPassword = () => String(process.env.ADMIN_PASSWORD || '');
const sessionSecret = () => String(process.env.ADMIN_SESSION_SECRET || '');
const authConfigured = () => Boolean(adminEmail() && adminPassword() && sessionSecret().length >= 32);

const fail = (code, statusCode = 401) => {
  const error = new Error(code);
  error.statusCode = statusCode;
  throw error;
};

const safeEqual = (a, b) => {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

const b64 = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const unb64 = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
const sign = (payload) => crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');

const issue = (email, type, ttlSeconds) => {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64({ sub: email, type, iat: now, exp: now + ttlSeconds, nonce: crypto.randomBytes(10).toString('hex') });
  return `${payload}.${sign(payload)}`;
};

const verify = (token, expectedType) => {
  if (!authConfigured()) fail('ADMIN_AUTH_NOT_CONFIGURED', 503);
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) fail('ADMIN_AUTH_REQUIRED', 401);
  let data;
  try { data = unb64(payload); } catch { fail('ADMIN_AUTH_REQUIRED', 401); }
  const now = Math.floor(Date.now() / 1000);
  if (data.type !== expectedType || data.exp < now || String(data.sub || '').toLowerCase() !== adminEmail()) fail('ADMIN_AUTH_REQUIRED', 401);
  return data;
};

const login = async (email, password) => {
  if (!authConfigured()) fail('ADMIN_AUTH_NOT_CONFIGURED', 503);
  const normalized = String(email || '').trim().toLowerCase();
  if (!safeEqual(normalized, adminEmail()) || !safeEqual(String(password || ''), adminPassword())) fail('ADMIN_NOT_ALLOWED', 403);
  return {
    access_token: issue(normalized, 'access', 60 * 60 * 8),
    refresh_token: issue(normalized, 'refresh', 60 * 60 * 24 * 30),
    expires_in: 60 * 60 * 8,
    user: { id: 'shinshouse-admin', email: normalized }
  };
};

const refresh = async (refreshToken) => {
  const data = verify(refreshToken, 'refresh');
  return {
    access_token: issue(data.sub, 'access', 60 * 60 * 8),
    refresh_token: issue(data.sub, 'refresh', 60 * 60 * 24 * 30),
    expires_in: 60 * 60 * 8,
    user: { id: 'shinshouse-admin', email: data.sub }
  };
};

const bearer = (event) => {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
};

const requireAdmin = async (event) => {
  const token = bearer(event);
  if (!token) fail('ADMIN_AUTH_REQUIRED', 401);
  const data = verify(token, 'access');
  return { user: { id: 'shinshouse-admin', email: data.sub }, token };
};

const logout = async (event) => {
  await requireAdmin(event);
  return true;
};

module.exports = { authConfigured, login, refresh, requireAdmin, logout };
