'use strict';

const VERSION = '4.4.0-foundation';

const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders
  },
  body: JSON.stringify(body)
});

const env = (name, fallback = '') => process.env[name] || fallback;
const enabled = env('COMMERCE_ENABLED', 'false').toLowerCase() === 'true';

const settings = {
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
  subscription_enabled: false,
  subscription_kicker: 'MONTHLY COFFEE CLUB',
  subscription_title: '매달 필요한 만큼, 확인한 뒤 준비합니다.',
  subscription_description: '자동결제가 아닌 신청형 구독입니다. 발송 전에 구매 의사를 확인합니다.',
  subscription_notice: '신청 후 판매자가 연락드려 구성과 첫 발송 일정을 확인합니다.',
  subscription_image: 'assets/asset-09-7bb279f9.webp',
  shipping_fee_setting: 3000,
  free_shipping_threshold: 50000,
  business_name: env('BUSINESS_NAME', '신스하우스'),
  representative_name: env('REPRESENTATIVE_NAME', '신현수'),
  business_number: env('BUSINESS_NUMBER'),
  mail_order_number: env('MAIL_ORDER_NUMBER'),
  business_address: env('BUSINESS_ADDRESS', '부산광역시 부산진구 새싹로8번길 35-8 1층'),
  privacy_officer: env('PRIVACY_OFFICER'),
  commerce_ready: enabled
};

const products = [
  { id: 1, name: '하우스 블렌드 200g', category: 'coffee', description: '고소한 단맛과 편안한 여운을 담은 데일리 블렌드', price: 18000, stock: 24, low_stock_threshold: 3, image: 'assets/asset-11-7ec3ab46.webp', active: true, sort_order: 1 },
  { id: 2, name: '나이트 디카페인 200g', category: 'coffee', description: '부드러운 단맛과 낮은 카페인으로 늦은 시간에도 편안한 커피', price: 21000, stock: 18, low_stock_threshold: 3, image: 'assets/asset-12-67790ddf.webp', active: true, sort_order: 2 },
  { id: 3, name: '클래식 크림 머그', category: 'goods', description: '매일 편하게 사용할 수 있는 크림 컬러 머그', price: 19000, stock: 12, low_stock_threshold: 3, image: 'assets/asset-08-409f9713.webp', active: true, sort_order: 3 },
  { id: 4, name: '신스하우스 선물 세트', category: 'gift', description: '원두와 커피 오브젝트를 함께 구성한 선물 세트', price: 39000, stock: 9, low_stock_threshold: 3, image: 'assets/asset-07-dbd7b39f.webp', active: true, sort_order: 4 }
];

const plans = [
  { id: 1, name: '하우스 베이직', description: '매월 원두 한 봉을 취향에 맞춰 안내합니다.', price: 18000, quantity_label: '원두 200g × 1', delivery_cycle: '매월 1회', shipping_fee: 0, subscriber_limit: 0, active: false, sort_order: 1 },
  { id: 2, name: '커피 페어', description: '서로 다른 두 가지 원두를 비교해 즐길 수 있습니다.', price: 34000, quantity_label: '원두 200g × 2', delivery_cycle: '매월 1회', shipping_fee: 0, subscriber_limit: 0, active: false, sort_order: 2 },
  { id: 3, name: '디카페인 클럽', description: '늦은 시간에도 편안한 디카페인 원두 구성입니다.', price: 21000, quantity_label: '디카페인 200g × 1', delivery_cycle: '매월 1회', shipping_fee: 0, subscriber_limit: 0, active: false, sort_order: 3 }
];

const policies = {
  terms: { version: '2026-09-commercialization-draft', title: '이용약관 및 주문계약 안내', summary: '상용화 전 전문 약관 확정이 필요합니다.' },
  privacy: { version: '2026-09-commercialization-draft', title: '개인정보 수집·이용 안내', summary: '상용화 전 보유기간·위탁·파기 절차를 포함한 전문 확정이 필요합니다.', items: '이름, 휴대전화번호, 배송주소, 주문·상담 내용', purpose: '주문 처리, 배송, 고객응대' },
  refund: { version: '2026-09-commercialization-draft', title: '취소·교환·환불 안내', summary: '상용화 전 상품 특성과 관련 법령을 반영한 전문 확정이 필요합니다.', exceptions: '관련 법령상 제한 사유가 있는 경우 제한될 수 있습니다.', refund: '환급과 배송비는 주문 상태와 귀책사유에 따라 처리합니다.' },
  subscription: { version: '2026-09-commercialization-draft', title: '정기구독 신청 안내', summary: '현재 상용 구독 접수는 비활성화되어 있습니다.', cancel: '상용화 이후 변경·해지 절차를 안내합니다.' }
};

const blockers = () => {
  const missing = [];
  if (!env('BUSINESS_NUMBER')) missing.push('BUSINESS_NUMBER');
  if (!env('MAIL_ORDER_NUMBER')) missing.push('MAIL_ORDER_NUMBER');
  if (!env('PRIVACY_OFFICER')) missing.push('PRIVACY_OFFICER');
  if (!env('CUSTOMER_EMAIL')) missing.push('CUSTOMER_EMAIL');
  if (!env('BANK_NAME')) missing.push('BANK_NAME');
  if (!env('BANK_ACCOUNT_NUMBER')) missing.push('BANK_ACCOUNT_NUMBER');
  if (!env('BANK_ACCOUNT_HOLDER')) missing.push('BANK_ACCOUNT_HOLDER');
  if (!env('SUPABASE_URL')) missing.push('SUPABASE_URL');
  if (!env('SUPABASE_SERVICE_ROLE_KEY')) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!enabled) missing.push('COMMERCE_ENABLED=true');
  return missing;
};

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const route = String(event.queryStringParameters?.route || '').replace(/^\/+|\/+$/g, '');

  if (method === 'GET' && route === 'bootstrap') {
    return json(200, { settings, products, subscription_plans: plans, policies });
  }

  if (method === 'GET' && route === 'policies') {
    return json(200, policies);
  }

  if (method === 'GET' && route === 'health/ready') {
    const missing = blockers();
    return json(200, { ok: missing.length === 0, version: VERSION, commerce_ready: missing.length === 0, blockers: missing });
  }

  if (route.startsWith('admin/')) {
    return json(503, {
      ok: false,
      code: 'ADMIN_BACKEND_NOT_READY',
      message: '관리자 인증/운영 백엔드가 아직 상용화되지 않았습니다.'
    });
  }

  if (['orders', 'orders/lookup', 'subscriptions'].includes(route) || /^orders\/.+\/(payment-notice|cancel)$/.test(route)) {
    return json(503, {
      ok: false,
      code: 'COMMERCE_NOT_READY',
      message: '현재 상용 주문 시스템을 준비 중입니다. 운영자가 commerce readiness를 완료한 뒤 주문이 활성화됩니다.'
    });
  }

  return json(404, { ok: false, code: 'NOT_FOUND', message: 'API route not found.' });
};
