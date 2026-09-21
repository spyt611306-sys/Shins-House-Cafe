import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);

// CI must exercise the same fail-safe state used before production secrets are configured.
for (const key of [
  'SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ANON_KEY',
  'ACTION_TOKEN_SECRET','ADMIN_ALLOWED_EMAILS','BANK_NAME','BANK_ACCOUNT_NUMBER',
  'BANK_ACCOUNT_HOLDER','BUSINESS_NUMBER','MAIL_ORDER_NUMBER','PRIVACY_OFFICER',
  'CUSTOMER_EMAIL'
]) delete process.env[key];
process.env.COMMERCE_ENABLED = 'false';
process.env.SUBSCRIPTIONS_ENABLED = 'false';
process.env.LEGAL_APPROVED = 'false';

const { handler: api } = require('../netlify/functions/api.js');
const { handler: admin } = require('../netlify/functions/admin.js');
const { handler: legal } = require('../netlify/functions/legal.js');

const event = (method, route, body, headers = {}) => ({
  httpMethod: method,
  queryStringParameters: { route },
  headers,
  body: body === undefined ? null : JSON.stringify(body)
});

const bodyJson = (response) => JSON.parse(response.body || '{}');

const bootstrap = await api(event('GET', 'bootstrap'));
assert.equal(bootstrap.statusCode, 200, 'bootstrap must remain available');
const bootstrapBody = bodyJson(bootstrap);
assert.equal(bootstrapBody.settings.commerce_ready, false, 'commerce must fail closed without secrets');
assert.ok(Array.isArray(bootstrapBody.products) && bootstrapBody.products.length > 0, 'catalog fallback must render');

const ready = await api(event('GET', 'health/ready'));
assert.equal(ready.statusCode, 200, 'readiness endpoint must be observable');
const readyBody = bodyJson(ready);
assert.equal(readyBody.ok, false, 'readiness must report false before launch configuration');
assert.ok(Array.isArray(readyBody.blockers) && readyBody.blockers.length > 0, 'readiness must expose blockers');

const order = await api(event('POST', 'orders', {
  name: '테스트', phone: '01012345678', address: '부산광역시 테스트 주소',
  items: [{ product_id: 1, quantity: 1 }],
  consents: { terms: true, privacy: true, refund: true }
}));
assert.equal(order.statusCode, 503, 'orders must never succeed while commerce is disabled');
assert.equal(bodyJson(order).code, 'COMMERCE_NOT_READY');

const adminResponse = await admin(event('GET', 'bootstrap'));
assert.ok([401, 503].includes(adminResponse.statusCode), 'admin bootstrap must reject unauthenticated/unconfigured requests');

const terms = await legal(event('GET', 'terms'));
assert.equal(terms.statusCode, 200, 'legal terms page must be available');
assert.match(terms.body, /noindex,nofollow/, 'draft legal pages must stay out of search indexes');
assert.match(terms.body, /상용화 준비 중/, 'draft legal page must visibly disclose draft state');

const missing = await api(event('GET', 'does-not-exist'));
assert.equal(missing.statusCode, 404, 'unknown API routes must return 404');

console.log('Smoke tests passed: bootstrap, readiness, commerce fail-safe, admin rejection, legal draft gate, 404.');
