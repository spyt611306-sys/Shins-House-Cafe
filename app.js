(() => {
  'use strict';

  window.__SHINS_HOUSE_RUNTIME__ = Object.freeze({
    mode: 'production-api',
    apiBase: '/api',
    version: '4.8.0-home-refresh'
  });

  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once:true }) : fn();
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  ready(() => {
    document.querySelectorAll('button:not([type])').forEach((button) => button.type = 'button');

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
      const candidates = [...document.querySelectorAll('main section, main article, body > section, [data-section]')];
      return candidates.find((el) => patterns.some((pattern) => pattern.test(normalize(el.textContent).slice(0, 900))));
    };
    const coffeeSection = findSection([/커피/,/원두/,/coffee/i]);
    const goodsSection = findSection([/굿즈/,/오브젝트/,/goods/i,/objects/i]);
    const storeSection = findSection([/매장/,/오시는/,/부산/,/store/i,/location/i]);
    if (coffeeSection && !coffeeSection.id) coffeeSection.id = 'coffee';
    if (goodsSection && !goodsSection.id) goodsSection.id = 'goods';
    if (storeSection && !storeSection.id) storeSection.id = 'store';

    const header = document.querySelector('header');
    if (header) {
      const navCandidates = [...header.querySelectorAll('nav, [role="navigation"], [class*="nav"]')];
      const nav = navCandidates.find((el) => {
        const text = normalize(el.textContent);
        return el.querySelectorAll('a').length >= 3 && /홈|커피|브랜드|정기|매장|이용|coffee|store/i.test(text);
      });
      if (nav) {
        nav.classList.add('sh-primary-nav');
        nav.innerHTML = [
          ['/', '홈', 'top'],
          ['#coffee', '커피 구매', 'coffee'],
          ['#goods', '굿즈 구매', 'goods'],
          ['#store', '매장 안내', 'store']
        ].map(([href,label,target]) => `<a href="${href}" data-sh-target="${target}">${label}</a>`).join('');
      }
    }

    const hero = document.querySelector('.sh-home-hero');
    if (hero) {
      let next = hero.nextElementSibling;
      while (next && next.matches('script,style')) next = next.nextElementSibling;
      if (next) {
        const signature = `${next.id || ''} ${next.className || ''}`;
        if (/hero|visual|banner|slider|swiper|carousel/i.test(signature)) next.classList.add('sh-legacy-hero-hidden');
      }
    }

    const scrollTarget = (target) => {
      if (target === 'top') { window.scrollTo({ top:0, behavior:'smooth' }); return true; }
      const node = document.getElementById(target) || ({ coffee:coffeeSection, goods:goodsSection, store:storeSection }[target]);
      if (!node) return false;
      node.scrollIntoView({ behavior:'smooth', block:'start' });
      return true;
    };

    const copyLink = async () => {
      const url = window.location.href.split('#')[0];
      try {
        await navigator.clipboard.writeText(url);
      } catch (_) {
        const input = document.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly','');
        input.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      showToast('링크를 복사했습니다.');
    };

    const ensureSearchDialog = () => {
      let dialog = document.getElementById('sh-search-dialog');
      if (dialog) return dialog;
      dialog = document.createElement('dialog');
      dialog.id = 'sh-search-dialog';
      dialog.innerHTML = `<form method="dialog" class="sh-search-panel"><button class="sh-search-close" value="cancel" aria-label="검색 닫기">×</button><label for="sh-search-input">사이트에서 찾기</label><div><input id="sh-search-input" type="search" autocomplete="off" placeholder="커피, 굿즈, 매장 등을 검색"><button type="submit" value="search">검색</button></div><p class="sh-search-help">페이지 안의 상품과 콘텐츠를 빠르게 찾아 이동합니다.</p></form>`;
      document.body.appendChild(dialog);
      dialog.addEventListener('close', () => {
        if (dialog.returnValue !== 'search') return;
        const query = normalize(dialog.querySelector('input').value).toLowerCase();
        if (!query) return;
        const nodes = [...document.querySelectorAll('main section, main article, [class*="product"], [class*="item"]')];
        const match = nodes.find((node) => normalize(node.textContent).toLowerCase().includes(query));
        if (match) { match.scrollIntoView({ behavior:'smooth', block:'center' }); showToast(`“${query}” 결과로 이동했습니다.`); }
        else showToast(`“${query}” 검색 결과가 없습니다.`);
      });
      return dialog;
    };

    document.addEventListener('click', (event) => {
      const control = event.target.closest('a,button,[role="button"]');
      if (!control) return;
      const target = control.getAttribute('data-sh-target');
      if (target) {
        if (target !== 'top' && !document.getElementById(target) && !({coffee:coffeeSection,goods:goodsSection,store:storeSection}[target])) return;
        event.preventDefault();
        scrollTarget(target);
        return;
      }
      const label = normalize(`${control.textContent} ${control.getAttribute('aria-label') || ''} ${control.getAttribute('title') || ''}`);
      if (/공유|share/i.test(label)) {
        event.preventDefault();
        copyLink();
        return;
      }
      if (/검색|search/i.test(label)) {
        event.preventDefault();
        const dialog = ensureSearchDialog();
        if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
        setTimeout(() => dialog.querySelector('input')?.focus(), 0);
      }
    });
  });
})();