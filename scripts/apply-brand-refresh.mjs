import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');
const logoParts = ['shins-house-logo-generated-v2.part01','shins-house-logo-generated-v2.part02'].map((name) => path.join(root, 'brand-source', name));
const logoFile = 'shins-house-logo-generated-v2.webp';
const logoTarget = path.join(assetsOut, logoFile);
const fallbackSource = path.join(root, 'brand-source', 'shins-house-hero-4k.svg');
const fallbackFile = 'shins-house-editorial-fallback.svg';
const EXPECTED_SHA256 = 'bae8549f358b1438191be51b199d9b63866746463e8579275a4afe20a6a38ed7';

for (const file of logoParts) if (!fs.existsSync(file)) throw new Error(`Missing logo source: ${path.basename(file)}`);
const logoB64 = logoParts.map((file) => fs.readFileSync(file, 'utf8').replace(/\s+/g, '')).join('');
const logoBytes = Buffer.from(logoB64, 'base64');
const logoDigest = crypto.createHash('sha256').update(logoBytes).digest('hex');
if (logoDigest !== EXPECTED_SHA256 || logoBytes.toString('ascii',0,4) !== 'RIFF' || logoBytes.toString('ascii',8,12) !== 'WEBP') {
  throw new Error('Shin\'s House logo integrity check failed');
}
fs.mkdirSync(assetsOut, { recursive:true });
fs.writeFileSync(logoTarget, logoBytes);
if (fs.existsSync(fallbackSource)) fs.copyFileSync(fallbackSource, path.join(assetsOut, fallbackFile));

const esc = (value) => String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const collectImages = (html) => {
  const items = [];
  const re = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1];
    if (!src || /logo|brand|mascot|icon|avatar/i.test(src)) continue;
    if (!items.includes(src)) items.push(src);
  }
  return items;
};
const photo = (src, alt, cls='') => `<img class="sh-photo ${cls}" src="${esc(src)}" alt="${esc(alt)}" decoding="async" loading="lazy">`;

const header = `
<header class="sh-ref-header">
  <a class="sh-ref-brand" href="/" aria-label="Shin's House 홈">
    <img src="/assets/${logoFile}" width="320" height="107" alt="Shin's House" decoding="async">
  </a>
  <nav class="sh-ref-nav" aria-label="주요 메뉴">
    <a href="#story" data-sh-target="story">STORY</a>
    <a href="#coffee" data-sh-target="coffee">COFFEE</a>
    <a href="#space" data-sh-target="space">SPACE</a>
    <a href="#community" data-sh-target="community">COMMUNITY</a>
    <a href="/shop.html">ONLINE STORE</a>
  </nav>
  <a class="sh-ref-visit" href="#space" data-sh-target="space">VISIT US</a>
</header>`;

