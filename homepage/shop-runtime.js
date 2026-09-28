'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
function storageGet(key) { try { return window.localStorage.getItem(key); } catch { return null; } }
function storageSet(key, value) { try { window.localStorage.setItem(key, value); } catch {} }
function sessionGet(key) { try { return window.sessionStorage.getItem(key); } catch { return null; } }
function sessionSet(key, value) { try { window.sessionStorage.setItem(key, value); } catch {} }
function sessionRemove(key) { try { window.sessionStorage.removeItem(key); } catch {} }
const ADMIN_ACCESS_KEY = 'shins_admin_access_v43';
const ADMIN_REFRESH_KEY = 'shins_admin_refresh_v43';
function adminAccessToken(){ return sessionGet(ADMIN_ACCESS_KEY) || ''; }
function clearAdminSession(){ sessionRemove(ADMIN_ACCESS_KEY); sessionRemove(ADMIN_REFRESH_KEY); }
async function refreshAdminSession(){
  const refresh_token = sessionGet(ADMIN_REFRESH_KEY);
  if (!refresh_token) return false;
  const response = await fetch('/api/admin/refresh', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({refresh_token}) });
  if (!response.ok) { clearAdminSession(); return false; }
  const body = await response.json();
  if (!body.access_token) { clearAdminSession(); return false; }
  sessionSet(ADMIN_ACCESS_KEY, body.access_token);
  if (body.refresh_token) sessionSet(ADMIN_REFRESH_KEY, body.refresh_token);
  return true;
}

const state = {
  settings: null,
  products: [],
  subscriptionPlans: [],
  policies: null,
  cart: JSON.parse(storageGet('shins_cart_v30') || storageGet('shins_cart_v29') || storageGet('shins_cart_v28') || '[]'),
  filter: 'all',
  detail: null,
  hero: 0,
  heroPaused: false,
  heroTimer: null,
  lastOrder: null,
  lookup: { orders: [], subscriptions: [] },
  admin: null,
};

const money = value => new Intl.NumberFormat('ko-KR').format(Number(value || 0)) + '원';
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[char]));
const categoryName = category => ({ coffee: '원두', goods: '굿즈', gift: '선물' }[category] || category);

function toast(text, duration = 3000) {
  const element = $('#toast');
  element.textContent = text;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), duration);
}

async function api(url, options = {}, retried = false) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (url.startsWith('/api/admin/') && !url.endsWith('/login') && !url.endsWith('/refresh')) {
    const token = adminAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let response = await fetch(url, { credentials: 'same-origin', ...options, headers });
  if (response.status === 404 && url.startsWith('/api/')) {
    const target = new URL(url, window.location.origin);
    const admin = target.pathname.startsWith('/api/admin/');
    const route = target.pathname.slice(admin ? '/api/admin/'.length : '/api/'.length);
    target.searchParams.set('route', route);
    response = await fetch(`/.netlify/functions/${admin ? 'admin' : 'api'}?${target.searchParams}`, { credentials: 'same-origin', ...options, headers });
  }
  if (response.status === 401 && url.startsWith('/api/admin/') && !retried && !url.endsWith('/login') && !url.endsWith('/refresh')) {
    if (await refreshAdminSession()) return api(url, options, true);
  }
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const detail = Array.isArray(body.detail) ? body.detail.map(item => item.msg).join('\n') : body.detail;
    throw new Error(detail || '요청을 처리하지 못했습니다.');
  }
  return body;
}

async function uploadAdminImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/admin/uploads', { method: 'POST', body: formData, credentials: 'same-origin', headers: adminAccessToken() ? { Authorization: `Bearer ${adminAccessToken()}` } : {} });
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const detail = Array.isArray(body.detail) ? body.detail.map(item => item.msg).join('\n') : body.detail;
    throw new Error(detail || '이미지 업로드에 실패했습니다.');
  }
  return body;
}

function imageFallback(image) {
  if (!image) return;
  image.onerror = () => {
    image.onerror = null;
    image.src = '/static/assets/logo-transparent.webp';
    image.classList.add('fallback');
  };
}

async function shareSite() {
  const shareData = { title: "Shin's House · Life With Coffee", text: '부산 서면 로스터리 신스하우스. 커피와 굿즈를 매장에서 직접 확인해 준비합니다.', url: location.href.split('#')[0] };
  try {
    if (navigator.share) await navigator.share(shareData);
    else { await navigator.clipboard.writeText(shareData.url); toast('사이트 주소를 복사했습니다.'); }
  } catch (error) {
    if (error?.name !== 'AbortError') toast('공유하지 못했습니다. 주소를 직접 복사해주세요.');
  }
}

function openModal(id) {
  const modal = typeof id === 'string' ? document.getElementById(id) : id;
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lock');
  setTimeout(() => modal.querySelector('input:not([type="hidden"]), button, select, textarea')?.focus(), 80);
}

function closeModal(target) {
  const modal = target?.classList?.contains('modal') ? target : target?.closest?.('.modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (!$('.modal.open') && !$('#mobileMenu').classList.contains('open')) document.body.classList.remove('lock');
}

function closeAll() {
  $$('.modal.open').forEach(closeModal);
}

function saveCart() {
  storageSet('shins_cart_v30', JSON.stringify(state.cart));
  renderCartCount();
}

function cartDetails() {
  return state.cart
    .map(item => ({ ...item, product: state.products.find(product => product.id === item.product_id) }))
    .filter(item => item.product);
}

function totals() {
  const subtotal = cartDetails().reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const threshold = Number(state.settings?.free_shipping_threshold ?? 50000);
  const baseShipping = Number(state.settings?.shipping_fee_setting ?? 3000);
  const shipping = subtotal === 0 || subtotal >= threshold ? 0 : baseShipping;
  return { subtotal, shipping, total: subtotal + shipping };
}

function renderCartCount() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  $('#cartCount').textContent = count;
  $('#mobileCartCount').textContent = count;
}

function addCart(id, quantity = 1) {
  const product = state.products.find(item => item.id === id);
  if (!product) return;
  if (!product.stock) {
    toast('현재 재고가 없습니다.');
    return;
  }
  const current = state.cart.find(item => item.product_id === id);
  const nextQuantity = Math.min(product.stock, 20, (current?.quantity || 0) + Number(quantity || 1));
  if (current) current.quantity = nextQuantity;
  else state.cart.push({ product_id: id, quantity: nextQuantity });
  saveCart();
  toast(`${product.name}을 장바구니에 담았습니다.`);
}

function updateCart(id, delta) {
  const item = state.cart.find(entry => entry.product_id === id);
  const product = state.products.find(entry => entry.id === id);
  if (!item || !product) return;
  item.quantity = Math.max(0, Math.min(product.stock, 20, item.quantity + delta));
  if (!item.quantity) state.cart = state.cart.filter(entry => entry.product_id !== id);
  saveCart();
  renderCart();
}

