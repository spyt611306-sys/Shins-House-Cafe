'use strict';

const crypto = require('crypto');

const ORDER_STATUSES = ['입금 대기','입금 확인 요청','입금 확인','상품 준비','배송 중','배송 완료','주문 취소','환불 완료'];
const DEFAULT_PRODUCTS = [
  { id: 5, name: '에티오피아 싱글', category: 'coffee', description: '화사한 꽃향기와 복숭아, 시트러스의 산뜻한 여운', price: 27000, stock: 30, low_stock_threshold: 5, image: 'assets/ethiopia-single-1.webp', active: true, sort_order: 1 },
  { id: 6, name: '고소 블랜딩', category: 'coffee', description: '고소한 견과류와 초콜릿, 흑설탕의 편안한 균형', price: 22000, stock: 30, low_stock_threshold: 5, image: 'assets/goso-blending-1.webp', active: true, sort_order: 2 },
  { id: 7, name: '다크 블랜딩', category: 'coffee', description: '깊은 로스팅과 다크초콜릿, 카라멜의 묵직한 풍미', price: 22000, stock: 30, low_stock_threshold: 5, image: 'assets/dark-blending-1.webp', active: true, sort_order: 3 }
];

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  body: JSON.stringify(body)
});

const env = (key, fallback = '') => String(process.env[key] ?? fallback).trim();
const enabled = (key, fallback = false) => {
  const value = env(key, fallback ? 'true' : 'false').toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
};
const cleanText = (value, max = 300) => String(value || '').trim().slice(0, max);
const normalizePhone = (value) => String(value || '').replace(/\D+/g, '').slice(0, 20);
const money = (value) => `${new Intl.NumberFormat('ko-KR').format(Number(value || 0))}원`;
const nowIso = () => new Date().toISOString();

let blobsPromise;
const blobLib = () => blobsPromise ||= import('@netlify/blobs');
const production = () => String(process.env.CONTEXT || '').toLowerCase() === 'production';
const store = async () => {
  const { getStore, getDeployStore } = await blobLib();
  return production() ? getStore('shins-house-commerce', { consistency: 'strong' }) : getDeployStore('shins-house-commerce');
};

const parseBody = (event) => {
  try { return JSON.parse(event.body || '{}'); }
  catch { const error = new Error('INVALID_JSON'); error.statusCode = 400; throw error; }
};

const settings = () => ({
  commerce_ready: enabled('COMMERCE_ENABLED', true),
  shipping_fee_setting: Number(env('SHIPPING_FEE', '3000')) || 3000,
  free_shipping_threshold: Number(env('FREE_SHIPPING_THRESHOLD', '50000')) || 50000,
  business_name: env('BUSINESS_NAME', '신스하우스'),
  representative_name: env('REPRESENTATIVE_NAME', ''),
  business_number: env('BUSINESS_NUMBER', ''),
  mail_order_number: env('MAIL_ORDER_NUMBER', ''),
  business_address: env('BUSINESS_ADDRESS', '부산광역시 부산진구 새싹로8번길 35-8 1층'),
  customer_phone: env('CUSTOMER_PHONE', '0503-5260-7479'),
  customer_email: env('CUSTOMER_EMAIL', ''),
  bank_configured: Boolean(env('BANK_NAME') && env('BANK_ACCOUNT_NUMBER') && env('BANK_ACCOUNT_HOLDER')),
  transfer_notice: env('TRANSFER_NOTICE', '주문은 정상 접수되었습니다. 입금 계좌가 화면에 표시되지 않는 경우 신스하우스에서 별도로 안내드립니다.'),
  shipping_notice: env('SHIPPING_NOTICE', '입금 확인 후 로스팅·포장·검수하여 순차 발송합니다.')
});

const galleryFor = (name, image) => {
  const map = {
    '에티오피아 싱글': ['assets/ethiopia-single-1.webp','assets/ethiopia-single-2.webp','assets/ethiopia-single-3.webp'],
    '고소 블랜딩': ['assets/goso-blending-1.webp','assets/goso-blending-2.webp','assets/goso-blending-3.webp'],
    '다크 블랜딩': ['assets/dark-blending-1.webp','assets/dark-blending-2.webp','assets/dark-blending-3.webp']
  };
  const base = map[name] || [];
  return [image || base[0], ...base.filter(item => item !== image)].filter(Boolean).slice(0, 3);
};