const makeHome = (images) => {
  const fallback = `/assets/${fallbackFile}`;
  const p = Array.from({length:6}, (_,i) => images[i] || fallback);
  return `
${header}
<main class="sh-editorial-home" id="top">
  <section class="sh-hero" aria-labelledby="hero-title">
    <div class="sh-hero-copy">
      <p class="sh-kicker">COFFEE · PEOPLE · A BRIGHTER DAY</p>
      <h1 id="hero-title">좋은 커피가<br>좋은 하루를 만듭니다.</h1>
      <p class="sh-hand">Good Coffee<br>Brighter Days</p>
      <p class="sh-lead">사람과, 이야기와, 커피가 머무는 곳.<br>신스하우스는 오늘도 좋은 하루를 준비합니다.</p>
      <a class="sh-pill" href="#story" data-sh-target="story">OUR STORY <span>→</span></a>
    </div>
    <div class="sh-hero-photo">${photo(p[0], '신스하우스의 따뜻한 커피')}</div>
    <aside class="sh-film" id="space">
      ${photo(p[1], '신스하우스 카페 공간')}
      <div class="sh-film-shade"></div>
      <div class="sh-film-copy"><em>A small house<br>for better days.</em><p>COFFEE<br>PEOPLE<br>CULTURE<br>COMMUNITY</p><a href="#community" data-sh-target="community">WATCH OUR FILM ○</a></div>
    </aside>
  </section>

  <section class="sh-story" id="story">
    <div class="sh-ribbon"></div>
    <article class="sh-story-row">
      <div class="sh-blob">${photo(p[2], '커피 산지와 신스하우스 이야기')}</div>
      <div class="sh-copy"><span>01</span><p class="sh-label">OUR ORIGIN STORY</p><h2>좋은 커피는,<br>사람에게서 시작됩니다.</h2><p>한 잔의 커피가 누군가의 하루를 바꿀 수 있다는 믿음으로, 신스하우스는 원두와 사람의 이야기를 함께 고릅니다.</p><a href="#coffee" data-sh-target="coffee">더 알아보기 →</a></div>
    </article>
    <article class="sh-story-row sh-story-row--reverse">
      <div class="sh-copy"><span>02</span><p class="sh-label">ROASTING PHILOSOPHY</p><h2>시간이 만들어주는<br>더 깊은 맛</h2><p>좋은 생두, 섬세한 로스팅, 그리고 기다림. 가장 잘 표현되는 순간을 위해 조금 더 느리게 준비합니다.</p><a href="#coffee" data-sh-target="coffee">로스팅 철학 보기 →</a></div>
      <div class="sh-blob sh-blob--right">${photo(p[3], '신스하우스 로스팅')}</div>
    </article>
  </section>

  <section class="sh-picks" id="coffee">
    <div class="sh-section-head"><div><span>03</span><p class="sh-label">BARISTA PICKS</p><h2>지금, 신스하우스의 추천 커피</h2><p>계절의 순간을 담은 바리스타들의 특별한 선택.</p></div><a href="/shop.html">전체 메뉴 보기 →</a></div>
    <div class="sh-pick-grid">
      <article><div class="sh-drink latte"></div><h3>신스 라떼</h3><p>부드러운 밸런스와 고소한 피니시</p><strong>6,500</strong></article>
      <article><div class="sh-drink ein"></div><h3>아인슈페너</h3><p>크림과 커피가 만드는 깊은 대비</p><strong>6,800</strong></article>
      <article><div class="sh-drink matcha"></div><h3>말차 크라우드</h3><p>진한 말차와 부드러운 밀크</p><strong>6,800</strong></article>
      <article><div class="sh-drink orange"></div><h3>오렌지 블랙</h3><p>상큼한 오렌지와 깊은 커피</p><strong>6,800</strong></article>
    </div>
  </section>

  <section class="sh-lower" id="community">
    <article class="sh-dessert">
      <div><span>04</span><p class="sh-label">FEATURED DESSERTS</p><h2>커피와 함께,<br>더 특별한 시간</h2><p>좋은 커피엔 좋은 디저트가 필요하니까. 오늘의 작은 즐거움을 함께 골라보세요.</p><a href="/shop.html">전체 디저트 보기 →</a></div>
      <div class="sh-dessert-visual">${photo(p[4], '신스하우스의 커피와 디저트')}</div>
    </article>
    <article class="sh-events">
      <div><span>05</span><p class="sh-label">COMMUNITY & EVENTS</p><h2>사람이 모여,<br>더 좋은 이야기가 됩니다.</h2><p>신스하우스는 커피를 넘어, 사람과 문화를 연결하는 다양한 이야기를 진행합니다.</p></div>
      <div class="sh-event-list">
        <div><b>OCT 12</b><span>COFFEE CUPPING<small>향미를 발견하는 저녁</small></span></div>
        <div><b>OCT 26</b><span>FLOWER CLASS<small>커피와 꽃이 있는 오후</small></span></div>
        <div><b>NOV 09</b><span>ACOUSTIC NIGHT<small>좋은 음악이 머무는 밤</small></span></div>
      </div>
    </article>
  </section>

  <section class="sh-store" id="store">
    <div class="sh-store-photo">${photo(p[5], '신스하우스 커피와 오브젝트')}</div>
    <div class="sh-store-copy"><p class="sh-label">ONLINE STORE</p><h2>집에서도 이어지는<br>신스하우스의 커피</h2><p>원두와 굿즈, 선물까지. 신스하우스의 취향을 온라인 스토어에서 만나보세요.</p><a class="sh-pill" href="/shop.html">SHOP NOW <span>→</span></a></div>
  </section>
</main>
<footer class="sh-footer"><strong>Shin's House</strong><p>GOOD COFFEE · BRIGHTER DAYS</p><nav><a href="/legal/terms">이용약관</a><a href="/legal/privacy">개인정보처리방침</a><a href="/legal/refund">취소·교환·환불</a></nav></footer>
<script src="/app.js" defer></script>`;
};

