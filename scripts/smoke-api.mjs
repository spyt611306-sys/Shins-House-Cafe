import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
for (const key of ['ACTION_TOKEN_SECRET','ADMIN_EMAIL','ADMIN_PASSWORD','ADMIN_SESSION_SECRET']) delete process.env[key];
process.env.COMMERCE_ENABLED = 'false';
process.env.LEGAL_APPROVED = 'false';

const { handler: api } = require('../netlify/functions/api.js');
const { handler: admin } = require('../netlify/functions/admin.js');
const { handler: legal } = require('../netlify/functions/legal.js');
const event = (method, route, body, headers = {}) => ({ httpMethod:method, queryStringParameters:{route}, headers, body:body===undefined?null:JSON.stringify(body) });
const bodyJson = response => JSON.parse(response.body || '{}');

const ready = await api(event('GET','health/ready'));
assert.equal(ready.statusCode, 200);
assert.equal(bodyJson(ready).ok, false);
assert.ok(bodyJson(ready).blockers.includes('COMMERCE_DISABLED'));

const order = await api(event('POST','orders', { customer_name:'테스트', phone:'01012345678', shipping_address:'부산 테스트 주소', items:[{product_id:5,quantity:1}], consents:{terms:true,privacy:true,refund:true} }));
assert.equal(order.statusCode, 503, 'orders must fail closed when commerce is disabled');

const adminResponse = await admin(event('GET','bootstrap'));
assert.ok([401,503].includes(adminResponse.statusCode), 'admin must reject requests without configured credentials');

const terms = await legal(event('GET','terms'));
assert.equal(terms.statusCode, 200);

const catalog = JSON.parse(fs.readFileSync('netlify/functions/_lib/bean-catalog.json','utf8'));
assert.deepEqual(catalog.map(({name,price})=>({name,price})), [
  {name:'에티오피아 싱글',price:27000},
  {name:'고소 블랜딩',price:22000},
  {name:'다크 블랜딩',price:22000}
]);
assert.ok(catalog.every(item => Array.isArray(item.gallery) && item.gallery.length === 3));

const missing = await api(event('GET','does-not-exist'));
assert.equal(missing.statusCode, 404);
console.log('Smoke tests passed: fail-closed commerce, admin protection, legal route and three-bean catalog.');
