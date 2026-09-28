(() => {
  async function load() {
    try {
      let response = await fetch('/api/site-content', { headers: { Accept: 'application/json' } });
      if (response.status === 404) response = await fetch('/.netlify/functions/content?route=site-content');
      if (!response.ok) return;
      const { media = {} } = await response.json();
      const set = (selector, src) => { const el = document.querySelector(selector); if (el && src) el.src = src; };
      set('.hero-image', media.hero);
      document.querySelectorAll('.brand img,.shop-brand img').forEach(el => { if (media.logo) el.src = media.logo; });
      const drinkSelectors = [
        ['.drink:nth-child(1) img', media.americano_hot],
        ['.drink:nth-child(2) img', media.americano_iced],
        ['.drink:nth-child(3) img', media.cafe_latte],
        ['.drink:nth-child(4) img', media.cappuccino],
        ['.drink:nth-child(5) img', media.vanilla_latte],
        ['.drink:nth-child(6) img', media.cream_coffee]
      ];
      drinkSelectors.forEach(([selector, src]) => set(selector, src));
    } catch {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