function bindProductMotion() {
  if (matchMedia('(hover: none)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('.product-card', $('#productGrid')).forEach(card => {
    const image = card.querySelector('.product-visual img');
    if (!image) return;
    const reset = () => {
      card.style.removeProperty('--mx'); card.style.removeProperty('--my');
      image.style.setProperty('--tx', '0px'); image.style.setProperty('--ty', '0px');
      image.style.setProperty('--rx', '0deg'); image.style.setProperty('--ry', '0deg');
    };
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
      image.style.setProperty('--tx', `${(x - .5) * 12}px`);
      image.style.setProperty('--ty', `${(y - .5) * 9}px`);
      image.style.setProperty('--rx', `${(.5 - y) * 8}deg`);
      image.style.setProperty('--ry', `${(x - .5) * 10}deg`);
    });
    card.addEventListener('pointerleave', reset);
  });
}

function renderProducts() {
  const list = state.products.filter(product => state.filter === 'all' || product.category === state.filter);
  $('#productCount').textContent = `${list.length}개 상품`;
  $('#productGrid').innerHTML = list.length
    ? list.map((product, index) => `
      <article class="product-card reveal visible" data-product="${product.id}">
        <div class="product-visual">
          <span class="product-tag">${esc(categoryName(product.category))}</span>
          <img src="${esc(product.image)}" alt="${esc(product.name)}" loading="${index < 4 ? 'eager' : 'lazy'}" decoding="async" ${index < 2 ? 'fetchpriority="high"' : ''}>
        </div>
        <div class="product-body">
          <span class="product-category">${esc(categoryName(product.category))}</span>
          <h3>${esc(product.name)}</h3>
          <p>${esc(product.description)}</p>
          <div class="product-meta">
            <strong class="product-price">${money(product.price)}</strong>
            <div class="product-actions">
              <button class="detail-btn" data-id="${product.id}" aria-label="${esc(product.name)} 상세보기"><svg><use href="#icon-search"/></svg></button>
              <button class="add" data-add="${product.id}" aria-label="${esc(product.name)} 장바구니 담기" ${product.stock ? '' : 'disabled'}><svg><use href="#icon-cart"/></svg></button>
            </div>
          </div>
          <small class="stock-copy">${product.stock ? `재고 ${product.stock}개` : '품절'}</small>
        </div>
      </article>`).join('')
    : '<p class="empty-copy">등록된 상품이 없습니다.</p>';
  $$('#productGrid img').forEach(imageFallback);
  bindProductMotion();
}

function renderCart() {
  const items = cartDetails();
  $('#cartItems').innerHTML = items.length
    ? items.map(({ product, quantity }) => `
      <div class="cart-item">
        <img src="${esc(product.image)}" alt="${esc(product.name)}">
        <div class="cart-item-copy">
          <strong>${esc(product.name)}</strong><small>${money(product.price)}</small>
          <div class="cart-qty"><button data-cart-minus="${product.id}" aria-label="수량 줄이기">−</button><span>${quantity}</span><button data-cart-plus="${product.id}" aria-label="수량 늘리기">＋</button></div>
        </div>
        <button class="cart-remove" data-cart-remove="${product.id}">삭제</button>
      </div>`).join('')
    : '<div class="cart-empty"><div><strong>장바구니가 비어 있습니다.</strong><p>신스하우스의 커피와 굿즈를 담아보세요.</p></div></div>';
  $$('#cartItems img').forEach(imageFallback);
  const total = totals();
  $('#cartSubtotal').textContent = money(total.subtotal);
  $('#cartShipping').textContent = total.shipping ? money(total.shipping) : '무료';
  $('#cartTotal').textContent = money(total.total);
}

function renderCheckout() {
  const total = totals();
  $('#checkoutItems').innerHTML = cartDetails().map(({ product, quantity }) => `
    <div class="checkout-summary-line"><span>${esc(product.name)} × ${quantity}</span><strong>${money(product.price * quantity)}</strong></div>`).join('');
  $('#checkoutSubtotal').textContent = money(total.subtotal);
  $('#checkoutShipping').textContent = total.shipping ? money(total.shipping) : '무료';
  $('#checkoutTotal').textContent = money(total.total);
}

function openProduct(id) {
  const product = state.products.find(item => item.id === Number(id));
  if (!product) return;
  state.detail = product;
  $('#detailImage').src = product.image;
  $('#detailImage').alt = product.name;
  imageFallback($('#detailImage'));
  $('#detailCategory').textContent = categoryName(product.category);
  $('#detailName').textContent = product.name;
  $('#detailDescription').textContent = product.description;
  $('#detailPrice').textContent = money(product.price);
  $('#detailQty').value = 1;
  $('#detailAdd').disabled = !product.stock;
  $('#detailAdd').textContent = product.stock ? '장바구니 담기' : '품절';
  openModal('productModal');
}

const heroContents = [
  () => ({ kicker: state.settings.hero_kicker, title1: state.settings.hero_title_1, title2: state.settings.hero_title_2, copy: state.settings.hero_copy }),
  () => ({ kicker: "HOUSE COLLECTION", title1: '취향은 다르지만', title2: '기준은 분명하게.', copy: '산미, 단맛, 바디감을 어렵지 않게 비교하고 내 생활에 맞는 커피를 고릅니다.' }),
  () => ({ kicker: 'COFFEE & OBJECTS', title1: '커피와 함께 쓰는', title2: '좋은 물건들.', copy: '매일 손이 가는 머그와 선물 구성을 신스하우스의 기준으로 소개합니다.' }),
];

function showHero(index) {
  const slides = $$('.hero-slide');
  state.hero = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === state.hero));
  const content = heroContents[state.hero]();
  $('#heroKicker').textContent = content.kicker;
  $('#heroTitle1').textContent = content.title1;
  $('#heroTitle2').textContent = content.title2;
  $('#heroCopy').textContent = content.copy;
  $('#heroCurrent').textContent = String(state.hero + 1).padStart(2, '0');
  requestAnimationFrame(fitHeroTitle);
  $$('#heroDots button').forEach((button, buttonIndex) => button.classList.toggle('active', buttonIndex === state.hero));
  scheduleHero();
}

function scheduleHero() {
  clearInterval(state.heroTimer);
  if (!state.heroPaused && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.heroTimer = setInterval(() => showHero(state.hero + 1), 6500);
  }
}

function initHero() {
  $('#heroDots').innerHTML = $$('.hero-slide').map((_, index) => `<button aria-label="${index + 1}번 배너" data-hero="${index}"></button>`).join('');
  showHero(0);
}

function policyHtml(type) {
  const policy = state.policies?.[type];
  if (!policy) return '';
  if (type === 'terms') return `<h3>주문과 계약</h3><p>${esc(policy.summary)}</p><h3>주문 확인과 변경</h3><p>주문 전 상품명·수량·상품금액·배송비·최종금액을 확인할 수 있으며, 주문 접수 후 무통장입금 안내를 제공합니다.</p><h3>배송</h3><p>${esc(state.settings.shipping_notice)}</p>`;
  if (type === 'privacy') return `<h3>수집·이용 목적</h3><p>${esc(policy.purpose)}</p><h3>수집 항목</h3><p>${esc(policy.items)}</p><h3>보유 및 이용기간</h3><p>${esc(policy.retention)}</p><h3>동의 거부</h3><p>${esc(policy.refusal)}</p><p>마케팅 수신 동의는 선택이며 주문 필수 동의와 분리됩니다.</p>`;
  if (type === 'subscription') return `<h3>신청 방식</h3><p>${esc(policy.summary)}</p><h3>일시정지·해지</h3><p>${esc(policy.cancel)}</p><h3>입금과 발송</h3><p>${esc(state.settings.subscription_notice)}</p>`;
  return `<h3>청약철회와 주문 취소</h3><p>${esc(policy.summary)}</p><h3>제한 사유</h3><p>${esc(policy.exceptions)}</p><h3>환급과 배송비</h3><p>${esc(policy.refund)}</p><h3>접수 방법</h3><p>고객센터 ${esc(state.settings.customer_phone)} 또는 ${esc(state.settings.customer_email)}로 주문번호와 사유를 알려주세요. 반품 주소: ${esc(state.settings.return_address)}</p>`;
}

