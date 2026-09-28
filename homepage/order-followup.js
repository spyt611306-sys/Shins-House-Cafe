(() => {
  const KEY = 'shins_last_order_action';
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : input?.url || '';
      const method = String(args[1]?.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
      const isOrderCreate = method === 'POST' && (/\/api\/orders(?:\?|$)/.test(url) || /route=orders(?:&|$)/.test(url));
      if (isOrderCreate && response.ok) {
        const order = await response.clone().json();
        if (order?.order_id && order?.action_token) sessionStorage.setItem(KEY, JSON.stringify({ order_id: order.order_id, action_token: order.action_token }));
      }
    } catch {}
    return response;
  };

  const money = value => new Intl.NumberFormat('ko-KR').format(Number(value || 0)) + '원';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function api(path, options = {}) {
    let response = await nativeFetch(path, { credentials:'same-origin', headers:{'Content-Type':'application/json'}, ...options });
    if (response.status === 404 && path.startsWith('/api/')) {
      const url = new URL(path, location.origin);
      const route = url.pathname.slice('/api/'.length);
      response = await nativeFetch(`/.netlify/functions/api?route=${encodeURIComponent(route)}`, { credentials:'same-origin', headers:{'Content-Type':'application/json'}, ...options });
    }
    let body = {}; try { body = await response.json(); } catch {}
    if (!response.ok) throw new Error(body.message || body.code || '요청을 처리하지 못했습니다.');
    return body;
  }

  function createLookupDialog() {
    const lookup = document.createElement('dialog');
    lookup.id = 'order-lookup-dialog';
    lookup.className = 'checkout-dialog';
    lookup.innerHTML = `
      <button type="button" class="dialog-close" aria-label="주문조회 닫기">×</button>
      <p class="kicker">ORDER LOOKUP</p><h2>주문 상태를 확인하세요.</h2>
      <form id="order-lookup-form">
        <div class="field-grid"><label><span>주문자명</span><input name="customer_name" required></label><label><span>휴대전화</span><input name="phone" inputmode="tel" placeholder="010-0000-0000" required></label></div>
        <button class="checkout-button" type="submit">주문 조회 <span>↗</span></button>
        <p class="status-copy" id="lookup-status" role="status"></p>
      </form>
      <div id="lookup-results"></div>`;
    document.body.append(lookup);
    lookup.querySelector('.dialog-close').addEventListener('click', () => lookup.close());
    lookup.addEventListener('click', event => { if (event.target === lookup) lookup.close(); });
    return lookup;
  }

  function renderOrders(orders, root) {
    if (!orders?.length) { root.innerHTML = '<div class="checkout-order-summary"><div><span>주문 내역을 찾지 못했습니다.</span></div></div>'; return; }
    root.innerHTML = orders.map(order => `
      <article class="checkout-order-summary" data-public-order="${esc(order.order_id)}">
        <div><span>주문번호</span><strong>${esc(order.order_id)}</strong></div>
        <div><span>상태</span><strong>${esc(order.status)}</strong></div>
        ${(order.items || []).map(item => `<div><span>${esc(item.name)} × ${item.quantity}</span><strong>${money(item.line_total)}</strong></div>`).join('')}
        <div><span>결제금액</span><strong>${money(order.total)}</strong></div>
        <div><span>운송장</span><strong>${esc(order.tracking_number || '등록 전')}</strong></div>
        ${order.status === '입금 대기' ? `<button type="button" class="text-button" data-cancel-order="${esc(order.order_id)}" data-action-token="${esc(order.action_token || '')}">미입금 주문 취소</button>` : ''}
      </article>`).join('');
  }

  function init() {
    const dialog = document.querySelector('#bank-dialog');
    if (!dialog) return;
    const home = dialog.querySelector('a.checkout-button');
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'payment-notice-button'; button.className = 'checkout-button'; button.innerHTML = '입금 완료 알리기 <span>↗</span>';
    const status = document.createElement('p');
    status.id = 'payment-notice-status'; status.className = 'status-copy'; status.setAttribute('role','status');
    dialog.insertBefore(button, home); dialog.insertBefore(status, home);

    button.addEventListener('click', async () => {
      let last = null; try { last = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch {}
      if (!last?.order_id || !last?.action_token) { status.textContent = '현재 주문의 확인정보를 찾지 못했습니다. 주문번호로 주문 조회를 이용해 주세요.'; return; }
      button.disabled = true; status.textContent = '입금 확인 요청을 접수하고 있습니다.';
      try {
        const result = await api(`/api/orders/${encodeURIComponent(last.order_id)}/payment-notice`, { method:'POST', body:JSON.stringify({ action_token:last.action_token }) });
        status.textContent = result.message || '입금 확인 요청이 접수되었습니다.'; button.textContent = '입금 확인 요청 접수 완료'; sessionStorage.removeItem(KEY);
      } catch (error) { status.textContent = error.message; button.disabled = false; }
    });

    const lookupDialog = createLookupDialog();
    const lookupOpen = document.createElement('button');
    lookupOpen.type = 'button'; lookupOpen.className = 'text-button'; lookupOpen.textContent = '기존 주문 조회';
    document.querySelector('.cart-panel .continue-link')?.insertAdjacentElement('afterend', lookupOpen);
    lookupOpen.addEventListener('click', () => lookupDialog.showModal());

    lookupDialog.querySelector('#order-lookup-form').addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const lookupStatus = lookupDialog.querySelector('#lookup-status'); const results = lookupDialog.querySelector('#lookup-results');
      lookupStatus.textContent = '주문 내역을 확인하고 있습니다.';
      try {
        const data = await api('/api/orders/lookup', { method:'POST', body:JSON.stringify({ customer_name:String(form.get('customer_name')||'').trim(), phone:String(form.get('phone')||'').trim() }) });
        renderOrders(data.orders || [], results); lookupStatus.textContent = '';
      } catch(error) { lookupStatus.textContent = error.message; results.innerHTML = ''; }
    });

    lookupDialog.addEventListener('click', async event => {
      const cancel = event.target.closest('[data-cancel-order]'); if (!cancel) return;
      if (!confirm('아직 입금하지 않은 주문을 취소할까요?')) return;
      cancel.disabled = true;
      try {
        const result = await api(`/api/orders/${encodeURIComponent(cancel.dataset.cancelOrder)}/cancel`, { method:'POST', body:JSON.stringify({ action_token:cancel.dataset.actionToken }) });
        cancel.textContent = result.message || '주문이 취소되었습니다.';
      } catch(error) { alert(error.message); cancel.disabled = false; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
})();
