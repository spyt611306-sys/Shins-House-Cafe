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
  }
  function show(dialog) { dialog.showModal(); document.body.classList.add('dialog-open'); }
  menuOpen.addEventListener('click', () => { show(menu); menuOpen.setAttribute('aria-expanded', 'true'); });
  document.querySelector('#search-open').addEventListener('click', () => { show(search); document.querySelector('#header-query').focus(); });
  for (const dialog of [menu, search]) {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); menuOpen.setAttribute('aria-expanded', 'false'); });
  }
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.close()));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
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
})();