function openPolicy(type) {
  const policy = state.policies?.[type];
  if (!policy) return;
  $('#policyTitle').textContent = policy.title;
  $('#policyBody').innerHTML = policyHtml(type);
  openModal('policyModal');
}

function renderSearch(query = '') {
  const normalized = query.trim().toLowerCase();
  const list = state.products.filter(product => !normalized || `${product.name} ${product.description}`.toLowerCase().includes(normalized));
  $('#searchResults').innerHTML = list.length
    ? list.slice(0, 10).map(product => `<button class="search-result" data-search-product="${product.id}"><img src="${esc(product.image)}" alt=""><span><strong>${esc(product.name)}</strong><small>${money(product.price)}</small></span><svg width="18" height="18"><use href="#icon-arrow"/></svg></button>`).join('')
    : '<p>검색 결과가 없습니다.</p>';
  $$('#searchResults img').forEach(imageFallback);
}

function fillBankModal(order) {
  if (!order?.bank) {
    toast('이 주문의 입금정보를 불러올 수 없습니다.');
    return;
  }
  state.lastOrder = order;
  $('#bankOrderNo').textContent = `주문번호 ${order.order_id}`;
  $('#bankName').textContent = order.bank.bank_name;
  $('#bankAccount').textContent = order.bank.account_number;
  $('#bankHolder').textContent = order.bank.account_holder;
  $('#bankAmount').textContent = money(order.total);
  $('#bankShipping').textContent = order.bank.shipping_notice || state.settings.shipping_notice;
  $('#bankNotice').textContent = order.bank.transfer_notice || '';
  openModal('bankModal');
}

function orderProgress(status) {
  const steps = ['주문 접수','입금 확인','상품 준비','배송 중','배송 완료'];
  const indexMap = {'입금 대기':0,'입금 확인 요청':0,'입금 확인':1,'상품 준비':2,'배송 중':3,'배송 완료':4};
  if (['주문 취소','환불 완료'].includes(status)) return `<div class="order-timeline cancelled"><span class="done">주문 접수</span><span>${esc(status)}</span></div>`;
  const current = indexMap[status] ?? 0;
  return `<div class="order-timeline">${steps.map((step,index)=>`<span class="${index<=current?'done':''} ${index===current?'current':''}">${step}</span>`).join('')}</div>`;
}

function renderOrderResults(orders, subscriptions = []) {
  state.lookup = { orders, subscriptions };
  const orderCards = orders.map((order, index) => {
    const statusClass = order.status.includes('대기') || order.status.includes('요청') ? 'wait' : order.status.includes('배송') ? 'ship' : order.status.includes('취소') || order.status.includes('환불') ? 'cancel' : '';
    const bankButton = order.bank ? `<button class="btn secondary compact" data-bank-order="${index}">계좌 다시 보기</button>` : '';
    const cancelButton = ['입금 대기','입금 확인 요청'].includes(order.status) ? `<button class="btn danger compact" data-cancel-order="${index}">주문 취소</button>` : '';
    return `<article class="order-result">
      <div class="order-result-head"><div><strong>${esc(order.order_id)}</strong><small>${new Date(order.created_at).toLocaleString('ko-KR')}</small></div><span class="status-pill ${statusClass}">${esc(order.status)}</span></div>
      ${orderProgress(order.status)}
      <div class="order-result-items">${order.items.map(item => `${esc(item.name)} × ${item.quantity}`).join('<br>')}</div>
      <dl><div><dt>결제금액</dt><dd>${money(order.total)}</dd></div><div><dt>배송비</dt><dd>${order.shipping_fee ? money(order.shipping_fee) : '무료'}</dd></div><div><dt>운송장</dt><dd>${esc(order.tracking_number || '등록 전')}</dd></div></dl>
      ${bankButton || cancelButton ? `<div class="order-result-actions"><div>${bankButton}${cancelButton}</div><small>미입금 주문은 즉시 취소할 수 있습니다. 입금 확인 이후에는 고객센터로 문의해주세요.</small></div>` : ''}
    </article>`;
  }).join('');
  const subscriptionCards = subscriptions.map(subscription => `<article class="order-result subscription-result"><div class="order-result-head"><div><strong>${esc(subscription.subscription_id)}</strong><small>${new Date(subscription.created_at).toLocaleString('ko-KR')}</small></div><span class="status-pill">${esc(subscription.status)}</span></div><div class="order-result-items"><b>${esc(subscription.plan.name || '')}</b><br>${esc(subscription.plan.quantity_label || '')} · ${money(subscription.plan.price || 0)}</div></article>`).join('');
  $('#orderLookupResults').innerHTML = orderCards || subscriptionCards
    ? `${orderCards}${subscriptionCards ? `<div class="lookup-section-title">구독 신청 내역</div>${subscriptionCards}` : ''}`
    : '<div class="cart-empty"><div><strong>주문 또는 구독 내역을 찾지 못했습니다.</strong><p>이름과 전화번호를 다시 확인해주세요.</p></div></div>';
}

function renderSubscriptionSection() {
  const settings = state.settings;
  const section = $('#subscription');
  section.hidden = !settings.subscription_enabled;
  $('#subscriptionKicker').textContent = settings.subscription_kicker;
  $('#subscriptionTitle').textContent = settings.subscription_title;
  $('#subscriptionDescription').textContent = settings.subscription_description;
  $('#subscriptionImage').src = settings.subscription_image;
  imageFallback($('#subscriptionImage'));
  $('#subscriptionPreviewPlans').innerHTML = state.subscriptionPlans.slice(0, 3).map(plan => `<span><b>${esc(plan.name)}</b>${esc(plan.quantity_label)} · ${esc(plan.delivery_cycle || '매월 1회')} · 상품 ${money(plan.price)}${plan.shipping_fee ? ` + 배송 ${money(plan.shipping_fee)}` : ''}</span>`).join('');
  $('#subscriptionOpen').disabled = !settings.subscription_enabled || !state.subscriptionPlans.length;
}

function renderSubscriptionForm() {
  $('#subscriptionPlanOptions').innerHTML = state.subscriptionPlans.map((plan, index) => `<label class="subscription-plan-option"><input type="radio" name="plan_id" value="${plan.id}" ${index === 0 ? 'checked' : ''}><span><b>${esc(plan.name)}</b><small>${esc(plan.description)}</small><em>${esc(plan.quantity_label)} · ${esc(plan.delivery_cycle || '매월 1회')} · 상품 ${money(plan.price)}${plan.shipping_fee ? ` + 배송 ${money(plan.shipping_fee)}` : ''}</em></span></label>`).join('');
  $('#subscriptionNotice').textContent = state.settings.subscription_notice;
}

