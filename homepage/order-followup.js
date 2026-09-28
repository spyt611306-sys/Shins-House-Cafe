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

  function init() {
    const dialog = document.querySelector('#bank-dialog');
    if (!dialog) return;
    const home = dialog.querySelector('a.checkout-button');
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'payment-notice-button';
    button.className = 'checkout-button';
    button.innerHTML = '입금 완료 알리기 <span>↗</span>';
    const status = document.createElement('p');
    status.id = 'payment-notice-status';
    status.className = 'status-copy';
    status.setAttribute('role','status');
    dialog.insertBefore(button, home);
    dialog.insertBefore(status, home);

    button.addEventListener('click', async () => {
      let last = null; try { last = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch {}
      if (!last?.order_id || !last?.action_token) { status.textContent = '현재 주문의 확인정보를 찾지 못했습니다. 주문번호로 고객센터에 문의해 주세요.'; return; }
      button.disabled = true; status.textContent = '입금 확인 요청을 접수하고 있습니다.';
      try {
        const result = await api(`/api/orders/${encodeURIComponent(last.order_id)}/payment-notice`, { method:'POST', body:JSON.stringify({ action_token:last.action_token }) });
        status.textContent = result.message || '입금 확인 요청이 접수되었습니다.';
        button.textContent = '입금 확인 요청 접수 완료';
        sessionStorage.removeItem(KEY);
      } catch (error) { status.textContent = error.message; button.disabled = false; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
})();