const loadProducts = async () => {
  const s = await store();
  let products = await s.get('catalog/products', { type: 'json' });
  if (!Array.isArray(products) || !products.length) {
    products = DEFAULT_PRODUCTS.map(item => ({ ...item, updated_at: nowIso() }));
    await s.setJSON('catalog/products', products);
  }
  return products.map(product => ({ ...product, gallery: galleryFor(product.name, product.image) }));
};

const saveProducts = async (products) => {
  const s = await store();
  await s.setJSON('catalog/products', products.map(({ gallery, ...product }) => product));
};

const getOrder = async (id) => (await store()).get(`orders/${id}`, { type: 'json' });
const saveOrder = async (order) => (await store()).setJSON(`orders/${order.id}`, order);

const listOrders = async (limit = 500) => {
  const s = await store();
  const result = await s.list({ prefix: 'orders/' });
  const keys = (result.blobs || []).map(item => item.key).slice(-limit);
  const orders = (await Promise.all(keys.map(key => s.get(key, { type: 'json' })))).filter(Boolean);
  return orders.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
};

const actionSecret = () => env('ACTION_TOKEN_SECRET') || env('ADMIN_SESSION_SECRET');
const signAction = (orderId, phone) => crypto.createHmac('sha256', actionSecret()).update(`${orderId}|${phone}`).digest('base64url');
const actionToken = (orderId, phone) => `${orderId}.${signAction(orderId, phone)}`;
const verifyActionToken = (token, orderId, phone) => {
  const expected = actionToken(orderId, phone);
  const aa = Buffer.from(String(token || ''));
  const bb = Buffer.from(expected);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

const orderNumber = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `SH-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

const customerFrom = (body) => ({
  name: cleanText(body.customer_name || body.name || body.orderer_name, 40),
  phone: normalizePhone(body.phone || body.customer_phone || body.mobile || body.phone_number),
  address: cleanText(body.shipping_address || body.address || [body.address1, body.address2].filter(Boolean).join(' '), 300),
  memo: cleanText(body.delivery_memo || body.memo || body.request, 300)
});

const consentTrue = (body, key) => body?.consents?.[key] === true || body?.[`${key}_agreed`] === true || body?.[`agree_${key}`] === true;

const readiness = () => {
  const blockers = [];
  if (!enabled('COMMERCE_ENABLED', true)) blockers.push('COMMERCE_DISABLED');
  if (!actionSecret()) blockers.push('ACTION_TOKEN_SECRET_MISSING');
  return blockers;
};

const createOrder = async (event) => {
  const blockers = readiness();
  if (blockers.length) return json(503, { ok: false, code: 'COMMERCE_NOT_READY', message: '주문 시스템 설정을 확인 중입니다.', blockers });

  const body = parseBody(event);
  const customer = customerFrom(body);
  const requested = Array.isArray(body.items) ? body.items.map(item => ({ product_id: Number(item.product_id || item.id), quantity: Math.max(1, Math.min(20, Number(item.quantity || item.qty || 1))) })) : [];
  if (!customer.name || customer.phone.length < 9 || !customer.address || !requested.length) return json(400, { ok: false, code: 'INVALID_ORDER', message: '주문자, 연락처, 배송주소와 상품을 확인해 주세요.' });
  if (!consentTrue(body, 'terms') || !consentTrue(body, 'privacy') || !consentTrue(body, 'refund')) return json(400, { ok: false, code: 'CONSENT_REQUIRED', message: '필수 약관 동의가 필요합니다.' });

  const products = await loadProducts();
  const lines = [];
  for (const item of requested) {
    const product = products.find(p => Number(p.id) === Number(item.product_id) && p.active !== false);
    if (!product) return json(400, { ok: false, code: 'PRODUCT_NOT_AVAILABLE', message: '현재 판매하지 않는 상품이 포함되어 있습니다.' });
    if (Number(product.stock || 0) < item.quantity) return json(409, { ok: false, code: 'INSUFFICIENT_STOCK', message: `${product.name} 재고가 부족합니다.` });
    lines.push({ product_id: product.id, product_name: product.name, unit_price: Number(product.price), quantity: item.quantity, line_total: Number(product.price) * item.quantity });
  }

  const subtotal = lines.reduce((sum, item) => sum + item.line_total, 0);
  const cfg = settings();
  const shipping = subtotal >= cfg.free_shipping_threshold ? 0 : cfg.shipping_fee_setting;
  const total = subtotal + shipping;
  const signature = crypto.createHash('sha256').update(`${customer.phone}|${customer.address}|${JSON.stringify(requested.sort((a,b)=>a.product_id-b.product_id))}`).digest('hex');
  const s = await store();
  const idem = await s.get(`idempotency/${signature}`, { type: 'json' });
  if (idem && Date.now() - Number(idem.created_at || 0) < 10 * 60 * 1000) {
    const existing = await getOrder(idem.order_id);
    if (existing) return json(201, orderResponse(existing, true));
  }

  const originalProducts = products.map(({ gallery, ...p }) => ({ ...p }));
  for (const line of lines) {
    const product = products.find(p => Number(p.id) === Number(line.product_id));
    product.stock = Math.max(0, Number(product.stock || 0) - line.quantity);
    product.updated_at = nowIso();
  }

  const id = crypto.randomUUID();
  const order = {
    id,
    order_number: orderNumber(),
    customer_name: customer.name,
    phone_normalized: customer.phone,
    shipping_address: customer.address,
    delivery_memo: customer.memo,
    subtotal,
    shipping_fee: shipping,
    total,
    status: '입금 대기',
    tracking_number: '',
    payment_notice_at: null,
    consent_at: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso(),
    order_items: lines
  };

  try {
    await saveProducts(products);
    await saveOrder(order);
    await s.setJSON(`idempotency/${signature}`, { order_id: id, created_at: Date.now() });
    await s.setJSON(`inventory-log/${Date.now()}-${crypto.randomUUID()}`, { created_at: nowIso(), actor: 'order', reason: `주문 ${order.order_number} 재고 예약`, changes: lines.map(line => ({ product_id: line.product_id, delta: -line.quantity })) });
  } catch (error) {
    await saveProducts(originalProducts).catch(() => {});
    throw error;
  }

  return json(201, orderResponse(order, false));
};

const orderResponse = (order, replay) => {
  const cfg = settings();
  return {
    order_id: order.order_number,
    public_token: '',
    action_token: actionToken(order.id, order.phone_normalized),
    status: order.status,
    subtotal: order.subtotal,
    shipping_fee: order.shipping_fee,
    total: order.total,
    bank: {
      bank_name: env('BANK_NAME'),
      account_number: env('BANK_ACCOUNT_NUMBER'),
      account_holder: env('BANK_ACCOUNT_HOLDER'),
      configured: cfg.bank_configured,
      transfer_notice: cfg.transfer_notice,
      shipping_notice: cfg.shipping_notice
    },
    created_at: order.created_at,
    idempotent_replay: replay === true
  };
};

const lookupOrders = async (event) => {
  const body = parseBody(event);
  const customer = customerFrom(body);
  if (!customer.name || customer.phone.length < 9) return json(400, { ok: false, code: 'INVALID_LOOKUP', message: '주문자명과 휴대전화를 확인해 주세요.' });
  const orders = (await listOrders(300)).filter(order => order.customer_name === customer.name && order.phone_normalized === customer.phone).slice(0, 20);
  return json(200, {
    orders: orders.map(order => ({
      order_id: order.order_number,
      status: order.status,
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      total: order.total,
      tracking_number: order.tracking_number,
      payment_notice_at: order.payment_notice_at,
      consent_at: order.consent_at,
      created_at: order.created_at,
      action_token: actionToken(order.id, order.phone_normalized),
      items: (order.order_items || []).map(item => ({ product_id: item.product_id, name: item.product_name, price: item.unit_price, quantity: item.quantity, line_total: item.line_total }))
    })),
    subscriptions: []
  });
};

const restoreOrderStock = async (order) => {
  const products = await loadProducts();
  for (const item of order.order_items || []) {
    const product = products.find(p => Number(p.id) === Number(item.product_id));
    if (product) product.stock = Number(product.stock || 0) + Number(item.quantity || 0);
  }
  await saveProducts(products);
  const s = await store();
  await s.setJSON(`inventory-log/${Date.now()}-${crypto.randomUUID()}`, { created_at: nowIso(), actor: 'customer-cancel', reason: `주문 ${order.order_number} 취소 재고 복원`, changes: (order.order_items || []).map(item => ({ product_id: item.product_id, delta: Number(item.quantity || 0) })) });
};

const orderAction = async (event, orderNumberValue, action) => {
  const body = parseBody(event);
  const orders = await listOrders(500);
  const order = orders.find(item => item.order_number === orderNumberValue);
  if (!order) return json(404, { ok: false, code: 'ORDER_NOT_FOUND', message: '주문을 찾지 못했습니다.' });
  if (!verifyActionToken(body.action_token, order.id, order.phone_normalized)) return json(403, { ok: false, code: 'INVALID_ACTION_TOKEN', message: '주문 확인 정보가 올바르지 않습니다.' });

  if (action === 'cancel') {
    if (order.status !== '입금 대기') return json(409, { ok: false, code: 'ORDER_NOT_CANCELLABLE', message: '현재 상태에서는 고객 취소가 어렵습니다.' });
    await restoreOrderStock(order);
    order.status = '주문 취소';
    order.updated_at = nowIso();
    await saveOrder(order);
    return json(200, { ok: true, status: order.status, message: '주문이 취소되었습니다.' });
  }

  if (!['입금 대기','입금 확인 요청'].includes(order.status)) return json(409, { ok: false, code: 'PAYMENT_NOTICE_NOT_ALLOWED', message: '현재 상태에서는 입금 알림을 접수할 수 없습니다.' });
  order.status = '입금 확인 요청';
  order.payment_notice_at = nowIso();
  order.updated_at = nowIso();
  await saveOrder(order);
  return json(200, { ok: true, status: order.status, message: '입금 확인 요청이 접수되었습니다.' });
};

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const route = String(event.queryStringParameters?.route || '').replace(/^\/+|\/+$/g, '');

  try {
    if (method === 'GET' && route === 'bootstrap') {
      const products = (await loadProducts()).filter(product => product.active !== false).sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      return json(200, { settings: settings(), products, subscription_plans: [], policies: {}, catalog_source: 'netlify-blobs' });
    }
    if (method === 'GET' && route === 'health/ready') {
      const blockers = readiness();
      return json(200, { ok: blockers.length === 0, version: '5.2.0', commerce_ready: blockers.length === 0, storage: 'netlify-blobs', blockers });
    }
    if (method === 'GET' && route === 'policies') return json(200, {});
    if (method === 'POST' && route === 'orders') return await createOrder(event);
    if (method === 'POST' && route === 'orders/lookup') return await lookupOrders(event);
    const actionMatch = route.match(/^orders\/([^/]+)\/(payment-notice|cancel)$/);
    if (method === 'POST' && actionMatch) return await orderAction(event, decodeURIComponent(actionMatch[1]), actionMatch[2] === 'cancel' ? 'cancel' : 'payment-notice');
    if (method === 'POST' && route === 'subscriptions') return json(503, { ok: false, code: 'SUBSCRIPTIONS_NOT_READY', message: '정기구독은 준비 중입니다.' });
    return json(404, { ok: false, code: 'NOT_FOUND', message: 'API route not found.' });
  } catch (error) {
    console.error('[Shin\'s House API]', error);
    return json(error.statusCode === 400 ? 400 : 500, { ok: false, code: String(error.message || 'INTERNAL_ERROR'), message: '요청 처리 중 오류가 발생했습니다.' });
  }
};
