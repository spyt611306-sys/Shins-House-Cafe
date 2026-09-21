'use strict';

const { rest, rpc, rateLimit } = require('./_lib/supabase');
const { authConfigured, login, refresh, requireAdmin, logout } = require('./_lib/admin-auth');

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  body: JSON.stringify(body)
});

const parseBody = (event) => {
  try { return JSON.parse(event.body || '{}'); }
  catch { const error = new Error('INVALID_JSON'); error.statusCode = 400; throw error; }
};

const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bool = (value, fallback = false) => typeof value === 'boolean' ? value : fallback;

const settings = () => ({
  bank_name: process.env.BANK_NAME || '',
  account_number: process.env.BANK_ACCOUNT_NUMBER || '',
  account_holder: process.env.BANK_ACCOUNT_HOLDER || '',
  shipping_fee_setting: number(process.env.SHIPPING_FEE, 3000),
  free_shipping_threshold: number(process.env.FREE_SHIPPING_THRESHOLD, 50000),
  business_name: process.env.BUSINESS_NAME || '신스하우스',
  representative_name: process.env.REPRESENTATIVE_NAME || '신현수',
  business_number: process.env.BUSINESS_NUMBER || '',
  mail_order_number: process.env.MAIL_ORDER_NUMBER || '',
  business_address: process.env.BUSINESS_ADDRESS || '',
  privacy_officer: process.env.PRIVACY_OFFICER || '',
  customer_phone: process.env.CUSTOMER_PHONE || '',
  customer_email: process.env.CUSTOMER_EMAIL || '',
  commerce_ready: String(process.env.COMMERCE_ENABLED || 'false').toLowerCase() === 'true'
});

const audit = async (email, action, targetType, targetId, beforeJson, afterJson) => {
  await rest('admin_audit_logs', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      actor_email: email,
      action,
      target_type: targetType,
      target_id: String(targetId || ''),
      before_json: beforeJson || null,
      after_json: afterJson || null
    }
  });
};

const adminBootstrap = async () => {
  const [products, orders, plans, subscriptions] = await Promise.all([
    rest('products', { query: { select: '*', order: 'sort_order.asc' } }),
    rest('orders', { query: { select: 'id,order_number,customer_name,phone_normalized,shipping_address,delivery_memo,subtotal,shipping_fee,total,status,tracking_number,payment_notice_at,consent_at,created_at,order_items(product_id,product_name,unit_price,quantity,line_total)', order: 'created_at.desc', limit: 200 } }),
    rest('subscription_plans', { query: { select: '*', order: 'sort_order.asc' } }),
    rest('subscription_requests', { query: { select: 'id,plan_id,customer_name,phone_normalized,note,status,created_at,updated_at', order: 'created_at.desc', limit: 200 } })
  ]);

  const lowStock = products.filter((product) => product.active && product.stock <= product.low_stock_threshold);
  return {
    settings: settings(),
    products,
    orders,
    order_statuses: ['입금 대기','입금 확인 요청','입금 확인','상품 준비','배송 중','배송 완료','주문 취소','환불 완료'],
    subscription_plans: plans,
    subscriptions,
    subscription_statuses: ['신청 접수','상담 완료','구독 활성','일시정지','해지'],
    operations: {
      payment_waiting: orders.filter((order) => ['입금 대기','입금 확인 요청'].includes(order.status)).length,
      shipping_ready: orders.filter((order) => ['입금 확인','상품 준비'].includes(order.status)).length,
      new_subscriptions: subscriptions.filter((item) => item.status === '신청 접수').length,
      low_stock_products: lowStock,
      commerce_ready: settings().commerce_ready,
      security_warnings: authConfigured() ? [] : ['ADMIN_AUTH_NOT_CONFIGURED']
    }
  };
};

const productPayload = (body, partial = false) => {
  const out = {};
  const put = (key, value) => { if (!partial || body[key] !== undefined) out[key] = value; };
  put('name', text(body.name, 120));
  put('category', text(body.category, 40));
  put('description', text(body.description, 1000));
  put('price', Math.max(0, Math.round(number(body.price))));
  put('stock', Math.max(0, Math.round(number(body.stock))));
  put('low_stock_threshold', Math.max(0, Math.round(number(body.low_stock_threshold, 3))));
  put('image', text(body.image, 500));
  put('active', bool(body.active, true));
  put('sort_order', Math.round(number(body.sort_order)));
  return out;
};

