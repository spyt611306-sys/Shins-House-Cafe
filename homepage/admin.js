(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ACCESS_KEY = 'shins_admin_access_v43';
  const REFRESH_KEY = 'shins_admin_refresh_v43';
  const money = v => new Intl.NumberFormat('ko-KR').format(Number(v || 0)) + '원';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mediaLabels = {
    hero: '메인 Hero 이미지', logo: '헤더 로고', americano_hot: '아메리카노 HOT', americano_iced: '아이스 아메리카노',
    cafe_latte: '카페라떼', cappuccino: '카푸치노', vanilla_latte: '바닐라라떼', cream_coffee: '크림 커피'
  };
  const state = { data: null, media: {}, token: sessionStorage.getItem(ACCESS_KEY) || '', refresh: sessionStorage.getItem(REFRESH_KEY) || '' };
  let toastTimer;

  function toast(text) {
    const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function setStatus(text = '') { $('#global-status').textContent = text; }
  function authHeaders() { return state.token ? { Authorization: `Bearer ${state.token}` } : {}; }

  async function refreshSession() {
    if (!state.refresh) return false;
    const res = await fetch('/api/admin/refresh', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ refresh_token: state.refresh }) });
    if (!res.ok) return false;
    const body = await res.json();
    state.token = body.access_token || ''; state.refresh = body.refresh_token || state.refresh;
    sessionStorage.setItem(ACCESS_KEY, state.token); sessionStorage.setItem(REFRESH_KEY, state.refresh);
    return Boolean(state.token);
  }

  async function adminApi(route, options = {}, retried = false) {
    const init = { ...options, headers: { 'Content-Type':'application/json', ...authHeaders(), ...(options.headers || {}) } };
    let res = await fetch(`/api/admin/${route}`, init);
    if (res.status === 404) res = await fetch(`/.netlify/functions/admin?route=${encodeURIComponent(route)}`, init);
    if (res.status === 401 && !retried && await refreshSession()) return adminApi(route, options, true);
    let body = {}; try { body = await res.json(); } catch {}
    if (!res.ok) throw new Error(body.message || body.code || '관리자 요청을 처리하지 못했습니다.');
    return body;
  }

  async function contentApi(route, options = {}, retried = false) {
    const init = { ...options, headers: { 'Content-Type':'application/json', ...authHeaders(), ...(options.headers || {}) } };
    let res = await fetch(`/api/site-content/${route}`, init);
    if (res.status === 404) res = await fetch(`/.netlify/functions/content?route=${encodeURIComponent(route)}`, init);
    if (res.status === 401 && !retried && await refreshSession()) return contentApi(route, options, true);
    let body = {}; try { body = await res.json(); } catch {}
    if (!res.ok) throw new Error(body.message || body.code || '이미지 요청을 처리하지 못했습니다.');
    return body;
  }

  async function publicContent() {
    let res = await fetch('/api/site-content');
    if (res.status === 404) res = await fetch('/.netlify/functions/content?route=site-content');
    if (!res.ok) return {};
    const body = await res.json(); return body.media || {};
  }

  function switchTab(tab) {
    $$('.sidebar nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    $('#page-title').textContent = ({ dashboard:'대시보드', products:'제품 관리', orders:'원두 주문 관리', media:'홈페이지 이미지 관리' })[tab] || '관리자';
  }

  function renderDashboard() {
    const op = state.data.operations || {};
    $('#metric-payment').textContent = op.payment_waiting ?? 0;
    $('#metric-shipping').textContent = op.shipping_ready ?? 0;
    $('#metric-stock').textContent = op.low_stock_products?.length ?? 0;
    $('#metric-commerce').textContent = op.commerce_ready ? '정상' : '설정 확인';
    const urgent = (state.data.orders || []).filter(o => ['입금 대기','입금 확인 요청','입금 확인','상품 준비'].includes(o.status)).slice(0, 8);
    $('#dashboard-orders').innerHTML = urgent.length ? urgent.map(o => `<div class="dashboard-order"><div><strong>${esc(o.order_number)}</strong><small>${esc(o.customer_name)} · ${new Date(o.created_at).toLocaleString('ko-KR')}</small></div><span class="badge">${esc(o.status)}</span><span>${money(o.total)}</span></div>`).join('') : '<p>현재 처리할 주문이 없습니다.</p>';
  }

  function productCard(p) {
    return `<article class="product-editor" data-product="${p.id}">
      <div class="product-preview"><img src="${esc(p.image || '/assets/logo-20260928.webp')}" alt="${esc(p.name)}"><label class="upload-button">이미지 업로드<input type="file" accept="image/webp,image/png,image/jpeg" data-product-upload></label></div>
      <div class="product-fields">
        <label><span>상품명</span><input name="name" value="${esc(p.name)}"></label>
        <label><span>가격</span><input name="price" type="number" min="0" value="${Number(p.price || 0)}"></label>
        <label><span>재고</span><input name="stock" type="number" min="0" value="${Number(p.stock || 0)}"></label>
        <label><span>노출</span><select name="active"><option value="true" ${p.active !== false ? 'selected':''}>판매중</option><option value="false" ${p.active === false ? 'selected':''}>숨김</option></select></label>
        <label class="field-wide"><span>상품 설명</span><textarea name="description">${esc(p.description || '')}</textarea></label>
        <label class="field-wide"><span>대표 이미지 경로</span><input name="image" value="${esc(p.image || '')}"></label>
        <div class="product-actions"><button class="save-product" type="button">제품 저장</button></div>
      </div>
    </article>`;
  }

  function renderProducts() {
    const coffees = (state.data.products || []).filter(p => p.category === 'coffee');
    $('#product-list').innerHTML = coffees.map(productCard).join('') || '<p>등록된 원두가 없습니다.</p>';
  }

  function renderOrders() {
    const q = $('#order-search').value.trim().toLowerCase();
    const filter = $('#order-filter').value;
    const orders = (state.data.orders || []).filter(o => (filter === 'all' || o.status === filter) && (!q || `${o.order_number} ${o.customer_name} ${o.phone_normalized}`.toLowerCase().includes(q)));
    $('#order-list').innerHTML = orders.length ? orders.map(o => `<article class="order-card" data-order="${esc(o.order_number)}">
      <div class="order-head"><div><strong>${esc(o.order_number)}</strong><p>${esc(o.customer_name)} · ${esc(o.phone_normalized)} · ${new Date(o.created_at).toLocaleString('ko-KR')}</p></div><div class="order-total"><span class="badge">${esc(o.status)}</span><strong>${money(o.total)}</strong></div></div>
      <div class="order-items">${(o.order_items || []).map(i => `${esc(i.product_name)} × ${i.quantity} — ${money(i.line_total)}`).join('<br>') || '상품 내역 없음'}</div>
      <p class="order-address">배송지: ${esc(o.shipping_address || '-')}<br>메모: ${esc(o.delivery_memo || '-')}</p>
      <div class="order-controls"><label><span>주문 상태</span><select name="status">${(state.data.order_statuses || []).map(s => `<option ${s===o.status?'selected':''}>${esc(s)}</option>`).join('')}</select></label><label><span>운송장 번호</span><input name="tracking" value="${esc(o.tracking_number || '')}" placeholder="배송 시작 시 입력"></label><button type="button" class="save-order">저장</button></div>
    </article>`).join('') : '<div class="panel-card">조건에 맞는 주문이 없습니다.</div>';
  }

  function renderMedia() {
    $('#media-list').innerHTML = Object.entries(mediaLabels).map(([key,label]) => `<article class="media-card" data-media="${key}"><img class="media-preview" src="${esc(state.media[key] || '')}" alt="${esc(label)}"><div class="media-fields"><h3>${esc(label)}</h3><label><span>이미지 경로</span><input value="${esc(state.media[key] || '')}"></label><div class="media-actions"><label class="upload-button">새 이미지 업로드<input type="file" accept="image/webp,image/png,image/jpeg" data-media-upload></label><span class="status"></span></div></div></article>`).join('');
  }

  async function loadAdmin() {
    setStatus('관리자 데이터를 불러오는 중입니다.');
    const [data, media] = await Promise.all([adminApi('bootstrap'), publicContent()]);
    state.data = data; state.media = media;
    const filter = $('#order-filter');
    filter.innerHTML = '<option value="all">전체 상태</option>' + (data.order_statuses || []).map(s => `<option>${esc(s)}</option>`).join('');
    renderDashboard(); renderProducts(); renderOrders(); renderMedia();
    setStatus('');
  }

  async function fileToDataUrl(file) {
    if (!file || file.size > 5 * 1024 * 1024) throw new Error('5MB 이하 이미지로 업로드해 주세요.');
    return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.')); reader.readAsDataURL(file); });
  }

  async function uploadImage(file) {
    const data_url = await fileToDataUrl(file);
    const result = await contentApi('admin/upload', { method:'POST', body: JSON.stringify({ filename:file.name, data_url }) });
    return result.url;
  }

  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const status = $('#login-status'); status.textContent = '로그인 중...';
    try {
      const res = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email:fd.get('email'), password:fd.get('password') }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.message || body.code || '로그인 실패');
      state.token = body.access_token || ''; state.refresh = body.refresh_token || ''; sessionStorage.setItem(ACCESS_KEY,state.token); sessionStorage.setItem(REFRESH_KEY,state.refresh);
      $('#login-view').hidden = true; $('#admin-view').hidden = false; await loadAdmin();
    } catch (err) { status.textContent = err.message; }
  });

  $$('.sidebar nav button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $$('[data-go]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.go)));
  $('#refresh').addEventListener('click', () => loadAdmin().catch(e => setStatus(e.message)));
  $('#logout').addEventListener('click', async () => { try { await adminApi('logout',{method:'POST',body:'{}'}); } catch {} sessionStorage.clear(); location.reload(); });
  $('#order-search').addEventListener('input', renderOrders); $('#order-filter').addEventListener('change', renderOrders);

  document.addEventListener('click', async e => {
    const saveProduct = e.target.closest('.save-product');
    if (saveProduct) {
      const card = saveProduct.closest('[data-product]'); const id = Number(card.dataset.product); const f = card.querySelector('.product-fields');
      const payload = { name:$('[name="name"]',f).value, category:'coffee', description:$('[name="description"]',f).value, price:Number($('[name="price"]',f).value), stock:Number($('[name="stock"]',f).value), image:$('[name="image"]',f).value, active:$('[name="active"]',f).value==='true' };
      try { saveProduct.disabled=true; await adminApi(`products/${id}`,{method:'PATCH',body:JSON.stringify(payload)}); toast('제품 정보를 저장했습니다.'); await loadAdmin(); } catch(err){ toast(err.message); } finally { saveProduct.disabled=false; }
      return;
    }
    const saveOrder = e.target.closest('.save-order');
    if (saveOrder) {
      const card = saveOrder.closest('[data-order]'); const number = card.dataset.order; const payload = { status:$('[name="status"]',card).value, tracking_number:$('[name="tracking"]',card).value };
      try { saveOrder.disabled=true; await adminApi(`orders/${encodeURIComponent(number)}`,{method:'PATCH',body:JSON.stringify(payload)}); toast('주문 상태를 저장했습니다.'); await loadAdmin(); } catch(err){ toast(err.message); } finally { saveOrder.disabled=false; }
    }
  });

  document.addEventListener('change', async e => {
    if (e.target.matches('[data-product-upload]')) {
      const card = e.target.closest('[data-product]');
      try { const url = await uploadImage(e.target.files[0]); $('[name="image"]',card).value=url; $('.product-preview img',card).src=url; toast('이미지를 업로드했습니다. 저장 버튼을 눌러 적용하세요.'); } catch(err){ toast(err.message); }
    }
    if (e.target.matches('[data-media-upload]')) {
      const card = e.target.closest('[data-media]'); const status = $('.status',card);
      try { status.textContent='업로드 중...'; const url=await uploadImage(e.target.files[0]); $('input:not([type="file"])',card).value=url; $('.media-preview',card).src=url; state.media[card.dataset.media]=url; status.textContent='업로드 완료'; } catch(err){ status.textContent=err.message; }
    }
  });

  $('#save-media').addEventListener('click', async () => {
    const media = {}; $$('#media-list [data-media]').forEach(card => media[card.dataset.media] = $('input:not([type="file"])',card).value.trim());
    try { $('#save-media').disabled=true; const result=await contentApi('admin/config',{method:'PUT',body:JSON.stringify({media})}); state.media=result.media; renderMedia(); toast('홈페이지 이미지를 저장했습니다.'); } catch(err){ toast(err.message); } finally { $('#save-media').disabled=false; }
  });

  if (state.token) {
    $('#login-view').hidden = true; $('#admin-view').hidden = false;
    loadAdmin().catch(async err => { sessionStorage.removeItem(ACCESS_KEY); sessionStorage.removeItem(REFRESH_KEY); state.token=''; state.refresh=''; $('#admin-view').hidden=true; $('#login-view').hidden=false; $('#login-status').textContent=err.message; });
  }
})();
