'use strict';

const {
  configured: supabaseConfigured,
  rest,
  rpc,
  randomToken,
  sha256,
  normalizePhone,
  rateLimit,
  actionToken,
  verifyActionToken
} = require('./_lib/supabase');

const VERSION = '4.5.0-orders';
const env = (name, fallback = '') => process.env[name] || fallback;
const boolEnv = (name, fallback = false) => (process.env[name] ?? String(fallback)).toLowerCase() === 'true';

const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders
  },
  body: JSON.stringify(body)
});

const fallbackProducts = [
  { id: 1, name: '하우스 블렌드 200g', category: 'coffee', description: '고소한 단맛과 편안한 여운을 담은 데일리 블렌드', price: 18000, stock: 24, low_stock_threshold: 3, image: 'assets/asset-11-7ec3ab46.webp', active: true, sort_order: 1 },
  { id: 2, name: '나이트 디카페인 200g', category: 'coffee', description: '부드러운 단맛과 낮은 카페인으로 늦은 시간에도 편안한 커피', price: 21000, stock: 18, low_stock_threshold: 3, image: 'assets/asset-12-67790ddf.webp', active: true, sort_order: 2 },
  { id: 3, name: '클래식 크림 머그', category: 'goods', description: '매일 편하게 사용할 수 있는 크림 컬러 머그', price: 19000, stock: 12, low_stock_threshold: 3, image: 'assets/asset-08-409f9713.webp', active: true, sort_order: 3 },
  { id: 4, name: '신스하우스 선물 세트', category: 'gift', description: '원두와 커피 오브젝트를 함께 구성한 선물 세트', price: 39000, stock: 9, low_stock_threshold: 3, image: 'assets/asset-07-dbd7b39f.webp', active: true, sort_order: 4 }
];

const fallbackPlans = [
  { id: 1, name: '하우스 베이직', description: '매월 원두 한 봉을 취향에 맞춰 안내합니다.', price: 18000, quantity_label: '원두 200g × 1', delivery_cycle: '매월 1회', shipping_fee: 0, subscriber_limit: 0, active: false, sort_order: 1 },
  { id: 2, name: '커피 페어', description: '서로 다른 두 가지 원두를 비교해 즐길 수 있습니다.', price: 34000, quantity_label: '원두 200g × 2', delivery_cycle: '매월 1회', shipping_fee: 0, subscriber_limit: 0, active: false, sort_order: 2 },
  { id: 3, name: '디카페인 클럽', description: '늦은 시간에도 편안한 디카페인 원두 구성입니다.', price: 21000, quantity_label: '디카페인 200g × 1', delivery_cycle: '매월 1회', shipping_fee: 0, subscriber_limit: 0, active: false, sort_order: 3 }
];

const policies = {
  terms: { version: '2026-09-commercialization-draft', title: '이용약관 및 주문계약 안내', summary: '상용화 전 전문 약관 확정이 필요합니다.' },
  privacy: { version: '2026-09-commercialization-draft', title: '개인정보 수집·이용 안내', summary: '상용화 전 보유기간·위탁·파기 절차를 포함한 전문 확정이 필요합니다.', items: '이름, 휴대전화번호, 배송주소, 주문·상담 내용', purpose: '주문 처리, 배송, 고객응대' },
  refund: { version: '2026-09-commercialization-draft', title: '취소·교환·환불 안내', summary: '상용화 전 상품 특성과 관련 법령을 반영한 전문 확정이 필요합니다.', exceptions: '관련 법령상 제한 사유가 있는 경우 제한될 수 있습니다.', refund: '환급과 배송비는 주문 상태와 귀책사유에 따라 처리합니다.' },
  subscription: { version: '2026-09-commercialization-draft', title: '정기구독 신청 안내', summary: '자동결제가 아닌 신청형 구독입니다.', cancel: '상담 단계에서 변경·해지가 가능합니다.' }
};

const blockers = () => {
  const required = [
    'BUSINESS_NUMBER','MAIL_ORDER_NUMBER','PRIVACY_OFFICER','CUSTOMER_EMAIL',
    'BANK_NAME','BANK_ACCOUNT_NUMBER','BANK_ACCOUNT_HOLDER',
    'SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ACTION_TOKEN_SECRET'
  ];
  const missing = required.filter((name) => !env(name));
  if (!boolEnv('COMMERCE_ENABLED')) missing.push('COMMERCE_ENABLED=true');
  return missing;
};