const planPayload = (body, partial = false) => {
  const out = {};
  const put = (key, value) => { if (!partial || body[key] !== undefined) out[key] = value; };
  put('name', text(body.name, 120));
  put('description', text(body.description, 1000));
  put('price', Math.max(0, Math.round(number(body.price))));
  put('quantity_label', text(body.quantity_label, 120));
  put('delivery_cycle', text(body.delivery_cycle, 120));
  put('shipping_fee', Math.max(0, Math.round(number(body.shipping_fee))));
  put('subscriber_limit', Math.max(0, Math.round(number(body.subscriber_limit))));
  put('active', bool(body.active, false));
  put('sort_order', Math.round(number(body.sort_order)));
  return out;
};

const updateProduct = async (admin, id, body) => {
  const beforeRows = await rest('products', { query: { select: '*', id: `eq.${id}`, limit: 1 } });
  if (!beforeRows[0]) return json(404, { ok: false, code: 'PRODUCT_NOT_FOUND' });
  const rows = await rest('products', { method: 'PATCH', prefer: 'return=representation', query: { id: `eq.${id}` }, body: productPayload(body, true) });
  await audit(admin.user.email, 'product.update', 'product', id, beforeRows[0], rows[0]);
  return json(200, { ok: true, product: rows[0] });
};

const createProduct = async (admin, body) => {
  const rows = await rest('products', { method: 'POST', prefer: 'return=representation', body: productPayload(body, false) });
  await audit(admin.user.email, 'product.create', 'product', rows?.[0]?.id, null, rows?.[0]);
  return json(201, { ok: true, product: rows?.[0] });
};

const updatePlan = async (admin, id, body) => {
  const beforeRows = await rest('subscription_plans', { query: { select: '*', id: `eq.${id}`, limit: 1 } });
  if (!beforeRows[0]) return json(404, { ok: false, code: 'PLAN_NOT_FOUND' });
  const rows = await rest('subscription_plans', { method: 'PATCH', prefer: 'return=representation', query: { id: `eq.${id}` }, body: planPayload(body, true) });
  await audit(admin.user.email, 'subscription_plan.update', 'subscription_plan', id, beforeRows[0], rows[0]);
  return json(200, { ok: true, plan: rows[0] });
};

const createPlan = async (admin, body) => {
  const rows = await rest('subscription_plans', { method: 'POST', prefer: 'return=representation', body: planPayload(body, false) });
  await audit(admin.user.email, 'subscription_plan.create', 'subscription_plan', rows?.[0]?.id, null, rows?.[0]);
  return json(201, { ok: true, plan: rows?.[0] });
};

const updateSubscription = async (admin, id, body) => {
  const allowed = new Set(['신청 접수','상담 완료','구독 활성','일시정지','해지']);
  const status = text(body.status, 40);
  if (!allowed.has(status)) return json(400, { ok: false, code: 'INVALID_SUBSCRIPTION_STATUS' });
  const beforeRows = await rest('subscription_requests', { query: { select: '*', id: `eq.${id}`, limit: 1 } });
  if (!beforeRows[0]) return json(404, { ok: false, code: 'SUBSCRIPTION_NOT_FOUND' });
  const rows = await rest('subscription_requests', { method: 'PATCH', prefer: 'return=representation', query: { id: `eq.${id}` }, body: { status } });
  await audit(admin.user.email, 'subscription.status', 'subscription', id, beforeRows[0], rows[0]);
  return json(200, { ok: true, subscription: rows[0] });
};

