import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');
const sourceParts = ['shins-house-logo-generated-v2.part01','shins-house-logo-generated-v2.part02'].map((name) => path.join(root, 'brand-source', name));
const logoFile = 'shins-house-logo-generated-v2.webp';
const targetLogo = path.join(assetsOut, logoFile);
const heroSource = path.join(root, 'brand-source', 'shins-house-hero-4k.svg');
const heroFile = 'shins-house-editorial-fallback.svg';
const EXPECTED_SHA256 = 'bae8549f358b1438191be51b199d9b63866746463e8579275a4afe20a6a38ed7';

for (const file of sourceParts) if (!fs.existsSync(file)) throw new Error(`Missing generated logo source part: ${path.basename(file)}`);
const encoded = sourceParts.map((file) => fs.readFileSync(file, 'utf8').replace(/\s+/g, '')).join('');
const image = Buffer.from(encoded, 'base64');
const digest = crypto.createHash('sha256').update(image).digest('hex');
if (image.length < 12000 || image.toString('ascii',0,4) !== 'RIFF' || image.toString('ascii',8,12) !== 'WEBP') throw new Error('Generated Shin\'s House logo source is not a valid WebP');
if (digest !== EXPECTED_SHA256) throw new Error(`Generated logo integrity mismatch: ${digest}`);

fs.mkdirSync(assetsOut, { recursive: true });
fs.writeFileSync(targetLogo, image);
if (fs.existsSync(heroSource)) fs.copyFileSync(heroSource, path.join(assetsOut, heroFile));

const esc = (value) => String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const collectImages = (html) => {
  const result = [];
  const regex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = regex.exec(html))) {
    const src = m[1];
    if (!src || /logo|brand|mascot|icon|avatar/i.test(src)) continue;
    if (!result.includes(src)) result.push(src);
  }
  return result;
};

const picture = (src, alt, extra='') => `<img class="sh-ref-photo ${extra}" src="${esc(src)}" alt="${esc(alt)}" decoding="async" loading="lazy">`;

const makeHeader = () => `
<header class="sh-ref-header">
  <a class="sh-ref-brand" href="/" aria-label="Shin's House 홈"><img src="/assets/${logoFile}" alt="Shin's House" width="320" height="107" decoding="async"></a>
  <nav class="sh-ref-nav" aria-label="주요 메뉴">
    <a href="#story" data-sh-target="story">STORY</a>
    <a href="#coffee" data-sh-target="coffee">COFFEE</a>
    <a href="#space" data-sh-target="space">SPACE</a>
    <a href="#community" data-sh-target="community">COMMUNITY</a>
    <a href="#store" data-sh-target="store">ONLINE STORE</a>
  </nav>
  <a class="sh-ref-visit" href="#space" data-sh-target="space">VISIT US</a>
</header>`;

