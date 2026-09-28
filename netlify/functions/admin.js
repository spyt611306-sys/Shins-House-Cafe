'use strict';

const crypto = require('crypto');
const { authConfigured, login, refresh, requireAdmin, logout } = require('./_lib/admin-auth');

const ORDER_STATUSES = ['입금 대기','입금 확인 요청','입금 확인','상품 준비','배송 중','배송 완료','주문 취소','환불 완료'];
const DEFAULT_PRODUCTS = [
  { id: 5, name: '에티오피아 싱글', category: 'coffee', description: '화사한 꽃향기와 복숭아, 시트러스의 산뜻한 여운', price: 27000, stock: 30, low_stock_threshold: 5, image: 'assets/ethiopia-single-1.webp', active: true, sort_order: 1 },
  { id: 6, name: '고소 블랜딩', category: 'coffee', description: '고소한 견과류와 초콜릿, 흑설탕의 편안한 균형', price: 22000, stock: 30, low_stock_threshold: 5, image: 'assets/goso-blending-1.webp', active: true, sort_order: 2 },
  { id: 7, name: '다크 블랜딩', category: 'coffee', description: '깊은 로스팅과 다크초콜릿, 카라멜의 묵직한 풍미', price: 22000, stock: 30, low_stock_threshold: 5, image: 'assets/dark-blending-1.webp', active: true, sort_order: 3 }
];

const json = (statusCode, body, headers = {}) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }, body: JSON.stringify(body) });
const parseBody = (event) => { try { return JSON.parse(event.body || '{}'); } catch { const e = new Error('INVALID_JSON'); e.statusCode = 400; throw e; } };
const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bool = (value, fallback = false) => typeof value === 'boolean' ? value : fallback;
const nowIso = () => new Date().toISOString();
const enabled = (key, fallback = false) => ['true','1','yes'].includes(String(process.env[key] ?? (fallback ? 'true' : 'false')).toLowerCase());

let blobsPromise;
const blobLib = () => blobsPromise ||= import('@netlify/blobs');
const production = () => String(process.env.CONTEXT || '').toLowerCase() === 'production';
const store = async () => {
  const { getStore, getDeployStore } = await blobLib();
  return production() ? getStore('shins-house-commerce', { consistency: 'strong' }) : getDeployStore('shins-house-commerce');
};

const settings = () => ({
  shipping_fee_setting: number(process.env.SHIPPING_FEE, 3000),
  free_shipping_threshold: number(process.env.FREE_SHIPPING_THRESHOLD, 50000),
  business_name: process.env.BUSINESS_NAME || '신스하우스',
  representative_name: process.env.REPRESENTATIVE_NAME || '',
  business_number: process.env.BUSINESS_NUMBER || '',
  mail_order_number: process.env.MAIL_ORDER_NUMBER || '',
  business_address: process.env.BUSINESS_ADDRESS || '부산광역시 부산진구 새싹로8번길 35-8 1층',
  customer_phone: process.env.CUSTOMER_PHONE || '0503-5260-7479',
  customer_email: process.env.CUSTOMER_EMAIL || '',
  commerce_ready: enabled('COMMERCE_ENABLED', true)
});

const loadProducts = async () => {
  const s = await store();
  let products = await s.get('catalog/products', { type: 'json' });
  if (!Array.isArray(products) || !products.length) {
    products = DEFAULT_PRODUCTS.map(p => ({ ...p, updated_at: nowIso() }));
    await s.setJSON('catalog/products', products);
  }
  return products;
};
const saveProducts = async (products) => (await store()).setJSON('catalog/products', products);
const saveOrder = async (order) => (await store()).setJSON(`orders/${order.id}`, order);
const listByPrefix = async (prefix, limit = 500) => {
  const s = await store();
  const result = await s.list({ prefix });
  const keys = (result.blobs || []).map(item => item.key).slice(-limit);
  return (await Promise.all(keys.map(key => s.get(key, { type: 'json' })))).filter(Boolean);
};
const listOrders = async () => (await listByPrefix('orders/', 500)).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)));
const listInventoryLogs = async () => (await listByPrefix('inventory-log/', 300)).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0,100);

const audit = async (email, action, targetType, targetId, beforeJson, afterJson) => {
  const s = await store();
  await s.setJSON(`audit/${Date.now()}-${crypto.randomUUID()}`, { created_at: nowIso(), actor_email: email, action, target_type: targetType, target_id: String(targetId || ''), before_json: beforeJson || null, after_json: afterJson || null });
};