const commerceReady = () => blockers().length === 0;
const subscriptionReady = () => supabaseConfigured() && boolEnv('SUBSCRIPTIONS_ENABLED');

const settings = () => ({
  bank_name: env('BANK_NAME'),
  account_number: env('BANK_ACCOUNT_NUMBER'),
  account_holder: env('BANK_ACCOUNT_HOLDER'),
  transfer_notice: '주문자명과 입금자명이 다를 경우 고객센터로 알려주세요.',
  shipping_notice: '입금 확인 후 상품을 준비하며 운송장 등록 시 배송 상태를 안내합니다.',
  customer_phone: env('CUSTOMER_PHONE', '0503-5260-7479'),
  customer_email: env('CUSTOMER_EMAIL'),
  return_address: env('RETURN_ADDRESS', '부산광역시 부산진구 새싹로8번길 35-8 1층 신스하우스'),
  hero_kicker: "SHIN'S HOUSE · BUSAN",
  hero_title_1: 'Coffee & Objects',
  hero_title_2: '',
  hero_copy: '매일 마시기 좋은 커피와 필요한 물건을 차분하게 고릅니다.',
  hero_image_1: 'assets/asset-04-c6a206d3.webp',
  hero_image_2: 'assets/asset-05-66066f69.webp',
  hero_image_3: 'assets/asset-06-364ff1bd.webp',
  subscription_enabled: subscriptionReady(),
  subscription_kicker: 'MONTHLY COFFEE CLUB',
  subscription_title: '매달 필요한 만큼, 확인한 뒤 준비합니다.',
  subscription_description: '자동결제가 아닌 신청형 구독입니다. 발송 전에 구매 의사를 확인합니다.',
  subscription_notice: '신청 후 판매자가 연락드려 구성과 첫 발송 일정을 확인합니다.',
  subscription_image: 'assets/asset-09-7bb279f9.webp',
  shipping_fee_setting: Number(env('SHIPPING_FEE', '3000')),
  free_shipping_threshold: Number(env('FREE_SHIPPING_THRESHOLD', '50000')),
  business_name: env('BUSINESS_NAME', '신스하우스'),
  representative_name: env('REPRESENTATIVE_NAME', '신현수'),
  business_number: env('BUSINESS_NUMBER'),
  mail_order_number: env('MAIL_ORDER_NUMBER'),
  business_address: env('BUSINESS_ADDRESS', '부산광역시 부산진구 새싹로8번길 35-8 1층'),
  privacy_officer: env('PRIVACY_OFFICER'),
  commerce_ready: commerceReady()
});

const parseBody = (event) => {
  try { return JSON.parse(event.body || '{}'); }
  catch { const error = new Error('INVALID_JSON'); error.statusCode = 400; throw error; }
};

const cleanText = (value, max = 300) => String(value || '').trim().slice(0, max);
const consentTrue = (body, key) => body?.consents?.[key] === true || body?.[`${key}_agreed`] === true || body?.[`agree_${key}`] === true;

const customerFrom = (body) => ({
  name: cleanText(body.customer_name || body.name || body.orderer_name, 40),
  phone: normalizePhone(body.phone || body.customer_phone || body.mobile || body.phone_number),
  address: cleanText(body.shipping_address || body.address || [body.address1, body.address2].filter(Boolean).join(' '), 300),
  memo: cleanText(body.delivery_memo || body.memo || body.request, 300)
});

const loadCatalog = async () => {
  if (!supabaseConfigured()) return { products: fallbackProducts, plans: fallbackPlans, source: 'fallback' };
  try {
    const [products, plans] = await Promise.all([
      rest('products', { query: { select: 'id,name,category,description,price,stock,low_stock_threshold,image,active,sort_order', active: 'eq.true', order: 'sort_order.asc' } }),
      rest('subscription_plans', { query: { select: 'id,name,description,price,quantity_label,delivery_cycle,shipping_fee,subscriber_limit,active,sort_order', order: 'sort_order.asc' } })
    ]);
    return { products, plans, source: 'supabase' };
  } catch (error) {
    console.error('[catalog fallback]', error.message);
    return { products: fallbackProducts, plans: fallbackPlans, source: 'fallback' };
  }
};

const ensureCommerce = () => {
  const missing = blockers();
  if (missing.length) {
    const error = new Error('COMMERCE_NOT_READY');
    error.statusCode = 503;
    error.blockers = missing;
    throw error;
  }
};

