'use strict';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const allowlist = () => new Set(
  String(process.env.ADMIN_ALLOWED_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

const authConfigured = () => Boolean(SUPABASE_URL && ANON_KEY && allowlist().size > 0);

const authRequest = async (path, options = {}) => {
  if (!authConfigured()) {
    const error = new Error('ADMIN_AUTH_NOT_CONFIGURED');
    error.statusCode = 503;
    throw error;
  }

  const url = new URL(path, SUPABASE_URL.replace(/\/$/, '') + '/');
  const headers = {
    apikey: ANON_KEY,
    'content-type': 'application/json',
    accept: 'application/json'
  };
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.error_description || data?.msg || data?.message || `AUTH_${response.status}`);
    error.statusCode = response.status;
    throw error;
  }
  return data;
};

const isAllowed = (email) => allowlist().has(String(email || '').trim().toLowerCase());

const login = async (email, password) => {
  const data = await authRequest('auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password }
  });
  if (!isAllowed(data?.user?.email)) {
    const error = new Error('ADMIN_NOT_ALLOWED');
    error.statusCode = 403;
    throw error;
  }
  return data;
};

const refresh = async (refreshToken) => {
  const data = await authRequest('auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken }
  });
  if (!isAllowed(data?.user?.email)) {
    const error = new Error('ADMIN_NOT_ALLOWED');
    error.statusCode = 403;
    throw error;
  }
  return data;
};

const bearer = (event) => {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
};

const requireAdmin = async (event) => {
  const token = bearer(event);
  if (!token) {
    const error = new Error('ADMIN_AUTH_REQUIRED');
    error.statusCode = 401;
    throw error;
  }
  const user = await authRequest('auth/v1/user', { token });
  if (!isAllowed(user?.email)) {
    const error = new Error('ADMIN_NOT_ALLOWED');
    error.statusCode = 403;
    throw error;
  }
  return { user, token };
};

const logout = async (event) => {
  const { token } = await requireAdmin(event);
  await authRequest('auth/v1/logout', { method: 'POST', token });
  return true;
};

module.exports = {
  authConfigured,
  login,
  refresh,
  requireAdmin,
  logout
};