const makeEditorialHome = (images) => {
  const fallback = `/assets/${heroFile}`;
  const picks = [0,1,2,3,4,5].map((i) => images[i] || fallback);
  return `
<main class="sh-editorial-home" id="top">
  <section class="sh-ref-hero" aria-labelledby="sh-ref-title">
    <div class="sh-ref-hero-copy">
      <p class="sh-ref-kicker">COFFEE · PEOPLE · A BRIGHTER DAY</p>
      <h1 id="sh-ref-title">좋은 커피가<br>좋은 하루를 만듭니다.</h1>
      <p class="sh-ref-script">Good Coffee<br>Brighter Days</p>
      <p class="sh-ref-intro">사람과, 이야기와, 커피가 머무는 곳.<br>신스하우스는 오늘도 좋은 하루를 준비합니다.</p>
      <a class="sh-ref-pill" href="#story" data-sh-target="story">OUR STORY <span>→</span></a>
    </div>
    <div class="sh-ref-hero-photo">${picture(picks[0], '신스하우스의 따뜻한 커피와 공간', 'is-hero')}</div>
    <aside class="sh-ref-film" id="space">
      <div class="sh-ref-film-photo">${picture(picks[1], '신스하우스 카페 공간')}</div>
      <div class="sh-ref-film-copy"><em>A small house<br>for better days.</em><p>COFFEE<br>PEOPLE<br>CULTURE<br>COMMUNITY</p><a href="#community" data-sh-target="community">WATCH OUR FILM ○</a></div>
    </aside>
  </section>

  <section class="sh-ref-wave" id="story">
    <article class="sh-ref-story-card sh-ref-story-card--left">
      <div class="sh-ref-orbit-photo">${picture(picks[2], '커피가 자라는 산지와 신스하우스의 이야기')}</div>
      <div class="sh-ref-story-copy"><span class="sh-ref-num">01</span><p class="sh-ref-label">OUR ORIGIN STORY</p><h2>좋은 커피는,<br>사람에게서 시작됩니다.</h2><p>한 잔의 커피가 누군가의 하루를 바꿀 수 있다는 믿음으로, 신스하우스는 원두와 사람의 이야기를 함께 고릅니다.</p><a href="#coffee" data-sh-target="coffee">더 알아보기 →</a></div>
    </article>
    <article class="sh-ref-story-card sh-ref-story-card--right">
      <div class="sh-ref-story-copy"><span class="sh-ref-num">02</span><p class="sh-ref-label">ROASTING PHILOSOPHY</p><h2>시간이 만들어주는<br>더 깊은 맛</h2><p>좋은 생두, 섬세한 로스팅, 그리고 기다림. 가장 잘 표현되는 순간을 위해 조금 더 느리게 준비합니다.</p><a href="#coffee" data-sh-target="coffee">로스팅 철학 보기 →</a></div>
      <div class="sh-ref-orbit-photo sh-ref-orbit-photo--roast">${picture(picks[3], '신스하우스 로스팅과 원두')}</div>
    </article>
  </section>

  <section class="sh-ref-market" id="coffee">
    <div class="sh-ref-market-head"><div><span class="sh-ref-num">03</span><p class="sh-ref-label">BARISTA PICKS</p><h2>지금, 신스하우스의 추천 커피</h2><p>계절의 순간을 담은, 바리스타들의 특별한 선택.</p></div><a href="#sh-original-shop">전체 메뉴 보기 →</a></div>
    <div class="sh-ref-picks">
      <article><div class="sh-ref-drink sh-ref-drink--latte"><span></span></div><h3>신스 라떼</h3><p>부드러운 밸런스와 고소한 피니시</p><strong>6,500</strong></article>
      <article><div class="sh-ref-drink sh-ref-drink--ein"><span></span></div><h3>아인슈페너</h3><p>크림과 커피가 만드는 깊은 대비</p><strong>6,800</strong></article>
      <article><div class="sh-ref-drink sh-ref-drink--matcha"><span></span></div><h3>말차 크라우드</h3><p>진한 말차와 부드러운 밀크</p><strong>6,800</strong></article>
      <article><div class="sh-ref-drink sh-ref-drink--orange"><span></span></div><h3>오렌지 블랙</h3><p>상큼한 오렌지와 깊은 커피</p><strong>6,800</strong></article>
    </div>
  </section>

  <section class="sh-ref-bottom" id="community">
    <article class="sh-ref-dessert">
      <div><span class="sh-ref-num">04</span><p class="sh-ref-label">FEATURED DESSERTS</p><h2>커피와 함께,<br>더 특별한 시간</h2><p>좋은 커피엔 좋은 디저트가 필요하니까. 오늘의 작은 즐거움을 함께 골라보세요.</p><a href="#sh-original-shop">전체 디저트 보기 →</a></div>
      <div class="sh-ref-dessert-grid"><div class="sh-ref-cake sh-ref-cake--1"></div><div class="sh-ref-cake sh-ref-cake--2"></div><div class="sh-ref-cake sh-ref-cake--3"></div></div>
    </article>
    <article class="sh-ref-events" id="store">
      <div><span class="sh-ref-num">05</span><p class="sh-ref-label">COMMUNITY & EVENTS</p><h2>사람이 모여,<br>더 좋은 이야기가 됩니다.</h2><p>신스하우스는 커피를 넘어, 사람과 문화를 연결하는 다양한 이야기를 진행합니다.</p></div>
      <div class="sh-ref-event-cards">
        <div><b>OCT<br>12</b><span>COFFEE CUPPING<br><small>향미를 발견하는 저녁</small></span></div>
        <div><b>OCT<br>26</b><span>FLOWER CLASS<br><small>커피와 꽃이 있는 오후</small></span></div>
        <div><b>NOV<br>09</b><span>ACOUSTIC NIGHT<br><small>좋은 음악이 머무는 밤</small></span></div>
      </div>
    </article>
  </section>
</main>`;
};

