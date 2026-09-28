(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const money = value => new Intl.NumberFormat('ko-KR').format(Number(value || 0)) + '원';
  const CART_KEY = 'shins_cart_v30';
  const allowedNames = new Set(['에티오피아 싱글', '고소 블랜딩', '다크 블랜딩']);
  const localCatalog = [
    { id: 5, name: '에티오피아 싱글', category: 'coffee', description: '꽃향과 복숭아, 시트러스의 산뜻한 여운', price: 27000, stock: 20, image: 'assets/ethiopia-single-1.webp', active: true },
    { id: 6, name: '고소 블랜딩', category: 'coffee', description: '고소한 견과류와 초콜릿, 흑설탕의 편안한 균형', price: 22000, stock: 20, image: 'assets/goso-blending-1.webp', active: true },
    { id: 7, name: '다크 블랜딩', category: 'coffee', description: '깊은 로스팅과 다크초콜릿의 진한 풍미', price: 22000, stock: 20, image: 'assets/dark-blending-1.webp', active: true }
  ];

  const state = { products: [], settings: {}, cart: [], commerceReady: false };
  const grid = $('#product-grid');
  const cartItems = $('#cart-items');
  const checkoutOpen = $('#checkout-open');
  const checkoutDialog = $('#checkout-dialog');
  const bankDialog = $('#bank-dialog');
  let toastTimer;

  function imageUrl(value) {
    const src = String(value || '').trim();
    if (!src) return '/assets/logo-20260928.webp';
    return /^(?:https?:|data:|\/)/i.test(src) ? src : `/${src}`;
  }

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY) || localStorage.getItem('shins_cart_v29') || localStorage.getItem('shins_cart_v28') || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    localStorage.removeItem('shins_cart_v29');
    localStorage.removeItem('shins_cart_v28');
  }

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
  }

  async function api(path, options = {}) {
    const init = { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options };
    let response = await fetch(path, init);
    if (response.status === 404 && path.startsWith('/api/')) {
      const url = new URL(path, location.origin);
      const route = url.pathname.slice('/api/'.length);
      response = await fetch(`/.netlify/functions/api?route=${encodeURIComponent(route)}`, init);
    }
    let body = {};
    try { body = await response.json(); } catch {}
    if (!response.ok) throw new Error(body.message || body.detail || '요청을 처리하지 못했습니다.');
    return body;
  }

  function productById(id) { return state.products.find(product => String(product.id) === String(id)); }

  function sanitizeCart() {
    const validIds = new Set(state.products.map(product => String(product.id)));
    state.cart = readCart()
      .filter(item => validIds.has(String(item.product_id)))
      .map(item => ({ product_id: Number(item.product_id), quantity: Math.max(1, Math.min(20, Number(item.quantity || 1))) }));
    saveCart();
  }

  function totals() {
    const subtotal = state.cart.reduce((sum, item) => {
      const product = productById(item.product_id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    const threshold = Number(state.settings.free_shipping_threshold ?? 50000);
    const fee = Number(state.settings.shipping_fee_setting ?? 3000);
    const shipping = subtotal === 0 || subtotal >= threshold ? 0 : fee;
    return { subtotal, shipping, total: subtotal + shipping, threshold };
  }

  function renderProducts() {
    grid.innerHTML = state.products.map(product => `
      <article class="product-card">
        <div class="product-image"><img src="${imageUrl(product.image)}" alt="${product.name}" loading="eager" decoding="async"></div>
        <div class="product-copy">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <div class="product-price-row"><strong>${money(product.price)}</strong><button type="button" data-add="${product.id}" ${Number(product.stock || 0) < 1 ? 'disabled' : ''}>${Number(product.stock || 0) < 1 ? '품절' : '담기'}</button></div>
        </div>
      </article>`).join('');
    grid.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addCart(Number(button.dataset.add))));
  }

  function renderCart() {
    const details = state.cart.map(item => ({ item, product: productById(item.product_id) })).filter(entry => entry.product);
    $('#cart-count').textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (!details.length) {
      cartItems.innerHTML = '<div class="cart-empty">장바구니가 비어 있습니다.<br>왼쪽에서 원하는 원두를 담아보세요.</div>';
    } else {
      cartItems.innerHTML = details.map(({ item, product }) => `
        <div class="cart-item">
          <img src="${imageUrl(product.image)}" alt="${product.name}">
          <div class="cart-item-copy"><strong>${product.name}</strong><small>${money(product.price)}</small><div class="qty-control"><button type="button" data-minus="${product.id}" aria-label="${product.name} 수량 줄이기">−</button><span>${item.quantity}</span><button type="button" data-plus="${product.id}" aria-label="${product.name} 수량 늘리기">＋</button></div></div>
          <button type="button" class="remove-button" data-remove="${product.id}">삭제</button>
        </div>`).join('');
    }
    const total = totals();
    $('#cart-subtotal').textContent = money(total.subtotal);
    $('#cart-shipping').textContent = total.shipping ? money(total.shipping) : '무료';
    $('#cart-total').textContent = money(total.total);
    $('#shipping-note').textContent = `${money(total.threshold)} 이상 무료배송`;
    checkoutOpen.disabled = details.length === 0;
    cartItems.querySelectorAll('[data-minus]').forEach(button => button.addEventListener('click', () => changeQty(Number(button.dataset.minus), -1)));
    cartItems.querySelectorAll('[data-plus]').forEach(button => button.addEventListener('click', () => changeQty(Number(button.dataset.plus), 1)));
    cartItems.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => removeCart(Number(button.dataset.remove))));
  }

  function addCart(id) {
    const product = productById(id);
    if (!product || Number(product.stock || 0) < 1) return;
    const item = state.cart.find(entry => entry.product_id === id);
    const max = Math.min(Number(product.stock || 0), 20);
    if (item) item.quantity = Math.min(max, item.quantity + 1);
    else state.cart.push({ product_id: id, quantity: 1 });
    saveCart();
    renderCart();
    toast(`${product.name}을 장바구니에 담았습니다.`);
  }

  function changeQty(id, delta) {
    const product = productById(id);
    const item = state.cart.find(entry => entry.product_id === id);
    if (!product || !item) return;
    item.quantity = Math.max(0, Math.min(Math.min(Number(product.stock || 0), 20), item.quantity + delta));
    if (!item.quantity) state.cart = state.cart.filter(entry => entry.product_id !== id);
    saveCart();
    renderCart();
  }

  function removeCart(id) {
    state.cart = state.cart.filter(entry => entry.product_id !== id);
    saveCart();
    renderCart();
  }

  function renderCheckoutSummary() {
    const container = $('#checkout-order-summary');
    const lines = state.cart.map(item => {
      const product = productById(item.product_id);
      return product ? `<div><span>${product.name} × ${item.quantity}</span><strong>${money(product.price * item.quantity)}</strong></div>` : '';
    }).join('');
    const total = totals();
    container.innerHTML = `${lines}<div><span>배송비</span><strong>${total.shipping ? money(total.shipping) : '무료'}</strong></div><div><span>결제 예정금액</span><strong>${money(total.total)}</strong></div>`;
  }

  checkoutOpen.addEventListener('click', () => {
    if (!state.cart.length) return;
    renderCheckoutSummary();
    $('#checkout-status').textContent = state.commerceReady ? '' : '현재 주문 설정을 확인 중입니다. 주문 접수 시 설정 상태를 다시 확인합니다.';
    checkoutDialog.showModal();
  });

  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close)?.close()));
  for (const dialog of [checkoutDialog, bankDialog]) dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  $('#cart-clear').addEventListener('click', () => {
    if (!state.cart.length) return;
    state.cart = [];
    saveCart();
    renderCart();
  });

  $('#checkout-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!state.cart.length) return;
    const form = new FormData(event.currentTarget);
    const address = [form.get('postcode'), form.get('address'), form.get('address_detail')].filter(Boolean).join(' ').trim();
    const payload = {
      customer_name: String(form.get('customer_name') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      shipping_address: address,
      memo: String(form.get('memo') || '').trim(),
      items: state.cart.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
      consents: { terms: form.get('terms') === 'on', privacy: form.get('privacy') === 'on', refund: form.get('refund') === 'on' }
    };
    const submit = $('#order-submit');
    const status = $('#checkout-status');
    submit.disabled = true;
    submit.firstChild.textContent = '주문 접수 중... ';
    status.textContent = '';
    try {
      const order = await api('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
      state.cart = [];
      saveCart();
      renderCart();
      event.currentTarget.reset();
      checkoutDialog.close();
      $('#bank-order-number').textContent = `주문번호 ${order.order_id}`;
      $('#bank-name').textContent = order.bank?.bank_name || '-';
      $('#bank-account').textContent = order.bank?.account_number || '-';
      $('#bank-holder').textContent = order.bank?.account_holder || '-';
      $('#bank-amount').textContent = money(order.total);
      $('#bank-notice').textContent = order.bank?.transfer_notice || '입금 확인 후 상품을 준비해 보내드립니다.';
      bankDialog.showModal();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
      submit.firstChild.textContent = '주문 접수하기 ';
    }
  });

  async function init() {
    $('#catalog-status').textContent = '상품 정보를 불러오고 있습니다.';
    try {
      const payload = await api('/api/bootstrap');
      state.settings = payload.settings || {};
      state.commerceReady = state.settings.commerce_ready !== false;
      const live = Array.isArray(payload.products) ? payload.products.filter(product => product.category === 'coffee' && product.active !== false && allowedNames.has(String(product.name).replace(/\s*200\s*g$/i, ''))) : [];
      state.products = live.length === 3 ? live.map(product => ({ ...product, name: String(product.name).replace(/\s*200\s*g$/i, '') })) : localCatalog;
      $('#catalog-status').textContent = state.commerceReady ? '신스하우스가 직접 로스팅하고 포장·검수 후 보내드립니다.' : '신스하우스 원두 3종을 확인할 수 있습니다.';
    } catch {
      state.products = localCatalog;
      state.settings = { shipping_fee_setting: 3000, free_shipping_threshold: 50000 };
      $('#catalog-status').textContent = '현재 기본 상품 정보로 표시하고 있습니다.';
    }
    sanitizeCart();
    renderProducts();
    renderCart();
    if (new URLSearchParams(location.search).get('open') === 'cart') {
      requestAnimationFrame(() => $('#cart').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
    }
  }

  init();
})();