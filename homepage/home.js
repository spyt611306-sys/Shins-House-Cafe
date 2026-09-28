(() => {
  const menu = document.querySelector('#navigation-dialog');
  const search = document.querySelector('#search-dialog');
  const menuOpen = document.querySelector('#menu-open');
  const query = document.querySelector('#menu-query');
  let category = 'all';
  const drinks = [...document.querySelectorAll('.drink')];

  function filter() {
    const term = query.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const drink of drinks) {
      const visible = (category === 'all' || drink.dataset.category === category) && drink.textContent.toLocaleLowerCase().includes(term);
      drink.hidden = !visible;
      if (visible) count++;
    }
    document.querySelector('#no-results').hidden = count > 0;
    document.querySelector('#menu-status').textContent = `${count}개의 메뉴`;
    document.querySelector('.drink-grid').scrollLeft = 0;
  }

  function show(dialog) {
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }

  menuOpen.addEventListener('click', () => {
    show(menu);
    menuOpen.setAttribute('aria-expanded', 'true');
  });

  function openSearch() {
    show(search);
    document.querySelector('#header-query').focus();
  }
  document.querySelector('#search-open').addEventListener('click', openSearch);
  document.querySelector('#menu-search-open').addEventListener('click', () => { menu.close(); openSearch(); });

  for (const dialog of [menu, search]) {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.toggle('dialog-open', menu.open || search.open);
      menuOpen.setAttribute('aria-expanded', 'false');
    });
  }

  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.close()));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => {
      b.classList.toggle('selected', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    filter();
  }));

  query.addEventListener('input', filter);
  document.querySelector('#search-form').addEventListener('submit', event => {
    event.preventDefault();
    query.value = document.querySelector('#header-query').value;
    document.querySelector('[data-filter="all"]').click();
    search.close();
    document.querySelector('#coffee').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    query.focus({ preventScroll: true });
  });

  const money = value => new Intl.NumberFormat('ko-KR').format(Number(value || 0)) + '원';


  const beanState = {
    products: [],
    available: false,
    catalogSource: null,
    commerceReady: false,
    selected: null,
    quantity: 1,
    shippingFee: 3000,
    freeShippingThreshold: 50000
  };

  const beanProducts = document.querySelector('#bean-products');
  const beanImage = document.querySelector('#bean-product-image');
  const beanNote = document.querySelector('#bean-product-note');
  const beanStock = document.querySelector('#bean-stock');
  const beanPrice = document.querySelector('#bean-price');
  const beanShipping = document.querySelector('#bean-shipping');
  const beanAdd = document.querySelector('#bean-add-cart');
  const beanStatus = document.querySelector('#bean-status');
  const retry = document.querySelector('#bean-retry');
  const description = document.querySelector('#bean-product-description');
  const selection = document.querySelector('#bean-selection');
  const packDescription = document.querySelector('#bean-pack-description');
  const beanPackages = [...document.querySelectorAll('[data-bean-qty]')];

  function productImageUrl(value) {
    const src = String(value || '').trim();
    if (!src) return '/assets/logo-20260928.webp';
    if (/^(?:https?:|data:|\/)/i.test(src)) return src;
    return `/${src}`;
  }

  function readCart() {
    try {
      const raw = localStorage.getItem('shins_cart_v30') || localStorage.getItem('shins_cart_v29') || localStorage.getItem('shins_cart_v28') || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeCart(cart) {
    try {
      localStorage.setItem('shins_cart_v30', JSON.stringify(cart));
      return true;
    } catch {
      return false;
    }
  }

  function renderBeanProductOptions() {
    beanProducts.replaceChildren();
    for (const product of beanState.products) {
      const selected = String(beanState.selected?.id) === String(product.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `bean-product-option${selected ? ' selected' : ''}`;
      button.dataset.beanProduct = product.id;
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = Number(product.stock || 0) < 1;
      const name = document.createElement('span');
      name.textContent = product.name || '원두';
      const price = document.createElement('strong');
      price.textContent = button.disabled ? '품절' : money(product.price);
      button.append(name, price);
      button.addEventListener('click', () => selectBeanProduct(product.id));
      beanProducts.append(button);
    }
  }

  function renderBeanOrder() {
    const product = beanState.selected;
    if (!product) return;
    const stock = Math.max(0, Number(product.stock || 0));

    if (stock > 0 && beanState.quantity > stock) beanState.quantity = Math.max(1, Math.min(3, stock));

    for (const button of beanPackages) {
      const qty = Number(button.dataset.beanQty || 1);
      const disabled = stock < qty;
      button.disabled = disabled;
      button.classList.toggle('selected', qty === beanState.quantity);
      button.setAttribute('aria-pressed', String(qty === beanState.quantity));
    }

    const subtotal = Number(product.price || 0) * beanState.quantity;
    beanPrice.textContent = money(subtotal);
    beanShipping.textContent = subtotal >= beanState.freeShippingThreshold
      ? '무료배송 적용 · 온라인 스토어에서 주문정보를 확인합니다.'
      : `배송비 ${money(beanState.shippingFee)} · ${money(beanState.freeShippingThreshold)} 이상 무료배송`;

    beanStock.textContent = beanState.catalogSource === 'fallback' ? '판매 준비 중' : (stock > 0 ? `재고 ${stock}팩` : '현재 품절');
    packDescription.textContent = `200g × ${beanState.quantity}팩`;
    selection.textContent = `${product.name.replace(/\s*200\s*g$/i, '')} · ${beanState.quantity * 200}g`;
    beanStock.classList.toggle('soldout', stock < 1);
    beanAdd.disabled = !beanState.available || stock < beanState.quantity || stock < 1;
    beanAdd.textContent = stock > 0 ? '장바구니 담고 주문하기 ↗' : '현재 품절';
  }

  function selectBeanProduct(id) {
    const product = beanState.products.find(item => String(item.id) === String(id));
    if (!product) return;
    beanState.selected = product;
    const stock = Math.max(0, Number(product.stock || 0));
    if (stock > 0 && beanState.quantity > stock) beanState.quantity = 1;
    beanImage.src = productImageUrl(product.image);
    beanImage.alt = `${product.name} 원두 상품`;
    beanNote.textContent = product.name;
    description.textContent = product.description || '직접 고르고 볶은 신스하우스의 원두입니다.';
    renderBeanProductOptions();
    renderBeanOrder();
  }

  for (const button of beanPackages) {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      beanState.quantity = Number(button.dataset.beanQty || 1);
      renderBeanOrder();
    });
  }

  beanImage?.addEventListener('error', () => {
    beanImage.src = '/assets/logo-20260928.webp';
  }, { once: true });

  beanAdd?.addEventListener('click', () => {
    const product = beanState.selected;
    if (!beanState.available || !product || Number(product.stock || 0) < beanState.quantity) return;

    const cart = readCart();
    const existing = cart.find(item => String(item.product_id) === String(product.id));
    const current = Number(existing?.quantity || 0);
    const next = current + beanState.quantity;
    if (next > Math.min(Number(product.stock || 0), 20)) {
      beanStatus.textContent = '장바구니에 담긴 수량을 포함하면 구매 가능한 수량을 초과합니다. 장바구니를 확인해 주세요.';
      return;
    }

    if (existing) existing.quantity = next;
    else cart.push({ product_id: product.id, quantity: next });

    if (!writeCart(cart)) {
      beanStatus.textContent = '장바구니 저장에 실패했습니다. 온라인 스토어에서 다시 시도해 주세요.';
      return;
    }

    beanStatus.textContent = `${product.name} ${beanState.quantity}팩을 장바구니에 담았습니다.`;
    window.location.href = '/shop.html?open=cart';
  });

  async function initBeanShop() {
    if (!beanProducts) return;
    beanState.available = false;
    beanAdd.disabled = true;
    beanStatus.textContent = '';
    retry.hidden = true;
    let payload;
    try {
      const options = { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) };
      let response = await fetch('/api/bootstrap', options);
      // Existing Netlify deployment may omit rewrite query parameters.
      if (response.status === 404) response = await fetch('/.netlify/functions/api?route=bootstrap', options);
      if (!response.ok) throw new Error(`bootstrap ${response.status}`);
      payload = await response.json();
      if (!Array.isArray(payload.products)) throw new Error('Invalid catalog');
    } catch (error) {
      beanProducts.replaceChildren();
      beanStock.textContent = '확인 불가';
      beanPrice.textContent = '—';
      beanShipping.textContent = '';
      beanStatus.textContent = '가격과 재고를 불러오지 못했습니다. 다시 시도해 주세요.';
      retry.hidden = false;
      return;
    }
    const settings = payload.settings || {};
    beanState.shippingFee = Number(settings.shipping_fee_setting ?? 3000);
    beanState.freeShippingThreshold = Number(settings.free_shipping_threshold ?? 50000);
    beanState.catalogSource = payload.catalog_source;
    beanState.commerceReady = settings.commerce_ready !== false;
    beanState.products = payload.products.filter(product => product.category === 'coffee' && product.active !== false);
    beanState.selected = beanState.products.find(product => Number(product.stock || 0) > 0) || beanState.products[0] || null;
    if (!beanState.selected) {
      beanProducts.textContent = '현재 판매 중인 원두가 없습니다.';
      beanStock.textContent = '판매 준비 중';
      beanPrice.textContent = '—';
      beanShipping.textContent = '';
      return;
    }
    beanState.available = true;
    selectBeanProduct(beanState.selected.id);
    if (!beanState.commerceReady) beanStatus.textContent = '현재 온라인 주문을 준비 중입니다. 선택한 원두는 장바구니에서 확인하실 수 있습니다.';
  }
  retry?.addEventListener('click', initBeanShop);
  initBeanShop();
})();
