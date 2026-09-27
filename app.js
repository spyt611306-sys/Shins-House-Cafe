(() => {
  'use strict';

  window.__SHINS_HOUSE_RUNTIME__ = Object.freeze({
    mode: 'production-api',
    apiBase: '/api',
    version: '5.1.0-home-replacement'
  });

  const ready = (fn) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once:true })
    : fn();
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

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

    const scrollTarget = (target) => {
      if (target === 'top') {
        window.scrollTo({ top:0, behavior:'smooth' });
        return true;
      }
      const node = document.getElementById(target);
      if (!node) {
        showToast('해당 영역을 준비 중입니다.');
        return false;
      }
      node.scrollIntoView({ behavior:'smooth', block:'start' });
      return true;
    };

    const copyLink = async () => {
      const url = window.location.href.split('#')[0];
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(url);
      } catch (_) {
        const input = document.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly','');
        input.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('Clipboard fallback failed');
      }
      showToast('링크를 복사했습니다.');
    };

    const runSearch = (dialog) => {
      const input = dialog.querySelector('#sh-search-input');
      const query = normalize(input?.value).toLowerCase();
      if (!query) {
        showToast('검색어를 입력해 주세요.');
        input?.focus();
        return;
      }
      const nodes = [...document.querySelectorAll('main section, main article')];
      const match = nodes.find((node) => normalize(node.textContent).toLowerCase().includes(query));
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      if (match) {
        match.scrollIntoView({ behavior:'smooth', block:'center' });
        showToast(`“${query}” 결과로 이동했습니다.`);
      } else {
        showToast(`“${query}” 검색 결과가 없습니다.`);
      }
    };

    const ensureSearchDialog = () => {
      let dialog = document.getElementById('sh-search-dialog');
      if (dialog) return dialog;
      dialog = document.createElement('dialog');
      dialog.id = 'sh-search-dialog';
      dialog.innerHTML = `<form class="sh-search-panel"><button type="button" class="sh-search-close" aria-label="검색 닫기">×</button><label for="sh-search-input">사이트에서 찾기</label><div><input id="sh-search-input" type="search" autocomplete="off" placeholder="스토리, 커피, 공간 등을 검색"><button type="submit">검색</button></div></form>`;
      document.body.appendChild(dialog);
      dialog.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); runSearch(dialog); });
      dialog.querySelector('.sh-search-close').addEventListener('click', () => dialog.close?.());
      dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close?.(); });
      return dialog;
    };

    document.addEventListener('click', (event) => {
      const control = event.target.closest?.('a,button,[role="button"]');
      if (!control || control.matches('[disabled], [aria-disabled="true"]')) return;
      if (control.closest('#sh-search-dialog')) return;

      const target = control.getAttribute('data-sh-target');
      if (target) {
        event.preventDefault();
        scrollTarget(target);
        return;
      }

      const label = normalize(`${control.textContent} ${control.getAttribute('aria-label') || ''} ${control.getAttribute('title') || ''}`);
      if (/공유|share/i.test(label)) {
        event.preventDefault();
        copyLink().catch(() => showToast('링크 복사에 실패했습니다.'));
        return;
      }
      if (/검색|search/i.test(label)) {
        event.preventDefault();
        const dialog = ensureSearchDialog();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open','');
        setTimeout(() => dialog.querySelector('input')?.focus(), 0);
      }
    });
  });
})();