function openMenu() {
  const menu = $('#mobileMenu');
  menu.classList.add('open');
  menu.setAttribute('aria-hidden', 'false');
  $('#menuOpen').setAttribute('aria-expanded', 'true');
  document.body.classList.add('lock');
}

function closeMenu() {
  const menu = $('#mobileMenu');
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
  $('#menuOpen').setAttribute('aria-expanded', 'false');
  if (!$('.modal.open')) document.body.classList.remove('lock');
}

function initReveal() {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('.reveal').forEach(element => element.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12 });
  $$('.reveal').forEach(element => observer.observe(element));
}

function fillSite() {
  const settings = state.settings;
  const topPhone = $('#topPhone');
  if (topPhone) { topPhone.textContent = `고객상담 ${settings.customer_phone}`; topPhone.href = `tel:${settings.customer_phone.replace(/\D/g, '')}`; }
  $('#footerContact').textContent = `고객상담 ${settings.customer_phone}`;
  $('#mobileHeroKicker').textContent = settings.hero_kicker;
  $('#mobileHeroTitle1').textContent = settings.hero_title_1;
  $('#mobileHeroTitle2').textContent = settings.hero_title_2;
  $('#mobileHeroCopy').textContent = settings.hero_copy;
  const heroImages = [settings.hero_image_1, settings.hero_image_2, settings.hero_image_3];
  $$('.hero-slide img').forEach((image, index) => { if (heroImages[index]) { image.src = heroImages[index]; imageFallback(image); } });
  const mobileHeroImage = $('.mobile-hero-photo img');
  if (mobileHeroImage && heroImages[0]) { mobileHeroImage.src = heroImages[0]; imageFallback(mobileHeroImage); }
  const business = [settings.business_name, settings.representative_name ? `대표 ${settings.representative_name}` : '', settings.business_number ? `사업자등록번호 ${settings.business_number}` : '', settings.mail_order_number ? `통신판매업 ${settings.mail_order_number}` : '', settings.business_address].filter(Boolean);
  $('#footerBusiness').innerHTML = business.map(value => `<span>${esc(value)}</span>`).join('');
  renderSubscriptionSection();
}

async function bootstrap() {
  const result = await api('/api/bootstrap');
  state.settings = result.settings;
  state.products = result.products;
  state.subscriptionPlans = result.subscription_plans || [];
  state.policies = result.policies;
  state.cart = state.cart.filter(item => state.products.some(product => product.id === item.product_id));
  saveCart();
  fillSite();
  renderProducts();
  renderCartCount();
  initHero();
  initReveal();
  $$('.hero-slide img, .story-section img, .visit-section img').forEach(imageFallback);
}

function syncConsentMaster(master, items) {
  if (!master || !items.length) return;
  const checked = items.filter(item => item.checked).length;
  master.checked = checked === items.length;
  master.indeterminate = checked > 0 && checked < items.length;
}

function bindConsentGroup(masterSelector, itemSelector) {
  const master = $(masterSelector);
  const items = $$(itemSelector);
  if (!master || !items.length) return;
  master.addEventListener('change', () => {
    const checked = master.checked;
    items.forEach(item => { item.checked = checked; });
    master.checked = checked;
    master.indeterminate = false;
  });
  items.forEach(item => item.addEventListener('change', () => syncConsentMaster(master, items)));
  syncConsentMaster(master, items);
}

function resetConsentGroup(masterSelector, itemSelector) {
  const master = $(masterSelector);
  const items = $$(itemSelector);
  if (master) { master.checked = false; master.indeterminate = false; }
  items.forEach(item => { item.checked = false; });
}

function fitHeroTitle() {
  const title = $('#heroTitle');
  const copy = $('.hero-copy');
  if (!title || !copy) return;
  const max = innerWidth <= 600 ? 52 : innerWidth <= 1000 ? 72 : 96;
  const min = innerWidth <= 340 ? 28 : 32;
  let size = max;
  title.style.fontSize = `${size}px`;
  const spans = $$('span', title);
  while (size > min && spans.some(span => span.scrollWidth > copy.clientWidth)) {
    size -= 1;
    title.style.fontSize = `${size}px`;
  }
}

function statusClass(status) {
  if (status.includes('대기') || status.includes('요청') || status.includes('접수')) return 'wait';
  if (status.includes('배송') || status.includes('활성')) return 'ship';
  if (status.includes('취소') || status.includes('환불') || status.includes('해지')) return 'cancel';
  return '';
}

function showConsumer() {
  $('#adminView').hidden = true;
  $('#consumerView').hidden = false;
  document.body.classList.remove('admin-mode');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAdmin() {
  closeAll();
  $('#consumerView').hidden = true;
  $('#adminView').hidden = false;
  document.body.classList.add('admin-mode');
  window.scrollTo({ top: 0 });
}

function setAdminPage(page) {
  $$('[data-admin-page]').forEach(button => button.classList.toggle('active', button.dataset.adminPage === page));
  $$('.admin-page').forEach(section => section.classList.toggle('active', section.id === `admin-${page}`));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fillSettingsForm() {
  const form = $('#settingsForm');
  const settings = state.admin.settings;
  Object.entries(settings).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else field.value = value ?? '';
  });
}