const createOrder = async (event) => {
  ensureCommerce();
  if (!(await rateLimit(event, 'order-create', 8, 600))) return json(429, { ok: false, code: 'RATE_LIMITED', message: '잠시 후 다시 시도해주세요.' });

  const body = parseBody(event);
  const customer = customerFrom(body);
  const items = Array.isArray(body.items) ? body.items.map((item) => ({ product_id: Number(item.product_id || item.id), quantity: Number(item.quantity || item.qty) })) : [];

  if (!customer.name || customer.phone.length < 9 || !customer.address || items.length === 0) {
    return json(400, { ok: false, code: 'INVALID_ORDER', message: '주문자, 연락처, 배송주소와 상품을 확인해주세요.' });
  }
  if (!consentTrue(body, 'terms') || !consentTrue(body, 'privacy') || !consentTrue(body, 'refund')) {
    return json(400, { ok: false, code: 'CONSENT_REQUIRED', message: '필수 약관 동의가 필요합니다.' });
  }

  const publicToken = randomToken(24);
  const suppliedKey = cleanText(event.headers?.['idempotency-key'], 128);
  const bucket = Math.floor(Date.now() / 600000);
  const idempotencyKey = suppliedKey.length >= 16 ? suppliedKey : sha256(`${bucket}|${customer.phone}|${customer.address}|${JSON.stringify(items)}`);

  const order = await rpc('create_order_transaction', {
    p_customer_name: customer.name,
    p_phone_normalized: customer.phone,
    p_shipping_address: customer.address,
    p_delivery_memo: customer.memo,
    p_items: items,
    p_idempotency_key: idempotencyKey,
    p_terms_version: policies.terms.version,
    p_privacy_version: policies.privacy.version,
    p_refund_version: policies.refund.version,
    p_public_token_hash: sha256(publicToken),
    p_shipping_fee_base: Number(env('SHIPPING_FEE', '3000')),
    p_free_shipping_threshold: Number(env('FREE_SHIPPING_THRESHOLD', '50000'))
  });

  return json(201, {
    order_id: order.order_number,
    public_token: publicToken,
    action_token: actionToken(order.id, customer.phone),
    status: order.status,
    subtotal: order.subtotal,
    shipping_fee: order.shipping_fee,
    total: order.total,
    bank: {
      bank_name: env('BANK_NAME'),
      account_number: env('BANK_ACCOUNT_NUMBER'),
      account_holder: env('BANK_ACCOUNT_HOLDER'),
      transfer_notice: settings().transfer_notice,
      shipping_notice: settings().shipping_notice
    },
    created_at: order.created_at,
    idempotent_replay: order.idempotent_replay === true
  });
};

const lookupOrders = async (event) => {
  ensureCommerce();
  if (!(await rateLimit(event, 'order-lookup', 20, 600))) return json(429, { ok: false, code: 'RATE_LIMITED', message: '잠시 후 다시 시도해주세요.' });

  const customer = customerFrom(parseBody(event));
  if (!customer.name || customer.phone.length < 9) return json(400, { ok: false, code: 'INVALID_LOOKUP' });

  const orders = await rest('orders', {
    query: {
      select: 'id,order_number,status,subtotal,shipping_fee,total,tracking_number,payment_notice_at,consent_at,created_at,order_items(product_id,product_name,unit_price,quantity,line_total)',
      customer_name: `eq.${customer.name}`,
      phone_normalized: `eq.${customer.phone}`,
      order: 'created_at.desc',
      limit: 20
    }
  });

  return json(200, {
    orders: orders.map((order) => ({
      order_id: order.order_number,
      status: order.status,
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      total: order.total,
      tracking_number: order.tracking_number,
      payment_notice_at: order.payment_notice_at,
      consent_at: order.consent_at,
      created_at: order.created_at,
      action_token: actionToken(order.id, customer.phone),
      items: (order.order_items || []).map((item) => ({
        product_id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total
      }))
    })),
    subscriptions: []
  });
};

const orderAction = async (event, orderNumber, action) => {
  ensureCommerce();
  if (!(await rateLimit(event, `order-${action}`, 20, 600))) return json(429, { ok: false, code: 'RATE_LIMITED' });
  const body = parseBody(event);

  const rows = await rest('orders', {
    query: { select: 'id,order_number,phone_normalized,status', order_number: `eq.${orderNumber}`, limit: 1 }
  });
  const order = rows[0];
  if (!order) return json(404, { ok: false, code: 'ORDER_NOT_FOUND' });
  if (!verifyActionToken(body.action_token, order.id, order.phone_normalized)) return json(403, { ok: false, code: 'INVALID_ACTION_TOKEN' });

  const result = await rpc(action === 'cancel' ? 'cancel_order_public' : 'payment_notice_public', { p_order_id: order.id });
  const status = result.status;
  return json(200, {
    ok: true,
    status,
    message: action === 'cancel' ? '주문이 취소되었습니다.' : '입금 확인 요청이 접수되었습니다.',
    idempotent_replay: result.idempotent_replay === true
  });
};