const inventoryLog = async (actor, reason, changes) => {
  const s = await store();
  await s.setJSON(`inventory-log/${Date.now()}-${crypto.randomUUID()}`, { created_at: nowIso(), actor, reason: text(reason, 200), changes });
};

const adminBootstrap = async () => {
  const [products, orders, inventoryLogs] = await Promise.all([loadProducts(), listOrders(), listInventoryLogs()]);
  const lowStock = products.filter(product => product.active !== false && Number(product.stock || 0) <= Number(product.low_stock_threshold ?? 5));
  return {
    settings: settings(), products, orders, inventory_logs: inventoryLogs,
    order_statuses: ORDER_STATUSES,
    subscription_plans: [], subscriptions: [], subscription_statuses: [],
    operations: {
      payment_waiting: orders.filter(order => ['입금 대기','입금 확인 요청'].includes(order.status)).length,
      shipping_ready: orders.filter(order => ['입금 확인','상품 준비'].includes(order.status)).length,
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
  put('category', text(body.category || 'coffee', 40));
  put('description', text(body.description, 1000));
  put('price', Math.max(0, Math.round(number(body.price))));
  put('stock', Math.max(0, Math.round(number(body.stock))));
  put('low_stock_threshold', Math.max(0, Math.round(number(body.low_stock_threshold, 5))));
  put('image', text(body.image, 500));
  put('active', bool(body.active, true));
  put('sort_order', Math.round(number(body.sort_order)));
  return out;
};

const updateProduct = async (admin, id, body) => {
  const products = await loadProducts();
  const index = products.findIndex(product => Number(product.id) === Number(id));
  if (index < 0) return json(404, { ok: false, code: 'PRODUCT_NOT_FOUND' });
  const before = { ...products[index] };
  products[index] = { ...products[index], ...productPayload(body, true), updated_at: nowIso() };
  await saveProducts(products);
  if (Number(before.stock) !== Number(products[index].stock)) await inventoryLog(admin.user.email, text(body.stock_reason || '관리자 재고 직접 수정', 200), [{ product_id: id, delta: Number(products[index].stock) - Number(before.stock), before: Number(before.stock), after: Number(products[index].stock) }]);
  await audit(admin.user.email, 'product.update', 'product', id, before, products[index]);
  return json(200, { ok: true, product: products[index] });
};

const createProduct = async (admin, body) => {
  const products = await loadProducts();
  const id = Math.max(0, ...products.map(p => Number(p.id) || 0)) + 1;
  const product = { id, ...productPayload(body, false), updated_at: nowIso() };
  products.push(product);
  await saveProducts(products);
  await audit(admin.user.email, 'product.create', 'product', id, null, product);
  return json(201, { ok: true, product });
};

const adjustInventory = async (admin, id, body) => {
  const products = await loadProducts();
  const index = products.findIndex(product => Number(product.id) === Number(id));
  if (index < 0) return json(404, { ok: false, code: 'PRODUCT_NOT_FOUND' });
  const before = Number(products[index].stock || 0);
  const hasAbsolute = body.stock !== undefined && body.stock !== null && body.stock !== '';
  const next = hasAbsolute ? Math.max(0, Math.round(number(body.stock))) : Math.max(0, before + Math.round(number(body.delta)));
  const reason = text(body.reason || (hasAbsolute ? '실재고 반영' : '재고 조정'), 200);
  products[index] = { ...products[index], stock: next, updated_at: nowIso() };
  await saveProducts(products);
  await inventoryLog(admin.user.email, reason, [{ product_id: id, product_name: products[index].name, delta: next - before, before, after: next }]);
  await audit(admin.user.email, 'inventory.adjust', 'product', id, { stock: before }, { stock: next, reason });
  return json(200, { ok: true, product: products[index], delta: next - before });
};

const restoreStockForOrder = async (admin, order) => {
  if (order.stock_returned) return;
  const products = await loadProducts();
  const changes = [];
  for (const item of order.order_items || []) {
    const product = products.find(p => Number(p.id) === Number(item.product_id));
    if (!product) continue;
    const before = Number(product.stock || 0);
    product.stock = before + Number(item.quantity || 0);
    product.updated_at = nowIso();
    changes.push({ product_id: product.id, product_name: product.name, delta: Number(item.quantity || 0), before, after: product.stock });
  }
  await saveProducts(products);
  if (changes.length) await inventoryLog(admin.user.email, `주문 ${order.order_number} 취소/환불 재고 복원`, changes);
  order.stock_returned = true;
};

const updateOrderStatus = async (admin, orderNumber, body) => {
  const orders = await listOrders();
  const order = orders.find(item => item.order_number === orderNumber);
  if (!order) return json(404, { ok: false, code: 'ORDER_NOT_FOUND' });
  const status = text(body.status, 40);
  if (!ORDER_STATUSES.includes(status)) return json(400, { ok: false, code: 'INVALID_ORDER_STATUS' });
  const before = { status: order.status, tracking_number: order.tracking_number || '', stock_returned: order.stock_returned === true };
  if (['주문 취소','환불 완료'].includes(status) && !order.stock_returned) await restoreStockForOrder(admin, order);
  order.status = status;
  order.tracking_number = text(body.tracking_number, 100);
  order.updated_at = nowIso();
  await saveOrder(order);
  await audit(admin.user.email, 'order.status', 'order', orderNumber, before, { status: order.status, tracking_number: order.tracking_number, stock_returned: order.stock_returned === true });
  return json(200, { ok: true, order });
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const ordersCsv = async () => {
  const rows = await listOrders();
  const columns = ['주문번호','주문자','연락처','배송주소','상품금액','배송비','총액','상태','운송장','주문일시'];
  const lines = rows.map(row => [row.order_number,row.customer_name,row.phone_normalized,row.shipping_address,row.subtotal,row.shipping_fee,row.total,row.status,row.tracking_number,row.created_at].map(csvEscape).join(','));
  return { statusCode: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="shins-house-orders-${new Date().toISOString().slice(0,10)}.csv"`, 'cache-control': 'no-store' }, body: '\uFEFF' + [columns.map(csvEscape).join(','), ...lines].join('\r\n') };
};

const authError = (error) => {
  const code = String(error.message || 'AUTH_ERROR');
  if (code === 'ADMIN_AUTH_NOT_CONFIGURED') return json(503, { ok: false, code, message: '관리자 인증 환경변수 설정이 필요합니다.' });
  if (code === 'ADMIN_NOT_ALLOWED') return json(403, { ok: false, code, message: '관리자 계정 또는 비밀번호가 올바르지 않습니다.' });
  if (code === 'ADMIN_AUTH_REQUIRED' || error.statusCode === 401) return json(401, { ok: false, code: 'ADMIN_AUTH_REQUIRED' });
  return null;
};

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const route = String(event.queryStringParameters?.route || '').replace(/^\/+|\/+$/g, '');
  try {
    if (method === 'POST' && route === 'login') {
      const body = parseBody(event);
      const session = await login(text(body.email, 200).toLowerCase(), String(body.password || ''));
      return json(200, session);
    }
    if (method === 'POST' && route === 'refresh') return json(200, await refresh(String(parseBody(event).refresh_token || '')));
    if (method === 'POST' && route === 'logout') { await logout(event); return json(200, { ok: true }); }

    const admin = await requireAdmin(event);
    if (method === 'GET' && route === 'bootstrap') return json(200, await adminBootstrap());
    if (method === 'GET' && route === 'orders.csv') return await ordersCsv();
    if (method === 'POST' && route === 'products') return await createProduct(admin, parseBody(event));

    const productMatch = route.match(/^products\/(\d+)$/);
    if (productMatch && ['POST','PATCH','PUT'].includes(method)) return await updateProduct(admin, Number(productMatch[1]), parseBody(event));

    const inventoryMatch = route.match(/^inventory\/(\d+)\/adjust$/);
    if (inventoryMatch && ['POST','PATCH','PUT'].includes(method)) return await adjustInventory(admin, Number(inventoryMatch[1]), parseBody(event));

    const orderMatch = route.match(/^orders\/([^/]+)(?:\/status)?$/);
    if (orderMatch && ['POST','PATCH','PUT'].includes(method)) return await updateOrderStatus(admin, decodeURIComponent(orderMatch[1]), parseBody(event));

    return json(404, { ok: false, code: 'ADMIN_ROUTE_NOT_FOUND' });
  } catch (error) {
    console.error('[Shin\'s House admin]', error);
    const auth = authError(error);
    if (auth) return auth;
    return json(error.statusCode === 400 ? 400 : 500, { ok: false, code: 'ADMIN_INTERNAL_ERROR', message: '관리자 요청 처리 중 오류가 발생했습니다.' });
  }
};