const css = `
:root{--ink:#1c1814;--paper:#f7f0e6;--paper2:#fbf7f0;--rust:#a85a37;--line:rgba(62,43,28,.18)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;overflow-x:hidden}a{color:inherit}.sh-ref-header{height:84px;padding:10px clamp(24px,4vw,72px);display:grid;grid-template-columns:220px 1fr auto;align-items:center;gap:28px;background:rgba(249,245,238,.97);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:100}.sh-ref-brand{display:flex;align-items:center}.sh-ref-brand img{display:block;width:190px;height:auto;max-width:100%}.sh-ref-nav{display:flex;justify-content:center;gap:clamp(18px,3vw,46px)}.sh-ref-nav a,.sh-ref-visit{font-size:11px;font-weight:800;letter-spacing:.13em;text-decoration:none;white-space:nowrap}.sh-ref-nav a{padding:14px 0;position:relative}.sh-ref-nav a:after{content:'';position:absolute;left:50%;right:50%;bottom:8px;height:1px;background:var(--rust);transition:.2s}.sh-ref-nav a:hover:after{left:0;right:0}.sh-ref-visit{border:1px solid var(--ink);padding:11px 18px;border-radius:999px}.sh-editorial-home{width:100%;overflow:hidden;background:var(--paper2)}.sh-hero{min-height:620px;display:grid;grid-template-columns:31% 42% 27%;background:var(--paper2)}.sh-hero-copy{padding:clamp(60px,7vw,110px) clamp(30px,4vw,72px)}.sh-kicker,.sh-label{font-size:10px;font-weight:800;letter-spacing:.18em;color:#7d624c;margin:0 0 18px}.sh-hero h1,.sh-copy h2,.sh-section-head h2,.sh-lower h2,.sh-store h2{font-family:'Noto Serif KR','Iowan Old Style','Baskerville',serif;font-weight:600;letter-spacing:-.04em}.sh-hero h1{font-size:clamp(40px,4.2vw,72px);line-height:1.15;margin:0}.sh-hand{font-family:'Brush Script MT','Segoe Script',cursive;color:var(--rust);font-size:clamp(28px,2.6vw,44px);line-height:1.05;margin:22px 0;transform:rotate(-3deg)}.sh-lead{font-size:14px;line-height:1.8;color:#61594f;margin:0 0 26px}.sh-pill{display:inline-flex;gap:28px;align-items:center;padding:12px 20px;border-radius:999px;background:var(--rust);color:white;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:.08em}.sh-hero-photo,.sh-film,.sh-blob,.sh-dessert-visual,.sh-store-photo{position:relative;overflow:hidden}.sh-photo{display:block;width:100%;height:100%;object-fit:cover}.sh-hero-photo{clip-path:ellipse(74% 88% at 50% 42%)}.sh-film{background:#201914;color:white}.sh-film>img{position:absolute;inset:0}.sh-film-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.68))}.sh-film-copy{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:44px}.sh-film-copy em{font:400 28px/1.15 'Brush Script MT','Segoe Script',cursive}.sh-film-copy p{font-size:11px;font-weight:800;line-height:1.8;letter-spacing:.2em}.sh-film-copy a{color:white;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:.1em}.sh-story{position:relative;padding:110px clamp(34px,6vw,110px) 60px;background:var(--paper);overflow:hidden}.sh-ribbon{position:absolute;right:-8%;top:26px;width:62%;height:64px;border-radius:50% 0 50% 50%;background:var(--rust);transform:rotate(-2deg)}.sh-story-row{position:relative;z-index:2;display:grid;grid-template-columns:42% 58%;gap:54px;align-items:center;margin-bottom:76px}.sh-story-row--reverse{grid-template-columns:58% 42%}.sh-blob{height:340px;border-radius:55% 45% 39% 61%/55% 42% 58% 45%;box-shadow:0 25px 60px rgba(63,43,27,.14)}.sh-blob--right{border-radius:43% 57% 58% 42%/47% 45% 55% 53%}.sh-copy span,.sh-section-head span,.sh-lower article>div>span{font:700 12px Georgia,serif;color:#9b6a48}.sh-copy h2,.sh-section-head h2,.sh-lower h2,.sh-store h2{font-size:clamp(30px,3vw,48px);line-height:1.24;margin:0 0 16px}.sh-copy>p:not(.sh-label),.sh-section-head p,.sh-lower p,.sh-store p{font-size:14px;line-height:1.8;color:#686158}.sh-copy a,.sh-section-head a,.sh-dessert a{display:inline-block;margin-top:10px;color:var(--rust);font-size:12px;font-weight:800;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:4px}.sh-picks{padding:74px clamp(34px,6vw,110px);background:#f9f3ea}.sh-section-head{display:flex;justify-content:space-between;align-items:end;gap:24px}.sh-pick-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:38px}.sh-pick-grid article{border-top:1px solid var(--line);padding:22px 16px}.sh-pick-grid h3{font-family:'Noto Serif KR',serif;font-size:18px;margin:16px 0 7px}.sh-pick-grid p{font-size:12px;line-height:1.6;color:#6b655e;min-height:38px}.sh-pick-grid strong{font-size:13px}.sh-drink{height:190px;position:relative}.sh-drink:before{content:'';position:absolute;width:84px;height:145px;left:50%;bottom:0;transform:translateX(-50%);border-radius:9px 9px 22px 22px;box-shadow:0 18px 28px rgba(50,35,25,.15);background:linear-gradient(#f3eee7 0 15%,#d7b789 15% 70%,#835037 70%)}.sh-drink.ein:before{background:linear-gradient(#f4eee5 0 26%,#4b2e20 26% 74%,#201713 74%)}.sh-drink.matcha:before{background:linear-gradient(#a8bd87 0 55%,#f3ecdf 55% 80%,#6f543f 80%)}.sh-drink.orange:before{background:linear-gradient(#dd8045 0 30%,#8a472b 30% 58%,#2c1812 58%)}.sh-lower{display:grid;grid-template-columns:1.2fr .9fr;padding:0 clamp(34px,6vw,110px) 90px;background:var(--paper)}.sh-dessert,.sh-events{padding:64px 42px;border-top:1px solid var(--line)}.sh-dessert{display:grid;grid-template-columns:.85fr 1.15fr;gap:32px;border-right:1px solid var(--line)}.sh-dessert-visual{height:290px;border-radius:52% 48% 44% 56%/46% 54% 46% 54%}.sh-events{background:#f2eadf}.sh-event-list{display:grid;gap:10px;margin-top:24px}.sh-event-list>div{display:grid;grid-template-columns:70px 1fr;gap:14px;align-items:center;padding:15px;background:white;border:1px solid var(--line)}.sh-event-list b{font:700 11px Georgia,serif;color:#8d5d3f}.sh-event-list span{font-size:11px;font-weight:800}.sh-event-list small{display:block;margin-top:5px;font-size:10px;font-weight:400;color:#776f65}.sh-store{display:grid;grid-template-columns:1.2fr .8fr;min-height:460px;background:#211913;color:white}.sh-store-photo{min-height:460px}.sh-store-photo:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(31,23,18,.25))}.sh-store-copy{padding:clamp(48px,6vw,90px);display:flex;flex-direction:column;justify-content:center}.sh-store-copy .sh-label{color:#c5a689}.sh-store-copy p{color:#d4c8bb}.sh-footer{background:#17120f;color:#d9cabb;padding:42px clamp(26px,5vw,80px);display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center}.sh-footer strong{font:600 30px Georgia,serif}.sh-footer p{font-size:10px;letter-spacing:.16em}.sh-footer nav{display:flex;gap:18px}.sh-footer a{font-size:11px;color:inherit;text-decoration:none}.sh-toast{position:fixed;left:50%;bottom:30px;z-index:9999;transform:translate(-50%,14px);padding:11px 17px;border-radius:999px;background:rgba(20,15,12,.93);color:#fff;font-size:13px;font-weight:700;opacity:0;pointer-events:none;transition:.2s}.sh-toast.is-show{opacity:1;transform:translate(-50%,0)}
@media(max-width:1000px){.sh-ref-header{grid-template-columns:170px 1fr}.sh-ref-visit{display:none}.sh-hero{grid-template-columns:44% 56%}.sh-film{grid-column:1/-1;min-height:320px}.sh-story-row,.sh-story-row--reverse{grid-template-columns:1fr 1fr}.sh-pick-grid{grid-template-columns:repeat(2,1fr)}.sh-lower{grid-template-columns:1fr}.sh-dessert{border-right:0}.sh-store{grid-template-columns:1fr 1fr}}
@media(max-width:720px){.sh-ref-header{position:relative;height:auto;grid-template-columns:1fr;gap:4px;padding:10px 18px}.sh-ref-brand img{width:150px}.sh-ref-nav{justify-content:flex-start;overflow-x:auto;gap:20px;padding-bottom:4px}.sh-ref-nav a{font-size:10px}.sh-hero{display:block}.sh-hero-copy{padding:48px 24px 34px}.sh-hero-photo{height:390px;clip-path:ellipse(92% 74% at 54% 48%)}.sh-film{min-height:340px}.sh-story{padding:80px 22px 40px}.sh-ribbon{width:80%;height:44px}.sh-story-row,.sh-story-row--reverse{grid-template-columns:1fr;gap:24px;margin-bottom:52px}.sh-story-row--reverse .sh-copy{order:2}.sh-blob{height:250px}.sh-picks{padding:54px 22px}.sh-section-head{display:block}.sh-pick-grid{grid-template-columns:repeat(2,1fr);gap:10px}.sh-drink{height:160px}.sh-lower{padding:0 22px 60px}.sh-dessert{grid-template-columns:1fr;padding:48px 0}.sh-events{padding:48px 18px}.sh-store{grid-template-columns:1fr}.sh-store-photo{min-height:340px}.sh-store-copy{padding:46px 24px}.sh-footer{grid-template-columns:1fr}.sh-footer nav{flex-wrap:wrap}}
`;