const updateOrderStatus = async (admin, orderNumber, body) => {
  const rows = await rest('orders', { query: { select: 'id,order_number,status,tracking_number', order_number: `eq.${orderNumber}`, limit: 1 } });
  if (!rows[0]) return json(404, { ok: false, code: 'ORDER_NOT_FOUND' });
  const before = rows[0];
  const result = await rpc('admin_set_order_status', {
    p_order_id: before.id,
    p_new_status: text(body.status, 40),
    p_tracking_number: text(body.tracking_number, 100),
    p_actor: admin.user.email
  });
  await audit(admin.user.email, 'order.status', 'order', orderNumber, before, result);
  return json(200, result);
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const ordersCsv = async () => {
  const rows = await rest('orders', { query: { select: 'order_number,customer_name,phone_normalized,shipping_address,subtotal,shipping_fee,total,status,tracking_number,created_at', order: 'created_at.desc', limit: 1000 } });
  const columns = ['주문번호','주문자','연락처','배송주소','상품금액','배송비','총액','상태','운송장','주문일시'];
  const lines = rows.map((row) => [row.order_number,row.customer_name,row.phone_normalized,row.shipping_address,row.subtotal,row.shipping_fee,row.total,row.status,row.tracking_number,row.created_at].map(csvEscape).join(','));
  return {
    statusCode: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="shins-house-orders-${new Date().toISOString().slice(0,10)}.csv"`,
      'cache-control': 'no-store'
    },
    body: '\uFEFF' + [columns.map(csvEscape).join(','), ...lines].join('\r\n')
  };
};

const authError = (error) => {
  const code = String(error.message || 'AUTH_ERROR');
  if (code === 'ADMIN_AUTH_NOT_CONFIGURED') return json(503, { ok: false, code });
  if (code === 'ADMIN_NOT_ALLOWED') return json(403, { ok: false, code });
  if (code === 'ADMIN_AUTH_REQUIRED' || error.statusCode === 401) return json(401, { ok: false, code: 'ADMIN_AUTH_REQUIRED' });
  if (error.statusCode === 503) return json(503, { ok: false, code: 'ADMIN_SERVICE_NOT_READY' });
  return null;
};

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const route = String(event.queryStringParameters?.route || '').replace(/^\/+|\/+$/g, '');

  try {
    if (method === 'POST' && route === 'login') {
      if (!authConfigured()) return json(503, { ok: false, code: 'ADMIN_AUTH_NOT_CONFIGURED' });
      if (!(await rateLimit(event, 'admin-login', 8, 900))) return json(429, { ok: false, code: 'RATE_LIMITED' });
      const body = parseBody(event);
      const session = await login(text(body.email, 200).toLowerCase(), String(body.password || ''));
      return json(200, { access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, user: { id: session.user?.id, email: session.user?.email } });
    }

    if (method === 'POST' && route === 'refresh') {
      const session = await refresh(String(parseBody(event).refresh_token || ''));
      return json(200, { access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, user: { id: session.user?.id, email: session.user?.email } });
    }

    if (method === 'POST' && route === 'logout') {
      await logout(event);
      return json(200, { ok: true });
    }

    const admin = await requireAdmin(event);

    if (method === 'GET' && route === 'bootstrap') return json(200, await adminBootstrap());
    if (method === 'GET' && route === 'orders.csv') return await ordersCsv();

    if (method === 'POST' && route === 'products') return await createProduct(admin, parseBody(event));
    const productMatch = route.match(/^products\/(\d+)$/);
    if (productMatch && ['POST','PATCH','PUT'].includes(method)) return await updateProduct(admin, Number(productMatch[1]), parseBody(event));

    if (method === 'POST' && route === 'subscription-plans') return await createPlan(admin, parseBody(event));
    const planMatch = route.match(/^subscription-plans\/(\d+)$/);
    if (planMatch && ['POST','PATCH','PUT'].includes(method)) return await updatePlan(admin, Number(planMatch[1]), parseBody(event));

    const subscriptionMatch = route.match(/^subscriptions\/([0-9a-f-]+)$/i);
    if (subscriptionMatch && ['POST','PATCH','PUT'].includes(method)) return await updateSubscription(admin, subscriptionMatch[1], parseBody(event));

    const orderMatch = route.match(/^orders\/([^/]+)(?:\/status)?$/);
    if (orderMatch && ['POST','PATCH','PUT'].includes(method)) return await updateOrderStatus(admin, decodeURIComponent(orderMatch[1]), parseBody(event));

    if (method === 'POST' && route === 'uploads') {
      return json(501, { ok: false, code: 'UPLOAD_PIPELINE_NOT_READY', message: '이미지 업로드는 검증 가능한 Storage 파이프라인 적용 후 활성화됩니다.' });
    }

    return json(404, { ok: false, code: 'ADMIN_ROUTE_NOT_FOUND' });
  } catch (error) {
    console.error('[Shin\'s House admin]', error.message);
    const auth = authError(error);
    if (auth) return auth;
    if (String(error.message).includes('INVALID_STATUS_TRANSITION')) return json(409, { ok: false, code: 'INVALID_STATUS_TRANSITION' });
    return json(error.statusCode === 400 ? 400 : 500, { ok: false, code: 'ADMIN_INTERNAL_ERROR', message: '관리자 요청 처리 중 오류가 발생했습니다.' });
  }
};
