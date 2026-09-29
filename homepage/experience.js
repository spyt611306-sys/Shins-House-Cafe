(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initHeroRotation() {
    const hero = document.querySelector('.hero');
    const primary = hero?.querySelector('.hero-image');
    if (!hero || !primary) return;
    primary.classList.add('hero-slide', 'is-active');
    const secondary = document.createElement('img');
    secondary.className = 'hero-image hero-slide hero-slide-secondary';
    secondary.src = '/assets/hero-20260928.webp';
    secondary.alt = '햇살이 들어오는 신스하우스 카페와 커피';
    secondary.width = 1780;
    secondary.height = 883;
    secondary.decoding = 'async';
    secondary.loading = 'eager';
    hero.append(secondary);

    const controls = document.createElement('div');
    controls.className = 'hero-rotation-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', '메인 이미지 선택');
    controls.innerHTML = '<button type="button" class="hero-dot is-active" data-hero-index="0" aria-label="첫 번째 이미지 보기" aria-pressed="true"></button><button type="button" class="hero-dot" data-hero-index="1" aria-label="두 번째 이미지 보기" aria-pressed="false"></button><button type="button" class="hero-pause" aria-label="메인 이미지 자동 전환 일시정지" aria-pressed="false">Ⅱ</button>';
    hero.append(controls);

    const slides = [primary, secondary];
    const dots = [...controls.querySelectorAll('.hero-dot')];
    const pause = controls.querySelector('.hero-pause');
    let active = 0;
    let timer = null;
    let paused = reducedMotion;
    const stop = () => { if (timer) window.clearInterval(timer); timer = null; };
    const show = index => {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === active));
      dots.forEach((dot, i) => { const selected = i === active; dot.classList.toggle('is-active', selected); dot.setAttribute('aria-pressed', String(selected)); });
    };
    const start = () => { stop(); if (!paused && slides.length > 1) timer = window.setInterval(() => show(active + 1), 6500); };
    dots.forEach(dot => dot.addEventListener('click', () => { show(Number(dot.dataset.heroIndex || 0)); start(); }));
    pause.addEventListener('click', () => {
      paused = !paused;
      pause.setAttribute('aria-pressed', String(paused));
      pause.textContent = paused ? '▶' : 'Ⅱ';
      pause.setAttribute('aria-label', paused ? '메인 이미지 자동 전환 재생' : '메인 이미지 자동 전환 일시정지');
      start();
    });
    secondary.addEventListener('error', () => { secondary.remove(); dots[1]?.remove(); stop(); }, { once: true });
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    start();
  }

  const beans = {
    ethiopia: { name: '에티오피아 싱글', subtitle: '화사한 향과 산뜻한 여운', note: '플로럴 · 복숭아 · 시트러스', description: '밝은 산미와 향긋한 아로마, 깔끔한 마무리를 선호하는 분께 잘 맞습니다.' },
    goso: { name: '고소 블랜딩', subtitle: '매일 편안하게 즐기는 균형', note: '견과류 · 카라멜 · 부드러운 단맛', description: '산미 부담은 낮추고 고소함과 단맛의 균형을 원하는 데일리 커피 취향에 잘 맞습니다.' },
    dark: { name: '다크 블랜딩', subtitle: '깊고 진한 바디와 풍미', note: '다크초콜릿 · 카라멜 · 묵직한 여운', description: '진하고 묵직한 커피, 아이스 아메리카노나 에스프레소 계열을 즐기는 분께 잘 맞습니다.' }
  };

  const questions = [
    { title: '커피에서 가장 먼저 찾는 맛은?', options: [['꽃향·과일처럼 산뜻한 맛',{ethiopia:3}],['견과류처럼 고소하고 편안한 맛',{goso:3}],['초콜릿처럼 진하고 묵직한 맛',{dark:3}]] },
    { title: '산미는 어느 정도가 좋으세요?', options: [['산미가 또렷한 커피가 좋다',{ethiopia:3}],['은은한 정도가 좋다',{ethiopia:1,goso:2}],['산미는 거의 없는 편이 좋다',{goso:1,dark:3}]] },
    { title: '좋아하는 바디감은?', options: [['가볍고 깔끔하게',{ethiopia:2}],['부드럽고 균형 있게',{goso:2}],['진하고 묵직하게',{dark:2}]] },
    { title: '평소 가장 자주 마시는 방식은?', options: [['핸드드립 / 블랙커피',{ethiopia:2,goso:1}],['아메리카노',{goso:2,dark:1}],['카페라떼',{goso:2,dark:2}],['에스프레소 / 진한 베이스',{dark:3}]] },
    { title: '아이스 커피를 얼마나 자주 드시나요?', options: [['아이스를 주로 마신다',{ethiopia:1,dark:2}],['핫과 아이스를 비슷하게 마신다',{goso:2}],['따뜻한 커피를 더 좋아한다',{ethiopia:1,goso:2}]] },
    { title: '가장 끌리는 향은?', options: [['자스민·시트러스·복숭아',{ethiopia:3}],['아몬드·카라멜·흑설탕',{goso:3}],['다크초콜릿·로스팅 향',{dark:3}]] },
    { title: '커피 한 잔에서 원하는 인상은?', options: [['향이 선명하고 깨끗했으면 좋겠다',{ethiopia:2}],['부담 없이 편안했으면 좋겠다',{goso:2}],['한 모금부터 존재감이 강했으면 좋겠다',{dark:2}]] },
    { title: '커피를 가장 자주 마시는 순간은?', options: [['천천히 향을 즐기고 싶을 때',{ethiopia:2}],['출근·식후 등 매일 편하게',{goso:3}],['진하게 집중하거나 기분 전환할 때',{dark:3}]] }
  ];

  function initTasteFinder() {
    const heroLinks = document.querySelector('.hero-links');
    if (!heroLinks) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'taste-finder-trigger';
    trigger.innerHTML = '<span>나에게 맞는 원두 찾기</span><small>8문항 · 약 1분</small>';
    heroLinks.append(trigger);

    const dialog = document.createElement('dialog');
    dialog.className = 'taste-dialog';
    dialog.setAttribute('aria-labelledby', 'taste-title');
    dialog.innerHTML = `<div class="taste-shell"><header class="taste-header"><div><p class="taste-eyebrow">SHIN’S HOUSE TASTE FINDER</p><h2 id="taste-title">나에게 맞는 원두 찾기</h2></div><button type="button" class="taste-close" aria-label="취향 테스트 닫기">×</button></header><div class="taste-progress-wrap"><span class="taste-progress-text">1 / ${questions.length}</span><div class="taste-progress"><i></i></div></div><div class="taste-content"></div></div>`;
    document.body.append(dialog);
    const content = dialog.querySelector('.taste-content');
    const progressText = dialog.querySelector('.taste-progress-text');
    const progressBar = dialog.querySelector('.taste-progress i');
    let step = 0;
    let scores = { ethiopia: 0, goso: 0, dark: 0 };
    let answers = [];

    function reset() { step = 0; scores = { ethiopia:0,goso:0,dark:0 }; answers = []; renderQuestion(); }
    function addScores(weight) { Object.entries(weight).forEach(([key,value]) => { scores[key] += value; }); }
    function resultKey() { return ['ethiopia','goso','dark'].sort((a,b) => scores[b] - scores[a])[0]; }
    function selectBeanOnPage(name) {
      const found = [...document.querySelectorAll('#bean-products .bean-product-option')].find(button => button.textContent.includes(name));
      if (found) found.click();
      document.querySelector('#bean-store')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
    function renderResult() {
      const key = resultKey();
      const bean = beans[key];
      const ranked = Object.entries(scores).sort((a,b) => b[1] - a[1]);
      const runnerUp = beans[ranked[1][0]];
      progressText.textContent = '완료'; progressBar.style.width = '100%';
      content.innerHTML = `<section class="taste-result" aria-live="polite"><p class="taste-kicker">당신의 취향과 가장 가까운 원두</p><h3>${bean.name}</h3><p class="taste-result-sub">${bean.subtitle}</p><div class="taste-result-note">${bean.note}</div><p class="taste-result-copy">${bean.description}</p><p class="taste-runner-up">두 번째로 가까운 취향은 <strong>${runnerUp.name}</strong>입니다.</p><div class="taste-result-actions"><button type="button" class="primary-btn taste-buy">추천 원두 보러가기 <span aria-hidden="true">↗</span></button><button type="button" class="taste-restart">다시 테스트하기</button></div></section>`;
      content.querySelector('.taste-buy').addEventListener('click', () => { dialog.close(); window.setTimeout(() => selectBeanOnPage(bean.name), 120); });
      content.querySelector('.taste-restart').addEventListener('click', reset);
    }
    function renderQuestion() {
      const q = questions[step];
      if (!q) return renderResult();
      progressText.textContent = `${step + 1} / ${questions.length}`;
      progressBar.style.width = `${((step + 1) / questions.length) * 100}%`;
      content.innerHTML = `<section class="taste-question"><p class="taste-step">QUESTION ${String(step+1).padStart(2,'0')}</p><h3>${q.title}</h3><div class="taste-options"></div>${step>0?'<button type="button" class="taste-back">← 이전 질문</button>':''}</section>`;
      const options = content.querySelector('.taste-options');
      q.options.forEach(([label,weight], optionIndex) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'taste-option';
        button.innerHTML = `<span>${label}</span><b aria-hidden="true">${String(optionIndex+1).padStart(2,'0')}</b>`;
        button.addEventListener('click', () => { addScores(weight); answers[step] = weight; step += 1; renderQuestion(); });
        options.append(button);
      });
      content.querySelector('.taste-back')?.addEventListener('click', () => {
        const previous = answers[step-1];
        if (previous) Object.entries(previous).forEach(([key,value]) => { scores[key] -= value; });
        answers.splice(step-1,1); step = Math.max(0,step-1); renderQuestion();
      });
    }
    trigger.addEventListener('click', () => { reset(); dialog.showModal(); document.body.classList.add('dialog-open'); });
    dialog.querySelector('.taste-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  }

  initHeroRotation();
  initTasteFinder();
})();