function renderAdminMetrics() {
  const orders = state.admin.orders;
  const subscriptions = state.admin.subscriptions;
  const values = [
    ['전체 주문', orders.length],
    ['입금 확인 요청', orders.filter(order => order.status === '입금 확인 요청').length],
    ['배송 준비', orders.filter(order => ['입금 확인', '상품 준비'].includes(order.status)).length],
    ['구독 신청', subscriptions.filter(subscription => subscription.status === '신청 접수').length],
  ];
  $('#adminMetrics').innerHTML = values.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join('');
  const checks = [
    ['주문 계좌', state.admin.settings.commerce_ready, state.admin.settings.commerce_ready ? '주문 접수 가능' : '실제 계좌 입력 필요'],
    ['판매 상품', state.admin.products.some(product => product.active && product.stock > 0), `${state.admin.products.filter(product => product.active && product.stock > 0).length}개 판매 가능`],
    ['정기구독', state.admin.settings.subscription_enabled && state.admin.subscription_plans.some(plan => plan.active), state.admin.settings.subscription_enabled ? '구독 상품 확인' : '구독 신청 중지'],
    ['판매자 정보', Boolean(state.admin.settings.business_name && state.admin.settings.business_address), '푸터 표시정보 확인'],
  ];
  $('#adminReadiness').innerHTML = checks.map(([label, ok, copy]) => `<article class="${ok ? 'ready' : 'warn'}"><span>${ok ? '준비' : '확인'}</span><div><b>${label}</b><small>${esc(copy)}</small></div></article>`).join('');
  const ops = state.admin.operations || {};
  const low = ops.low_stock_products || [];
  const operationCards = [
    ['입금 확인 필요', ops.payment_waiting || 0, 'orders'],
    ['배송 준비 필요', ops.shipping_ready || 0, 'orders'],
    ['신규 구독 상담', ops.new_subscriptions || 0, 'subscriptions'],
    ['재고 주의 상품', low.length, 'products'],
  ];
  const warnings = [...(ops.security_warnings || []), ...(!ops.commerce_ready ? ['무통장입금 계좌를 실제 정보로 설정해야 주문을 받을 수 있습니다.'] : [])];
  $('#adminOperations').innerHTML = `<div class="ops-head"><div><span>TO DO</span><b>지금 확인할 업무</b></div>${warnings.length ? `<small>${warnings.map(esc).join(' · ')}</small>` : '<small>운영 준비 상태가 정상입니다.</small>'}</div><div class="ops-grid">${operationCards.map(([label,value,page])=>`<button data-admin-page="${page}" class="op-card ${value?'attention':''}"><span>${label}</span><strong>${value}</strong></button>`).join('')}</div>${low.length ? `<div class="low-stock-list">${low.slice(0,6).map(item=>`<span><b>${esc(item.name)}</b> 재고 ${item.stock} / 기준 ${item.low_stock_threshold}</span>`).join('')}</div>` : ''}`;
  const recent = orders.slice(0, 8);
  $('#recentOrders').innerHTML = recent.map(order => `<tr><td>${esc(order.order_id)}</td><td>${new Date(order.created_at).toLocaleDateString('ko-KR')}</td><td>${esc(order.buyer_name)}</td><td>${money(order.total)}</td><td><span class="status-pill ${statusClass(order.status)}">${esc(order.status)}</span></td></tr>`).join('') || '<tr><td colspan="5">주문이 없습니다.</td></tr>';
  $('#recentOrderCards').innerHTML = recent.map(order => `<article><div><strong>${esc(order.order_id)}</strong><span class="status-pill ${statusClass(order.status)}">${esc(order.status)}</span></div><p>${new Date(order.created_at).toLocaleDateString('ko-KR')} · ${esc(order.buyer_name)}</p><b>${money(order.total)}</b></article>`).join('') || '<p>주문이 없습니다.</p>';
}

function renderAdminProducts() {
  const query = ($('#adminProductSearch')?.value || '').trim().toLowerCase();
  const filter = $('#adminProductFilter')?.value || 'all';
  const list = state.admin.products.filter(product => {
    const matchesQuery = !query || `${product.name} ${product.description}`.toLowerCase().includes(query);
    const low = product.stock <= (product.low_stock_threshold ?? 3);
    const matchesFilter = filter === 'all' || (filter === 'active' && product.active) || (filter === 'hidden' && !product.active) || (filter === 'low' && product.active && low);
    return matchesQuery && matchesFilter;
  });
  $('#adminProductRows').innerHTML = list.map(product => { const low = product.stock <= (product.low_stock_threshold ?? 3); return `<tr><td><div class="admin-product-cell"><img src="${esc(product.image)}" alt=""><span><b>${esc(product.name)}</b><small>${esc(product.description)}</small></span></div></td><td>${esc(categoryName(product.category))}</td><td>${money(product.price)}</td><td><span class="${low?'stock-low':''}">${product.stock}${low?' · 주의':''}</span></td><td>${product.active ? '판매중' : '숨김'}</td><td><button class="btn secondary compact" data-edit-product="${product.id}">편집</button></td></tr>`; }).join('') || '<tr><td colspan="6">조건에 맞는 상품이 없습니다.</td></tr>';
  $('#adminProductCards').innerHTML = list.map(product => { const low = product.stock <= (product.low_stock_threshold ?? 3); return `<article><img src="${esc(product.image)}" alt=""><div><span>${esc(categoryName(product.category))}</span><strong>${esc(product.name)}</strong><small>${money(product.price)} · 재고 <i class="${low?'stock-low':''}">${product.stock}</i> · ${product.active ? '판매중' : '숨김'}</small></div><button class="btn secondary compact" data-edit-product="${product.id}">편집</button></article>`; }).join('') || '<p>조건에 맞는 상품이 없습니다.</p>';
  $$('#adminProductRows img, #adminProductCards img').forEach(imageFallback);
}

function renderAdminOrders() {
  const query = $('#adminOrderSearch').value.trim().toLowerCase();
  const filter = $('#adminOrderFilter').value;
  const list = state.admin.orders.filter(order => (filter === 'all' || order.status === filter) && (!query || `${order.order_id} ${order.buyer_name}`.toLowerCase().includes(query)));
  $('#adminOrderList').innerHTML = list.map(order => `<article class="admin-order-card"><div><h3>${esc(order.order_id)} <span class="status-pill ${statusClass(order.status)}">${esc(order.status)}</span></h3><p>${new Date(order.created_at).toLocaleString('ko-KR')} · ${esc(order.buyer_name)} · ${esc(order.phone)}</p><p>${esc(order.address)}</p><div class="admin-order-items">${order.items.map(item => `${esc(item.name)} × ${item.quantity}`).join('<br>')}</div><strong>${money(order.total)}</strong>${order.request ? `<p>요청: ${esc(order.request)}</p>` : ''}</div><div class="admin-order-actions"><select data-order-status="${esc(order.order_id)}">${state.admin.order_statuses.map(status => `<option ${status === order.status ? 'selected' : ''}>${esc(status)}</option>`).join('')}</select><input data-order-tracking="${esc(order.order_id)}" value="${esc(order.tracking_number)}" placeholder="운송장번호"><button class="btn primary compact" data-save-order="${esc(order.order_id)}">주문 상태 저장</button></div></article>`).join('') || '<div class="admin-card">조건에 맞는 주문이 없습니다.</div>';
}

function renderAdminSubscriptions() {
  const plans = state.admin.subscription_plans;
  $('#adminSubscriptionPlans').innerHTML = plans.map(plan => `<article class="admin-plan-row"><div><b>${esc(plan.name)}</b><small>${esc(plan.quantity_label)} · ${esc(plan.delivery_cycle || '매월 1회')} · 상품 ${money(plan.price)}${plan.shipping_fee ? ` + 배송 ${money(plan.shipping_fee)}` : ''}</small><p>${esc(plan.description)}</p></div><div><span class="status-pill ${plan.active ? 'ship' : ''}">${plan.active ? '신청 가능' : '숨김'}</span><button class="btn secondary compact" data-edit-subscription-plan="${plan.id}">편집</button></div></article>`).join('') || '<p>등록된 구독 상품이 없습니다.</p>';
  const query = ($('#adminSubscriptionSearch')?.value || '').trim().toLowerCase();
  const filter = $('#adminSubscriptionFilter')?.value || 'all';
  const requests = state.admin.subscriptions.filter(subscription => (filter === 'all' || subscription.status === filter) && (!query || `${subscription.subscription_id} ${subscription.buyer_name} ${subscription.plan.name || ''}`.toLowerCase().includes(query)));
  $('#subscriptionRequestCount').textContent = `${requests.length}건`;
  $('#adminSubscriptionRequests').innerHTML = requests.map(subscription => `<article class="admin-subscription-row"><div><h3>${esc(subscription.subscription_id)} <span class="status-pill ${statusClass(subscription.status)}">${esc(subscription.status)}</span></h3><p>${new Date(subscription.created_at).toLocaleString('ko-KR')} · ${esc(subscription.buyer_name)} · ${esc(subscription.phone)}</p><p>${esc(subscription.address)}</p><strong>${esc(subscription.plan.name || '')} · ${esc(subscription.plan.quantity_label || '')} · ${money(subscription.plan.price || 0)}</strong>${subscription.note ? `<p>상담 메모: ${esc(subscription.note)}</p>` : ''}</div><div class="admin-subscription-actions"><select data-subscription-status="${esc(subscription.subscription_id)}">${state.admin.subscription_statuses.map(status => `<option ${status === subscription.status ? 'selected' : ''}>${esc(status)}</option>`).join('')}</select><button class="btn primary compact" data-save-subscription="${esc(subscription.subscription_id)}">상태 저장</button></div></article>`).join('') || '<p>조건에 맞는 구독 신청이 없습니다.</p>';
}