const createSubscription = async (event) => {
  if (!subscriptionReady()) return json(503, { ok: false, code: 'SUBSCRIPTIONS_NOT_READY' });
  if (!(await rateLimit(event, 'subscription-create', 8, 600))) return json(429, { ok: false, code: 'RATE_LIMITED' });

  const body = parseBody(event);
  const customer = customerFrom(body);
  const planId = Number(body.plan_id || body.subscription_plan_id);
  if (!customer.name || customer.phone.length < 9 || !Number.isInteger(planId)) return json(400, { ok: false, code: 'INVALID_SUBSCRIPTION' });

  const plans = await rest('subscription_plans', { query: { select: 'id,name,active', id: `eq.${planId}`, active: 'eq.true', limit: 1 } });
  if (!plans[0]) return json(400, { ok: false, code: 'PLAN_NOT_AVAILABLE' });

  const rows = await rest('subscription_requests', {
    method: 'POST',
    prefer: 'return=representation',
    body: { plan_id: planId, customer_name: customer.name, phone_normalized: customer.phone, note: cleanText(body.note || body.memo, 300) }
  });
  return json(201, { ok: true, subscription_id: rows?.[0]?.id, status: '신청 접수', message: settings().subscription_notice });
};

const errorResponse = (error) => {
  console.error('[Shin\'s House API]', error.message, error.supabase || '');
  const code = String(error.message || 'INTERNAL_ERROR');
  if (code === 'COMMERCE_NOT_READY') return json(503, { ok: false, code, message: '현재 주문 시스템을 준비 중입니다.', blockers: error.blockers || [] });
  if (code === 'SUPABASE_NOT_CONFIGURED' || code === 'ACTION_TOKEN_SECRET_NOT_CONFIGURED') return json(503, { ok: false, code: 'SERVICE_NOT_READY' });
  if (/^(INVALID_|DUPLICATE_PRODUCT|PRODUCT_NOT_AVAILABLE)/.test(code)) return json(400, { ok: false, code });
  if (/^(INSUFFICIENT_STOCK|ORDER_NOT_CANCELLABLE|PAYMENT_NOTICE_NOT_ALLOWED)/.test(code)) return json(409, { ok: false, code });
  return json(error.statusCode === 400 ? 400 : 500, { ok: false, code: 'INTERNAL_ERROR', message: '요청 처리 중 오류가 발생했습니다.' });
};

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const route = String(event.queryStringParameters?.route || '').replace(/^\/+|\/+$/g, '');

  try {
    if (method === 'GET' && route === 'bootstrap') {
      const catalog = await loadCatalog();
      return json(200, { settings: settings(), products: catalog.products, subscription_plans: catalog.plans, policies, catalog_source: catalog.source });
    }

    if (method === 'GET' && route === 'policies') return json(200, policies);

    if (method === 'GET' && route === 'health/ready') {
      const missing = blockers();
      return json(200, {
        ok: missing.length === 0,
        version: VERSION,
        commerce_ready: missing.length === 0,
        supabase_configured: supabaseConfigured(),
        subscriptions_ready: subscriptionReady(),
        blockers: missing
      });
    }

    if (method === 'POST' && route === 'orders') return await createOrder(event);
    if (method === 'POST' && route === 'orders/lookup') return await lookupOrders(event);
    if (method === 'POST' && route === 'subscriptions') return await createSubscription(event);

    const actionMatch = route.match(/^orders\/([^/]+)\/(payment-notice|cancel)$/);
    if (method === 'POST' && actionMatch) return await orderAction(event, decodeURIComponent(actionMatch[1]), actionMatch[2] === 'cancel' ? 'cancel' : 'payment-notice');

    if (route.startsWith('admin/')) {
      return json(503, { ok: false, code: 'ADMIN_BACKEND_NOT_READY', message: '관리자 인증 백엔드는 Commercialization 3/6에서 활성화됩니다.' });
    }

    return json(404, { ok: false, code: 'NOT_FOUND', message: 'API route not found.' });
  } catch (error) {
    return errorResponse(error);
  }
};