const refCss = `
/* Shin's House 2026 editorial homepage */
:root{--sh-ink:#191713;--sh-cream:#f4efe6;--sh-paper:#fbf7f0;--sh-rust:#a45735;--sh-olive:#46513d;--sh-line:rgba(44,34,24,.18)}
html{scroll-behavior:smooth}body{overflow-x:hidden;background:var(--sh-cream)!important;color:var(--sh-ink)!important}.sh-ref-header{position:relative!important;z-index:100;display:grid!important;grid-template-columns:minmax(160px,240px) 1fr auto;align-items:center;gap:34px;width:100%!important;min-height:82px!important;padding:10px clamp(22px,4vw,72px)!important;margin:0!important;background:rgba(247,243,236,.96)!important;border:0!important;border-bottom:1px solid rgba(40,30,20,.12)!important;box-sizing:border-box}.sh-ref-brand{display:flex;align-items:center}.sh-ref-brand img{display:block;width:190px!important;height:auto!important;max-width:100%!important}.sh-ref-nav{display:flex!important;justify-content:center;align-items:center;gap:clamp(18px,2.8vw,46px)}.sh-ref-nav a,.sh-ref-visit{color:var(--sh-ink)!important;text-decoration:none!important;font:700 11px/1.2 Pretendard,'Noto Sans KR',sans-serif;letter-spacing:.12em;white-space:nowrap}.sh-ref-nav a{position:relative;padding:12px 2px}.sh-ref-nav a:after{content:'';position:absolute;left:50%;right:50%;bottom:6px;height:1px;background:var(--sh-rust);transition:.2s}.sh-ref-nav a:hover:after{left:0;right:0}.sh-ref-visit{padding:12px 20px;border:1px solid var(--sh-ink);border-radius:999px}.sh-editorial-home{max-width:none!important;width:100%!important;margin:0!important;padding:0!important;background:var(--sh-paper);font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif}.sh-ref-hero{display:grid;grid-template-columns:31% 42% 27%;min-height:560px;background:var(--sh-paper);overflow:hidden}.sh-ref-hero-copy{padding:clamp(52px,7vw,110px) clamp(30px,4vw,72px);position:relative;z-index:3}.sh-ref-kicker,.sh-ref-label{margin:0 0 18px;font-size:10px;font-weight:800;letter-spacing:.18em;color:#745942}.sh-ref-hero h1,.sh-ref-story-card h2,.sh-ref-market h2,.sh-ref-bottom h2{font-family:'Noto Serif KR','Iowan Old Style','Baskerville',serif;letter-spacing:-.045em}.sh-ref-hero h1{margin:0;font-size:clamp(42px,4.2vw,72px);line-height:1.15;font-weight:600}.sh-ref-script{margin:20px 0 24px;color:var(--sh-rust);font-family:'Brush Script MT','Segoe Script',cursive;font-size:clamp(28px,2.5vw,42px);line-height:1.05;transform:rotate(-3deg)}.sh-ref-intro{margin:0 0 26px;font-size:14px;line-height:1.8;color:#5e584f}.sh-ref-pill{display:inline-flex;align-items:center;gap:26px;padding:12px 20px;border-radius:999px;background:var(--sh-rust);color:#fff!important;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:.08em}.sh-ref-hero-photo,.sh-ref-film{position:relative;overflow:hidden}.sh-ref-photo{display:block;width:100%!important;height:100%!important;object-fit:cover}.sh-ref-hero-photo{clip-path:ellipse(74% 88% at 50% 42%)}.sh-ref-hero-photo:after{content:'좋은 커피,\A좋은 사람들,\A그리고 더 좋은 하루.';white-space:pre;position:absolute;right:8%;bottom:12%;color:white;font:400 18px/1.55 'Noto Serif KR',serif;text-shadow:0 2px 15px rgba(0,0,0,.5);transform:rotate(-7deg)}.sh-ref-film{background:#201a15;color:white}.sh-ref-film-photo{position:absolute;inset:0}.sh-ref-film-photo:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,8,6,.08),rgba(10,8,6,.72))}.sh-ref-film-copy{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;justify-content:flex-end;padding:42px}.sh-ref-film-copy em{font:400 28px/1.15 'Brush Script MT','Segoe Script',cursive;margin-bottom:24px}.sh-ref-film-copy p{font:700 11px/1.8 Pretendard,sans-serif;letter-spacing:.2em}.sh-ref-film-copy a{margin-top:18px;color:#fff;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:.1em}.sh-ref-wave{position:relative;margin-top:-1px;padding:90px clamp(30px,6vw,110px) 70px;background:var(--sh-cream);overflow:hidden}.sh-ref-wave:before{content:'';position:absolute;left:-8%;right:-8%;top:-72px;height:145px;border-radius:0 0 50% 50%/0 0 100% 100%;background:var(--sh-paper)}.sh-ref-wave:after{content:'';position:absolute;right:-8%;top:8px;width:58%;height:70px;background:var(--sh-rust);border-radius:50% 0 50% 50%;transform:rotate(-2deg);opacity:.92}.sh-ref-story-card{position:relative;z-index:2;display:grid;grid-template-columns:40% 60%;align-items:center;gap:48px;margin:20px 0 72px}.sh-ref-story-card--right{grid-template-columns:58% 42%}.sh-ref-orbit-photo{height:330px;border-radius:52% 48% 42% 58%/55% 44% 56% 45%;overflow:hidden;box-shadow:0 28px 70px rgba(64,47,32,.12)}.sh-ref-orbit-photo--roast{border-radius:44% 56% 58% 42%/48% 48% 52% 52%}.sh-ref-story-copy{max-width:640px}.sh-ref-num{display:inline-block;margin-bottom:8px;color:#a7754c;font:700 12px/1.2 Georgia,serif}.sh-ref-story-card h2,.sh-ref-market h2,.sh-ref-bottom h2{margin:0 0 16px;font-size:clamp(30px,3vw,48px);line-height:1.25;font-weight:600}.sh-ref-story-copy>p:not(.sh-ref-label),.sh-ref-market-head p,.sh-ref-bottom p{font-size:14px;line-height:1.8;color:#655f56}.sh-ref-story-copy a,.sh-ref-market-head a,.sh-ref-dessert a{display:inline-block;margin-top:12px;color:var(--sh-rust);font-size:12px;font-weight:800;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:4px}.sh-ref-market{padding:72px clamp(30px,6vw,110px);background:#f7f1e7;position:relative}.sh-ref-market-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}.sh-ref-picks{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:38px}.sh-ref-picks article{padding:20px 18px 24px;border-top:1px solid var(--sh-line)}.sh-ref-picks h3{margin:16px 0 6px;font:600 18px/1.3 'Noto Serif KR',serif}.sh-ref-picks p{min-height:42px;margin:0 0 8px;font-size:12px;line-height:1.6;color:#6b655d}.sh-ref-picks strong{font-size:13px}.sh-ref-drink{position:relative;height:190px;display:flex;align-items:flex-end;justify-content:center}.sh-ref-drink:before{content:'';width:82px;height:146px;border-radius:10px 10px 24px 24px;box-shadow:0 18px 30px rgba(58,42,28,.15),inset 0 0 0 1px rgba(255,255,255,.35);background:linear-gradient(to bottom,#eee 0 10%,#d9b98f 10% 70%,#8f5437 70%)}.sh-ref-drink span{position:absolute;bottom:72px;width:70px;height:28px;border-radius:50%;background:rgba(255,255,255,.72);filter:blur(.1px)}.sh-ref-drink--ein:before{background:linear-gradient(to bottom,#f5efe6 0 25%,#4b2d1e 25% 72%,#1f1713 72%)}.sh-ref-drink--matcha:before{background:linear-gradient(to bottom,#b8c998 0 55%,#f4efe4 55% 78%,#7b5b42 78%)}.sh-ref-drink--orange:before{background:linear-gradient(to bottom,#d97a42 0 30%,#7b3d26 30% 55%,#2b1712 55%)}.sh-ref-bottom{display:grid;grid-template-columns:1.25fr .95fr;gap:0;background:var(--sh-cream);padding:0 clamp(30px,6vw,110px) 90px}.sh-ref-dessert,.sh-ref-events{padding:64px 42px;border-top:1px solid var(--sh-line)}.sh-ref-dessert{display:grid;grid-template-columns:.9fr 1.1fr;gap:34px;border-right:1px solid var(--sh-line)}.sh-ref-dessert-grid{display:grid;grid-template-columns:repeat(3,1fr);align-items:end;gap:18px}.sh-ref-cake{height:145px;border-radius:50% 50% 16px 16px/16% 16% 12px 12px;box-shadow:0 18px 35px rgba(61,42,27,.16)}.sh-ref-cake--1{background:linear-gradient(#8d4d2f 0 14%,#e6c89c 14% 74%,#623823 74%)}.sh-ref-cake--2{background:linear-gradient(#37231d 0 20%,#f0e0c7 20% 58%,#5a3427 58%)}.sh-ref-cake--3{background:radial-gradient(circle at 35% 20%,#d95540 0 6%,transparent 7%),radial-gradient(circle at 60% 15%,#f0c151 0 5%,transparent 6%),linear-gradient(#f4e2bd 0 18%,#e0ba8e 18% 70%,#9b5937 70%)}.sh-ref-events{background:#f2eadf}.sh-ref-event-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:26px}.sh-ref-event-cards>div{display:flex;gap:12px;align-items:center;padding:16px 12px;background:#fff;border:1px solid rgba(59,45,31,.12);min-height:82px}.sh-ref-event-cards b{font:700 11px/1.2 Georgia,serif;color:#8a5b3e}.sh-ref-event-cards span{font-size:11px;font-weight:800;line-height:1.45}.sh-ref-event-cards small{font-size:10px;font-weight:400;color:#766f65}#sh-original-shop{scroll-margin-top:90px}.sh-editorial-home + *{scroll-margin-top:90px}
@media(max-width:1000px){.sh-ref-header{grid-template-columns:170px 1fr}.sh-ref-visit{display:none}.sh-ref-hero{grid-template-columns:44% 56%}.sh-ref-film{grid-column:1/-1;min-height:320px}.sh-ref-story-card,.sh-ref-story-card--right{grid-template-columns:1fr 1fr}.sh-ref-picks{grid-template-columns:repeat(2,1fr)}.sh-ref-bottom{grid-template-columns:1fr}.sh-ref-dessert{border-right:0}.sh-ref-events{border-top:1px solid var(--sh-line)}}
@media(max-width:720px){.sh-ref-header{grid-template-columns:1fr;padding:10px 18px!important;gap:4px}.sh-ref-brand img{width:150px!important}.sh-ref-nav{justify-content:flex-start;overflow-x:auto;gap:20px;padding-bottom:4px;scrollbar-width:none}.sh-ref-nav::-webkit-scrollbar{display:none}.sh-ref-nav a{font-size:10px}.sh-ref-hero{display:block}.sh-ref-hero-copy{padding:48px 24px 36px}.sh-ref-hero-photo{height:390px;clip-path:ellipse(92% 74% at 54% 48%)}.sh-ref-film{min-height:340px}.sh-ref-wave{padding:70px 22px 40px}.sh-ref-wave:after{width:78%;height:46px}.sh-ref-story-card,.sh-ref-story-card--right{grid-template-columns:1fr;gap:24px;margin-bottom:52px}.sh-ref-story-card--right .sh-ref-story-copy{order:2}.sh-ref-orbit-photo{height:250px}.sh-ref-market{padding:55px 22px}.sh-ref-market-head{display:block}.sh-ref-picks{grid-template-columns:repeat(2,1fr);gap:10px}.sh-ref-drink{height:160px}.sh-ref-bottom{padding:0 22px 60px}.sh-ref-dessert{grid-template-columns:1fr;padding:48px 0}.sh-ref-events{padding:48px 0}.sh-ref-event-cards{grid-template-columns:1fr}.sh-ref-dessert-grid{min-height:170px}}
`;