function openProductEditor(product = null) {
  const form = $('#productEditorForm');
  form.reset();
  $('#productEditorTitle').textContent = product ? '상품 편집' : '상품 추가';
  form.elements.id.value = product?.id || '';
  ['name', 'category', 'description', 'price', 'stock', 'low_stock_threshold', 'image', 'sort_order'].forEach(key => { if (product && form.elements[key]) form.elements[key].value = product[key]; });
  form.elements.active.value = product?.active ? '1' : '0';
  form.elements.low_stock_threshold.value = product?.low_stock_threshold ?? 3;
  const preview = $('#productImagePreview');
  if (preview) { preview.src = product?.image || '/static/assets/logo-transparent.webp'; imageFallback(preview); }
  openModal('productEditorModal');
}

function openSubscriptionPlanEditor(plan = null) {
  const form = $('#subscriptionPlanEditorForm');
  form.reset();
  $('#subscriptionPlanEditorTitle').textContent = plan ? '구독 상품 편집' : '구독 상품 추가';
  form.elements.id.value = plan?.id || '';
  ['name', 'description', 'price', 'quantity_label', 'delivery_cycle', 'shipping_fee', 'subscriber_limit', 'sort_order'].forEach(key => { if (plan && form.elements[key]) form.elements[key].value = plan[key]; });
  form.elements.active.value = plan?.active ? '1' : '0';
  const deleteButton = $('#deleteSubscriptionPlan');
  deleteButton.hidden = !plan;
  deleteButton.dataset.planId = plan?.id || '';
  openModal('subscriptionPlanEditorModal');
}

async function loadAdmin() {
  try {
    state.admin = await api('/api/admin/bootstrap');
    showAdmin();
    fillSettingsForm();
    renderAdminMetrics();
    renderAdminProducts();
    renderAdminOrders();
    renderAdminSubscriptions();
    $('#adminOrderFilter').innerHTML = `<option value="all">전체 상태</option>${state.admin.order_statuses.map(status => `<option>${esc(status)}</option>`).join('')}`;
    $('#adminSubscriptionFilter').innerHTML = `<option value="all">전체 상태</option>${state.admin.subscription_statuses.map(status => `<option>${esc(status)}</option>`).join('')}`;
  } catch (error) {
    if (error.message.includes('로그인') || error.message.includes('세션')) openModal('adminPinModal');
    else toast(error.message);
  }
}

let footerClicks = [];
function footerSecret() {
  const now = Date.now();
  footerClicks = footerClicks.filter(timestamp => now - timestamp <= 3000);
  footerClicks.push(now);
  if (footerClicks.length >= 7) {
    footerClicks = [];
    openModal('adminPinModal');
  }
}

// Delegated actions