const replaceStylesheet = (html) => {
  let next = html.replace(/<link\b[^>]*href=["'](?:\.\/)?styles\.css["'][^>]*>/i, '<link rel="stylesheet" href="/editorial.css">');
  if (!/editorial\.css/.test(next)) next = next.replace(/<\/head>/i, '<link rel="stylesheet" href="/editorial.css">\n</head>');
  return next;
};
const replaceBody = (html, bodyMarkup) => {
  if (/<body\b[^>]*>[\s\S]*<\/body>/i.test(html)) return html.replace(/<body\b[^>]*>[\s\S]*<\/body>/i, `<body>${bodyMarkup}</body>`);
  return `${html}\n<body>${bodyMarkup}</body>`;
};

const indexFile = path.join(out, 'index.html');
const original = fs.readFileSync(indexFile, 'utf8');
const images = collectImages(original);

// Preserve the legacy commerce experience as a separate page, not hidden under the new homepage.
fs.writeFileSync(path.join(out, 'shop.html'), original, 'utf8');

let indexHtml = replaceStylesheet(original);
indexHtml = replaceBody(indexHtml, makeHome(images));
fs.writeFileSync(indexFile, indexHtml, 'utf8');
fs.writeFileSync(path.join(out, '404.html'), indexHtml, 'utf8');
fs.writeFileSync(path.join(out, 'editorial.css'), css, 'utf8');

const sitemapFile = path.join(out, 'sitemap.xml');
if (fs.existsSync(sitemapFile)) {
  let sitemap = fs.readFileSync(sitemapFile, 'utf8');
  const siteMatch = sitemap.match(/<loc>(https?:\/\/[^<]+)\/<\/loc>/i);
  if (siteMatch && !sitemap.includes('/shop.html')) sitemap = sitemap.replace('</urlset>', `<url><loc>${siteMatch[1]}/shop.html</loc></url></urlset>`);
  fs.writeFileSync(sitemapFile, sitemap, 'utf8');
}

console.log(`Homepage fully replaced; original commerce page preserved at /shop.html; logo preserved (${logoBytes.length} bytes)`);