const removeExistingEditorial = (html) => html.replace(/<main\b[^>]*class=["'][^"']*sh-editorial-home[^"']*["'][^>]*>[\s\S]*?<\/main>/i, '');
const replaceHeader = (html) => {
  if (/<header\b[^>]*>[\s\S]*?<\/header>/i.test(html)) return html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, makeHeader());
  return html.replace(/<body\b([^>]*)>/i, `<body$1>${makeHeader()}`);
};
const removeTopHero = (html) => {
  const headerEnd = html.search(/<\/header>/i);
  if (headerEnd < 0) return html;
  const after = html.indexOf('>', headerEnd) + 1;
  const probe = html.slice(after, after + 7000);
  const m = probe.match(/<(section|div|aside)\b[^>]*(?:class|id)=["'][^"']*(?:hero|banner|visual|slider|swiper|carousel)[^"']*["'][^>]*>[\s\S]*?<\/\1>/i);
  if (m) return html.slice(0, after + m.index) + html.slice(after + m.index + m[0].length);
  return html;
};

for (const name of ['index.html','404.html']) {
  const file = path.join(out, name);
  let html = fs.readFileSync(file, 'utf8');
  const originalImages = collectImages(html);
  html = removeExistingEditorial(html);
  html = replaceHeader(html);
  html = removeTopHero(html);
  html = html.replace(/shins-house-mascot-source\.webp|shins-house-logo-generated-v1\.webp|shins-house-logo(?:-premium-v2)?\.svg|shins-house-logo\.svg/g, logoFile);
  const editorial = makeEditorialHome(originalImages);
  const headerEnd = html.search(/<\/header>/i);
  if (headerEnd >= 0) {
    const at = html.indexOf('>', headerEnd) + 1;
    html = html.slice(0,at) + editorial + '<div id="sh-original-shop"></div>' + html.slice(at);
  } else html = html.replace(/<body\b([^>]*)>/i, `<body$1>${editorial}<div id="sh-original-shop"></div>`);
  if (!/<script[^>]+src=["']\/?app\.js["']/i.test(html)) html = html.replace(/<\/body>/i, '<script src="/app.js" defer></script></body>');
  fs.writeFileSync(file, html, 'utf8');
}

fs.appendFileSync(path.join(out, 'styles.css'), refCss, 'utf8');
console.log(`Applied Shin's House editorial reference redesign with ${image.length} logo bytes`);