document.addEventListener('click', async event => {
  const close = event.target.closest('[data-close]');
  if (close) { closeModal(close); return; }
  const menuClose = event.target.closest('[data-menu-close]');
  if (menuClose) { closeMenu(); return; }
  const add = event.target.closest('[data-add]');
  if (add) { addCart(Number(add.dataset.add)); return; }
  const detail = event.target.closest('.detail-btn,[data-search-product]');
  if (detail) { closeModal(detail); openProduct(Number(detail.dataset.id || detail.dataset.searchProduct)); return; }
  const minus = event.target.closest('[data-cart-minus]');
  if (minus) { updateCart(Number(minus.dataset.cartMinus), -1); return; }
  const plus = event.target.closest('[data-cart-plus]');
  if (plus) { updateCart(Number(plus.dataset.cartPlus), 1); return; }
  const remove = event.target.closest('[data-cart-remove]');
  if (remove) { state.cart = state.cart.filter(item => item.product_id !== Number(remove.dataset.cartRemove)); saveCart(); renderCart(); return; }
  const filter = event.target.closest('[data-filter]');
  if (filter) { state.filter = filter.dataset.filter; $$('[data-filter]').forEach(button => button.classList.toggle('active', button === filter)); renderProducts(); return; }
  const policy = event.target.closest('[data-policy]');
  if (policy) { event.preventDefault(); openPolicy(policy.dataset.policy); return; }
  const adminNav = event.target.closest('[data-admin-page]');
  if (adminNav && $('#adminView').contains(adminNav)) { setAdminPage(adminNav.dataset.adminPage); return; }
  const editProduct = event.target.closest('[data-edit-product]');
  if (editProduct) { openProductEditor(state.admin.products.find(product => product.id === Number(editProduct.dataset.editProduct))); return; }
  const editPlan = event.target.closest('[data-edit-subscription-plan]');
  if (editPlan) { openSubscriptionPlanEditor(state.admin.subscription_plans.find(plan => plan.id === Number(editPlan.dataset.editSubscriptionPlan))); return; }
  const cancelOrder = event.target.closest('[data-cancel-order]');
  if (cancelOrder) {
    const order = state.lookup.orders[Number(cancelOrder.dataset.cancelOrder)];
    const form = $('#cancelOrderForm');
    form.reset();
    form.elements.order_id.value = order.order_id;
    form.elements.action_token.value = order.action_token;
    openModal('cancelOrderModal');
    return;
  }
  const bankOrder = event.target.closest('[data-bank-order]');
  if (bankOrder) { fillBankModal(state.lookup.orders[Number(bankOrder.dataset.bankOrder)]); return; }
  const saveOrder = event.target.closest('[data-save-order]');
  if (saveOrder) {
    const id = saveOrder.dataset.saveOrder;
    const status = $(`[data-order-status="${CSS.escape(id)}"]`).value;
    const tracking = $(`[data-order-tracking="${CSS.escape(id)}"]`).value;
    try {
      await api(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status, tracking_number: tracking }) });
      toast('주문 상태를 저장했습니다.');
      await loadAdmin();
    } catch (error) { toast(error.message); }
    return;
  }
  const saveSubscription = event.target.closest('[data-save-subscription]');
  if (saveSubscription) {
    const id = saveSubscription.dataset.saveSubscription;
    const status = $(`[data-subscription-status="${CSS.escape(id)}"]`).value;
    try {
      await api(`/api/admin/subscriptions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast('구독 상태를 저장했습니다.');
      await loadAdmin();
    } catch (error) { toast(error.message); }
  }
});

$$('.cart-trigger').forEach(button => button.addEventListener('click', () => { renderCart(); openModal('cartModal'); }));
$('#searchOpen').addEventListener('click', () => { renderSearch(''); openModal('searchModal'); });
$('#mobileSearchOpen').addEventListener('click', () => { renderSearch(''); openModal('searchModal'); });
$('#shareOpen').addEventListener('click', shareSite);
$('#mobileShareOpen').addEventListener('click', shareSite);
$('#footerShare').addEventListener('click', shareSite);
$('#productSearchInput').addEventListener('input', event => renderSearch(event.target.value));
$('#menuOpen').addEventListener('click', openMenu);
$('#mobileMenuOpen').addEventListener('click', openMenu);
$('#menuOrderLookup').addEventListener('click', () => { closeMenu(); openModal('orderLookupModal'); });
$('#orderLookupOpen')?.addEventListener('click', () => openModal('orderLookupModal'));
$('#mobileOrderLookup').addEventListener('click', () => openModal('orderLookupModal'));
$('#mobileLookupShortcut').addEventListener('click', () => openModal('orderLookupModal'));
$('#mobileOrderHero')?.addEventListener('click', () => openModal('orderLookupModal'));
$('#mobileSubscriptionShortcut').addEventListener('click', () => $('#subscriptionOpen').click());
$('#heroPrev').addEventListener('click', () => showHero(state.hero - 1));
$('#heroNext').addEventListener('click', () => showHero(state.hero + 1));
$('#heroPause').addEventListener('click', () => { state.heroPaused = !state.heroPaused; $('#heroPause').textContent = state.heroPaused ? '▶' : 'Ⅱ'; scheduleHero(); });
$('#heroDots').addEventListener('click', event => { const button = event.target.closest('[data-hero]'); if (button) showHero(Number(button.dataset.hero)); });
$('#detailMinus').addEventListener('click', () => $('#detailQty').value = Math.max(1, Number($('#detailQty').value) - 1));
$('#detailPlus').addEventListener('click', () => $('#detailQty').value = Math.min(20, Number($('#detailQty').value) + 1));
$('#detailAdd').addEventListener('click', () => { if (!state.detail?.stock) return; addCart(state.detail.id, Number($('#detailQty').value)); closeModal($('#productModal')); });

$('#checkoutOpen').addEventListener('click', () => {
  if (!state.cart.length) { toast('장바구니에 상품을 담아주세요.'); return; }
  if (!state.settings?.commerce_ready) { toast('현재 주문 준비 중입니다. 관리자 계좌 설정 후 주문할 수 있습니다.'); return; }
  renderCheckout();
  closeModal($('#cartModal'));
  setTimeout(() => openModal('checkoutModal'), 100);
});

$('#checkoutForm').addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  if (!state.cart.length) return;
  const form = new FormData(formElement);
  const payload = {
    buyer_name: form.get('buyer_name'), phone: form.get('phone'), postcode: form.get('postcode'), address: form.get('address'),
    address_detail: form.get('address_detail'), request: form.get('request'),
    items: state.cart.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
    consent_terms: Boolean(form.get('consent_terms')), consent_privacy: Boolean(form.get('consent_privacy')),
    consent_refund: Boolean(form.get('consent_refund')), consent_marketing: Boolean(form.get('consent_marketing')),
    consent_order_confirm: Boolean(form.get('consent_order_confirm')),
  };
  const button = $('#payButton');
  button.disabled = true;
  button.textContent = '주문 접수 중…';
  try {
    const result = await api('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
    state.lastOrder = result;
    state.cart = [];
    saveCart();
    formElement.reset();
    resetConsentGroup('#checkoutAgreeAll', '#checkoutForm [data-consent-item]');
    closeModal($('#checkoutModal'));
    fillBankModal(result);
    await bootstrap();
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = '입금하기'; }
});

$('#paymentNoticeOpen').addEventListener('click', () => {
  closeModal($('#bankModal'));
  setTimeout(() => openModal('paymentConfirmModal'), 100);
});
$('#paymentNoticeBack').addEventListener('click', () => {
  closeModal($('#paymentConfirmModal'));
  setTimeout(() => openModal('bankModal'), 100);
});
$('#paymentNoticeConfirm').addEventListener('click', async () => {
  if (!state.lastOrder) return;
  const button = $('#paymentNoticeConfirm');
  button.disabled = true;
  try {
    const payload = state.lastOrder.public_token
      ? { public_token: state.lastOrder.public_token }
      : { action_token: state.lastOrder.action_token };
    const result = await api(`/api/orders/${encodeURIComponent(state.lastOrder.order_id)}/payment-notice`, { method: 'POST', body: JSON.stringify(payload) });
    closeModal($('#paymentConfirmModal'));
    toast(result.message, 4200);
    setTimeout(() => openModal('orderLookupModal'), 500);
  } catch (error) {
    toast(error.message);
    closeModal($('#paymentConfirmModal'));
    setTimeout(() => openModal('bankModal'), 100);
  } finally { button.disabled = false; }
});

$('#orderLookupForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const result = await api('/api/orders/lookup', { method: 'POST', body: JSON.stringify({ buyer_name: form.get('buyer_name'), phone: form.get('phone') }) });
    renderOrderResults(result.orders, result.subscriptions || []);
  } catch (error) { toast(error.message); }
});

$('#subscriptionOpen').addEventListener('click', () => {
  if (!state.settings.subscription_enabled) { toast('현재 정기구독 신청을 받고 있지 않습니다.'); return; }
  if (!state.subscriptionPlans.length) { toast('현재 신청 가능한 구독 상품이 없습니다.'); return; }
  renderSubscriptionForm();
  openModal('subscriptionModal');
});
$('#cancelOrderForm').addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const button = event.submitter;
  button.disabled = true;
  try {
    const result = await api(`/api/orders/${encodeURIComponent(form.get('order_id'))}/cancel`, { method: 'POST', body: JSON.stringify({ action_token: form.get('action_token'), reason: form.get('reason'), consent_cancel: Boolean(form.get('consent_cancel')) }) });
    closeModal($('#cancelOrderModal'));
    toast(result.message, 4500);
    $('#orderLookupForm').requestSubmit();
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
});

$('#subscriptionForm').addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const payload = {
    buyer_name: form.get('buyer_name'), phone: form.get('phone'), postcode: form.get('postcode'), address: form.get('address'),
    address_detail: form.get('address_detail'), note: form.get('note'), plan_id: Number(form.get('plan_id')),
    consent_terms: Boolean(form.get('consent_terms')), consent_privacy: Boolean(form.get('consent_privacy')),
  };
  const button = $('#subscriptionSubmit');
  button.disabled = true;
  button.textContent = '신청 접수 중…';
  try {
    const result = await api('/api/subscriptions', { method: 'POST', body: JSON.stringify(payload) });
    formElement.reset();
    resetConsentGroup('#subscriptionAgreeAll', '#subscriptionForm [data-subscription-consent]');
    closeModal($('#subscriptionModal'));
    toast(`구독 신청이 접수되었습니다. ${result.subscription_id}`, 5000);
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = '구독 신청 접수'; }
});

$('#footerAdminLogo').addEventListener('click', footerSecret);
$('#adminPinForm').addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  try {
    const result = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
    sessionSet(ADMIN_ACCESS_KEY, result.access_token || '');
    sessionSet(ADMIN_REFRESH_KEY, result.refresh_token || '');
    formElement.reset();
    closeModal($('#adminPinModal'));
    await loadAdmin();
  } catch (error) { clearAdminSession(); toast(error.message); }
});
$('#adminLogout').addEventListener('click', async () => { try { await api('/api/admin/logout', { method: 'POST', body: '{}' }); } catch {} clearAdminSession(); state.admin = null; showConsumer(); toast('로그아웃했습니다.'); });
$('#adminPreview').addEventListener('click', showConsumer);
$('#adminRefresh').addEventListener('click', loadAdmin);
$('#adminOrderSearch').addEventListener('input', renderAdminOrders);
$('#adminOrderFilter').addEventListener('change', renderAdminOrders);
$('#adminProductSearch').addEventListener('input', renderAdminProducts);
$('#adminProductFilter').addEventListener('change', renderAdminProducts);
$('#adminSubscriptionSearch').addEventListener('input', renderAdminSubscriptions);
$('#adminSubscriptionFilter').addEventListener('change', renderAdminSubscriptions);
$('#newProduct').addEventListener('click', () => openProductEditor());
$('#newSubscriptionPlan').addEventListener('click', () => openSubscriptionPlanEditor());
$('#settingsForm').addEventListener('input', () => { $('#settingsDirty').textContent = '저장하지 않은 변경사항'; $('#settingsDirty').classList.add('changed'); });

$('#settingsForm').addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const data = Object.fromEntries(new FormData(formElement));
  data.subscription_enabled = formElement.elements.subscription_enabled.checked;
  data.shipping_fee_setting = Number(data.shipping_fee_setting);
  data.free_shipping_threshold = Number(data.free_shipping_threshold);
  const button = event.submitter;
  button.disabled = true;
  try {
    await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(data) });
    toast('홈페이지·계좌·구독 설정을 저장했습니다.');
    $('#settingsDirty').textContent = '저장된 상태'; $('#settingsDirty').classList.remove('changed');
    await loadAdmin();
    const result = await api('/api/bootstrap');
    state.settings = result.settings;
    state.policies = result.policies;
    state.subscriptionPlans = result.subscription_plans || [];
    fillSite();
    showHero(state.hero);
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
});

$('#productEditorForm').addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const values = Object.fromEntries(new FormData(formElement));
  const id = values.id;
  delete values.id;
  const payload = { ...values, price: Number(values.price), stock: Number(values.stock), low_stock_threshold: Number(values.low_stock_threshold), sort_order: Number(values.sort_order), active: values.active === '1' };
  try {
    await api(id ? `/api/admin/products/${id}` : '/api/admin/products', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    closeModal($('#productEditorModal'));
    toast('상품을 저장했습니다.');
    await loadAdmin();
    const result = await api('/api/bootstrap');
    state.products = result.products;
    renderProducts();
  } catch (error) { toast(error.message); }
});

$('#subscriptionPlanEditorForm').addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const values = Object.fromEntries(new FormData(formElement));
  const id = values.id;
  delete values.id;
  const payload = { ...values, price: Number(values.price), shipping_fee: Number(values.shipping_fee), subscriber_limit: Number(values.subscriber_limit), sort_order: Number(values.sort_order), active: values.active === '1' };
  try {
    await api(id ? `/api/admin/subscription-plans/${id}` : '/api/admin/subscription-plans', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    closeModal($('#subscriptionPlanEditorModal'));
    toast('구독 상품을 저장했습니다.');
    await loadAdmin();
    const result = await api('/api/bootstrap');
    state.subscriptionPlans = result.subscription_plans || [];
    renderSubscriptionSection();
  } catch (error) { toast(error.message); }
});

$('#deleteSubscriptionPlan').addEventListener('click', async event => {
  const id = Number(event.currentTarget.dataset.planId || 0);
  if (!id || !confirm('이 구독 상품을 삭제하거나 숨김 처리할까요? 기존 신청 이력이 있으면 안전하게 숨김 처리됩니다.')) return;
  event.currentTarget.disabled = true;
  try {
    const result = await api(`/api/admin/subscription-plans/${id}`, { method: 'DELETE' });
    closeModal($('#subscriptionPlanEditorModal'));
    toast(result.message || '구독 상품을 처리했습니다.');
    await loadAdmin();
    const bootstrapResult = await api('/api/bootstrap');
    state.subscriptionPlans = bootstrapResult.subscription_plans || [];
    renderSubscriptionSection();
  } catch (error) { toast(error.message); }
  finally { event.currentTarget.disabled = false; }
});

document.addEventListener('change', async event => {
  const input = event.target.closest('[data-image-upload]');
  if (!input || !input.files?.[0]) return;
  const file = input.files[0];
  const targetName = input.dataset.uploadTarget;
  const form = input.closest('form');
  const target = form?.elements?.[targetName];
  if (!target) { toast('이미지 경로 입력란을 찾을 수 없습니다.'); return; }
  input.disabled = true;
  try {
    const result = await uploadAdminImage(file);
    target.value = result.url;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    const previewId = input.dataset.previewTarget;
    if (previewId) { const preview = document.getElementById(previewId); if (preview) preview.src = result.url; }
    toast(result.width && result.height ? `이미지를 업로드했습니다. ${result.width}×${result.height}` : '이미지를 업로드했습니다.');
  } catch (error) { toast(error.message, 4500); }
  finally { input.disabled = false; input.value = ''; }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeAll(); closeMenu();
  }
});
window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  $('#scrollProgress').style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
  $('#siteHeader').classList.toggle('compact', scrollY > 35);
}, { passive: true });

bindConsentGroup('#checkoutAgreeAll', '#checkoutForm [data-consent-item]');
bindConsentGroup('#subscriptionAgreeAll', '#subscriptionForm [data-subscription-consent]');
window.addEventListener('resize', fitHeroTitle);

function initImmersiveMotion() {
  const hero = $('.desktop-hero');
  const spotlight = $('.hero-spotlight');
  if (hero && spotlight && !matchMedia('(hover: none)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      spotlight.style.left = `${((event.clientX - rect.left) / rect.width) * 100}%`;
      spotlight.style.top = `${((event.clientY - rect.top) / rect.height) * 100}%`;
    });
  }
  const floatImage = $('.story-float');
  if (floatImage && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', () => {
      if (innerWidth < 761) return;
      const rect = floatImage.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const progress = (innerHeight - rect.top) / (innerHeight + rect.height);
      floatImage.style.transform = `translateY(${(progress - .5) * -20}px)`;
    }, { passive: true });
  }
}

initImmersiveMotion();

bootstrap().catch(error => {
  console.error(error);
  toast('사이트 정보를 불러오지 못했습니다.');
});


async function downloadAdminCsv(url, filename) {
  let token = adminAccessToken();
  let response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (response.status === 401 && await refreshAdminSession()) {
    token = adminAccessToken();
    response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  }
  if (!response.ok) { toast('CSV 파일을 만들지 못했습니다.'); return; }
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
$('#adminOrdersCsv')?.addEventListener('click', () => downloadAdminCsv('/api/admin/orders.csv', 'shins-house-orders.csv'));
$('#adminSubscriptionsCsv')?.addEventListener('click', () => downloadAdminCsv('/api/admin/subscriptions.csv', 'shins-house-subscriptions.csv'));
