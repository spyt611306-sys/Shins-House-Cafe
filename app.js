(() => {
  'use strict';

  window.__SHINS_HOUSE_RUNTIME__ = Object.freeze({
    mode: 'production-api',
    apiBase: '/api',
    version: '4.9.0-structural-home'
  });

  const ready = (fn) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();
  const text = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  ready(() => {
    document.querySelectorAll('button:not([type])').forEach((button) => { button.type = 'button'; });

    const toast = document.createElement('div');
    toast.className = 'sh-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    let toastTimer;
    const showToast = (message) => {
      clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add('is-show');
      toastTimer = setTimeout(() => toast.classList.remove('is-show'), 1800);
    };

    const findSection = (patterns) => {
      const nodes = [...document.querySelectorAll('main section, main article, body > section, [data-section]')]
        .filter((node) => !node.classList.contains('sh-home-hero'));
      return nodes.find((node) => patterns.some((pattern) => pattern.test(text(node.textContent).slice(0, 1200))));
    };
    const sections = {
      coffee: document.getElementById('coffee') || findSection([/커피/, /원두/, /coffee/i]),
      goods: document.getElementById('goods') || findSection([/굿즈/, /오브젝트/, /goods/i, /objects/i]),
      store: document.getElementById('store') || findSection([/매장/, /오시는/, /부산/, /store/i, /location/i])
    };
    Object.entries(sections).forEach(([id, node]) => { if (node && !node.id) node.id = id; });

    const scrollTarget = (target) => {
      if (target === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return true;
      }
      const node = document.getElementById(target) || sections[target];
      if (!node) return false;
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    };

    const copyLink = async () => {
      const url = location.href.split('#')[0];
      try {
        await navigator.clipboard.writeText(url);
      } catch (_) {
        const area = document.createElement('textarea');
        area.value = url;
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      showToast('링크를 복사했습니다.');
    };

    const ensureSearchDialog = () => {
      let dialog = document.getElementById('sh-search-dialog');
      if (dialog) return dialog;
      dialog = document.createElement('dialog');
      dialog.id = 'sh-search-dialog';
      dialog.innerHTML = `<form method="dialog" class="sh-search-panel"><button class="sh-search-close" value="cancel" aria-label="검색 닫기">×</button><label for="sh-search-input">사이트에서 찾기</label><div><input id="sh-search-input" type="search" autocomplete="off" placeholder="커피, 굿즈, 매장 등을 검색"><button type="submit" value="search">검색</button></div><p class="sh-search-help">페이지 안의 상품과 콘텐츠를 찾아 이동합니다.</p></form>`;
      document.body.appendChild(dialog);
      dialog.addEventListener('close', () => {
        if (dialog.returnValue !== 'search') return;
        const query = text(dialog.querySelector('input')?.value).toLowerCase();
        if (!query) return;
        const candidates = [...document.querySelectorAll('main section, main article, [class*="product"], [class*="item"]')];
        const match = candidates.find((node) => text(node.textContent).toLowerCase().includes(query));
        if (match) {
          match.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast(`“${query}” 결과로 이동했습니다.`);
        } else {
          showToast(`“${query}” 검색 결과가 없습니다.`);
        }
      });
      return dialog;
    };

    const openExistingCart = () => {
      const candidates = [...document.querySelectorAll('dialog,aside,[data-cart],[id*="cart" i],[class*="cart" i]')]
        .filter((node) => !node.matches('button,a') && !node.classList.contains('sh-brand-lockup'));
      const panel = candidates.find((node) => /drawer|panel|modal|cart|장바구니/i.test(`${node.id} ${node.className} ${text(node.getAttribute('aria-label'))}`));
      if (!panel) return false;
      if (panel instanceof HTMLDialogElement && typeof panel.showModal === 'function') {
        if (!panel.open) panel.showModal();
      } else {
        panel.hidden = false;
        panel.removeAttribute('hidden');
        panel.setAttribute('aria-hidden', 'false');
        panel.classList.add('is-open', 'open', 'active');
      }
      return true;
    };

    document.addEventListener('click', (event) => {
      const control = event.target.closest('a,button,[role="button"]');
      if (!control) return;

      const target = control.getAttribute('data-sh-target');
      if (target) {
        event.preventDefault();
        if (!scrollTarget(target)) showToast('해당 영역을 찾지 못했습니다.');
        return;
      }

      const signature = text(`${control.textContent} ${control.getAttribute('aria-label') || ''} ${control.getAttribute('title') || ''} ${control.id || ''} ${control.className || ''}`);

      if (/공유|share/i.test(signature)) {
        event.preventDefault();
        copyLink();
        return;
      }

      if (/검색|search/i.test(signature)) {
        event.preventDefault();
        const dialog = ensureSearchDialog();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        setTimeout(() => dialog.querySelector('input')?.focus(), 0);
        return;
      }

      if (/장바구니|cart/i.test(signature)) {
        const href = control.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) {
          event.preventDefault();
          if (!openExistingCart()) showToast('장바구니를 열 수 없습니다. 상품 영역에서 다시 시도해 주세요.');
        }
        return;
      }

      if ((control.tagName === 'A' && control.getAttribute('href') === '#') || /^javascript:\s*void/i.test(control.getAttribute('href') || '')) {
        if (/홈/i.test(signature)) { event.preventDefault(); scrollTarget('top'); return; }
        if (/커피|원두/i.test(signature)) { event.preventDefault(); scrollTarget('coffee'); return; }
        if (/굿즈|오브젝트/i.test(signature)) { event.preventDefault(); scrollTarget('goods'); return; }
        if (/매장|오시는/i.test(signature)) { event.preventDefault(); scrollTarget('store'); return; }
      }
    });
  });
})();
