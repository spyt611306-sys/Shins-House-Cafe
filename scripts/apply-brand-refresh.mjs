import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');
fs.mkdirSync(assetsOut, { recursive:true });

const readB64Parts = (names) => names.map((name) => fs.readFileSync(path.join(root, 'brand-source', name), 'utf8').replace(/\s+/g, '')).join('');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const assertWebp = (bytes, label) => {
  if (bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP') throw new Error(`${label} is not WebP`);
};

const logoFile = 'shins-house-logo-generated-v2.webp';
const logoBytes = Buffer.from(readB64Parts(['shins-house-logo-generated-v2.part01','shins-house-logo-generated-v2.part02']), 'base64');
if (sha256(logoBytes) !== 'bae8549f358b1438191be51b199d9b63866746463e8579275a4afe20a6a38ed7') throw new Error('Shin\'s House logo integrity check failed');
assertWebp(logoBytes, 'logo');
fs.writeFileSync(path.join(assetsOut, logoFile), logoBytes);

const heroFile = 'shins-house-cafe-hero.webp';
const heroBytes = Buffer.from(readB64Parts(['hero-cafe-v2.part01','hero-cafe-v2.part02','hero-cafe-v2.part03']), 'base64');
if (sha256(heroBytes) !== '066c215d77be4bcecf8a2acd423e32c24e2cd0c9c54423ed0359200e426a3a78') throw new Error('Hero image integrity check failed');
assertWebp(heroBytes, 'hero');
fs.writeFileSync(path.join(assetsOut, heroFile), heroBytes);

// Preserve the complete legacy commerce experience as an independent page.
const legacyIndex = path.join(out, 'index.html');
const legacyHtml = fs.readFileSync(legacyIndex, 'utf8');
fs.writeFileSync(path.join(out, 'shop.html'), legacyHtml, 'utf8');

const iconSearch = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg>`;
const iconBag = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>`;

const header = `
<header class="sh-ref-header" aria-label="Shin's House navigation">
  <a class="sh-ref-brand" href="#top" data-sh-target="top" aria-label="Shin's House 홈">
    <img src="/assets/${logoFile}" width="320" height="107" alt="Shin's House" decoding="async">
  </a>
  <nav class="sh-ref-nav" aria-label="주요 메뉴">
    <a href="#story" data-sh-target="story">STORY</a>
    <a href="#coffee" data-sh-target="coffee">COFFEE</a>
    <a href="#space" data-sh-target="space">SPACE</a>
    <a href="#community" data-sh-target="community">COMMUNITY</a>
    <a href="/shop.html">ONLINE STORE</a>
  </nav>
  <div class="sh-header-actions">
    <a class="sh-icon-btn" href="/shop.html" aria-label="상품 검색">${iconSearch}</a>
    <a class="sh-icon-btn" href="/shop.html#cart" aria-label="장바구니">${iconBag}</a>
    <details class="sh-mobile-menu">
      <summary aria-label="메뉴 열기"><i></i><i></i><i></i></summary>
      <nav><a href="#story" data-sh-target="story">STORY</a><a href="#coffee" data-sh-target="coffee">COFFEE</a><a href="#space" data-sh-target="space">SPACE</a><a href="#community" data-sh-target="community">COMMUNITY</a><a href="/shop.html">ONLINE STORE</a></nav>
    </details>
  </div>
</header>`;

const home = `
${header}
<main class="sh-editorial-home" id="top">
  <section class="sh-hero-media" aria-label="Shin's House cafe">
    <img class="sh-hero-image" src="/assets/${heroFile}" alt="따뜻한 햇살이 드는 Shin's House 카페에서 커피를 즐기는 장면" fetchpriority="high" decoding="async">
    <div class="sh-hero-shade" aria-hidden="true"></div>
    <div class="sh-hero-foot"><p>SHIN'S HOUSE · BUSAN · EST. 2010</p><a href="#story" data-sh-target="story">DISCOVER <span>↓</span></a></div>
  </section>

  <section class="sh-story" id="story">
    <div class="sh-eyebrow"><span>01</span><b>OUR STORY</b></div>
    <div class="sh-story-head"><h1>좋은 한 잔은<br>좋은 시간을 만듭니다.</h1><p>신스하우스는 커피 한 잔이 놓이는 순간과 그 시간을 함께 기억합니다. 매일 편안하게 찾을 수 있는 맛, 오래 머물고 싶은 공간, 다시 만나고 싶은 사람을 위한 작은 집입니다.</p></div>
    <div class="sh-story-notes"><article><small>ORIGIN</small><h2>좋은 재료</h2><p>원두가 가진 단맛과 질감, 깨끗한 여운을 기준으로 고릅니다.</p></article><article><small>ROAST</small><h2>섬세한 로스팅</h2><p>과하게 덮지 않고 가장 자연스러운 균형을 찾습니다.</p></article><article><small>EVERYDAY</small><h2>편안한 일상</h2><p>강한 인상보다 다시 찾고 싶은 한 잔을 지향합니다.</p></article></div>
  </section>

  <section class="sh-coffee" id="coffee">
    <div class="sh-section-intro"><div class="sh-eyebrow"><span>02</span><b>COFFEE MENU</b></div><h2>오늘의 기분에 맞는<br>한 잔을 고르세요.</h2><a href="/shop.html">ONLINE STORE ↗</a></div>
    <div class="sh-menu-grid">
      <article><span>01</span><div><small>CLASSIC</small><h3>Americano</h3><p>깔끔한 바디와 길게 이어지는 커피의 여운</p></div><em>HOT · ICE</em></article>
      <article><span>02</span><div><small>MILKY</small><h3>Café Latte</h3><p>에스프레소와 우유가 만드는 부드러운 밸런스</p></div><em>HOT · ICE</em></article>
      <article><span>03</span><div><small>SWEET</small><h3>Vanilla Latte</h3><p>은은한 바닐라 향과 고소한 밀크의 조화</p></div><em>HOT · ICE</em></article>
      <article><span>04</span><div><small>SIGNATURE</small><h3>Cream Coffee</h3><p>진한 커피 위에 부드러운 크림을 더한 시그니처</p></div><em>ICE</em></article>
    </div>
  </section>

  <section class="sh-space" id="space">
    <div class="sh-space-copy"><div class="sh-eyebrow sh-eyebrow--light"><span>03</span><b>SPACE · BUSAN</b></div><h2>A small house<br>for better days.</h2><p>커피를 고르고, 한 잔을 마시고, 잠시 머무르는 시간까지 신스하우스의 경험입니다.</p><a class="sh-outline-btn" href="https://maps.google.com/?q=부산광역시+부산진구+새싹로8번길+35-8" rel="noopener">VISIT SHIN'S HOUSE ↗</a></div>
    <div class="sh-space-meta"><div><small>ADDRESS</small><strong>부산광역시 부산진구<br>새싹로8번길 35-8 1층</strong></div><div><small>HOUSE NOTE</small><strong>COFFEE · PEOPLE<br>CULTURE · COMMUNITY</strong></div><div><small>ONLINE</small><strong><a href="/shop.html">SHOP SHIN'S HOUSE ↗</a></strong></div></div>
  </section>

  <section class="sh-community" id="community">
    <div class="sh-section-intro"><div class="sh-eyebrow"><span>04</span><b>COMMUNITY</b></div><h2>커피를 매개로<br>좋은 이야기를 잇습니다.</h2></div>
    <div class="sh-community-grid"><article><small>01</small><h3>CUPPING</h3><p>원두의 향미를 비교하고 자신의 취향을 발견하는 시간.</p></article><article><small>02</small><h3>WORKSHOP</h3><p>집에서도 좋은 한 잔을 만들 수 있도록 추출 이야기를 나눕니다.</p></article><article><small>03</small><h3>NEIGHBORHOOD</h3><p>사람과 지역, 일상의 작은 문화를 연결하는 신스하우스.</p></article></div>
  </section>

  <section class="sh-store" id="store"><p>ONLINE STORE</p><h2>신스하우스의 취향을<br>집에서도 만나보세요.</h2><a href="/shop.html">SHOP NOW <span>→</span></a></section>
</main>
<footer class="sh-footer"><div><strong>Shin's House</strong><p>BUSAN · EST. 2010</p></div><nav><a href="/legal/terms">이용약관</a><a href="/legal/privacy">개인정보처리방침</a><a href="/legal/refund">취소·교환·환불</a></nav></footer>
<script src="/app.js" defer></script>`;

const css = `
:root{--ink:#171713;--ivory:#f3ede4;--paper:#f8f4ed;--green:#18271f;--green2:#21372a;--rust:#9f5d38;--line:rgba(31,25,18,.17)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;overflow-x:hidden}a{color:inherit}.sh-ref-header{position:absolute;left:0;right:0;top:0;z-index:30;height:108px;padding:18px clamp(28px,4.8vw,88px);display:grid;grid-template-columns:250px 1fr auto;align-items:center;gap:30px;color:white;background:linear-gradient(180deg,rgba(10,12,9,.42),rgba(10,12,9,0));text-shadow:0 1px 16px rgba(0,0,0,.34)}.sh-ref-brand{display:flex;align-items:center;width:max-content}.sh-ref-brand img{display:block;width:220px;height:auto;filter:drop-shadow(0 3px 12px rgba(0,0,0,.28))}.sh-ref-nav{display:flex;align-items:center;justify-content:center;gap:clamp(25px,3.1vw,52px)}.sh-ref-nav a{text-decoration:none;color:#fff;font:700 12px/1.2 Georgia,'Times New Roman',serif;letter-spacing:.1em;position:relative;padding:14px 0}.sh-ref-nav a:after{content:'';position:absolute;bottom:7px;left:50%;right:50%;height:1px;background:#fff;transition:.2s}.sh-ref-nav a:hover:after,.sh-ref-nav a:focus-visible:after{left:0;right:0}.sh-header-actions{display:flex;align-items:center;gap:8px}.sh-icon-btn{width:46px;height:46px;display:grid;place-items:center;border-radius:999px;background:rgba(10,14,11,.34);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.08)}.sh-icon-btn svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}.sh-mobile-menu{position:relative}.sh-mobile-menu summary{width:46px;height:46px;list-style:none;display:grid;place-content:center;gap:5px;border-radius:999px;background:rgba(10,14,11,.34);border:1px solid rgba(255,255,255,.08);cursor:pointer}.sh-mobile-menu summary::-webkit-details-marker{display:none}.sh-mobile-menu summary i{display:block;width:20px;height:1.5px;background:#fff}.sh-mobile-menu nav{position:absolute;right:0;top:55px;width:220px;padding:18px;display:grid;gap:4px;background:rgba(20,28,22,.96);border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 50px rgba(0,0,0,.28)}.sh-mobile-menu nav a{padding:11px 8px;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:.08em}.sh-editorial-home{width:100%;background:var(--paper)}.sh-hero-media{height:min(100svh,980px);min-height:700px;position:relative;background:#2b261f;overflow:hidden}.sh-hero-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 47%;display:block}.sh-hero-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,10,8,.28) 0%,rgba(8,10,8,.03) 35%,rgba(8,10,8,.04) 68%,rgba(8,10,8,.47) 100%);pointer-events:none}.sh-hero-foot{position:absolute;left:clamp(28px,4.8vw,88px);right:clamp(28px,4.8vw,88px);bottom:35px;display:flex;align-items:end;justify-content:space-between;color:white;text-shadow:0 1px 12px rgba(0,0,0,.4)}.sh-hero-foot p{margin:0;font-size:10px;font-weight:800;letter-spacing:.2em}.sh-hero-foot a{color:#fff;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:.15em;display:flex;gap:16px;align-items:center}.sh-story,.sh-coffee,.sh-community{padding:clamp(78px,9vw,150px) clamp(28px,8vw,150px)}.sh-story{background:var(--ivory)}.sh-eyebrow{display:flex;gap:16px;align-items:center;margin-bottom:32px;color:#775741}.sh-eyebrow span{font:500 14px/1 Georgia,serif}.sh-eyebrow b{font-size:10px;letter-spacing:.18em}.sh-story-head{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.7fr);gap:clamp(40px,9vw,150px);align-items:end;border-bottom:1px solid var(--line);padding-bottom:clamp(48px,6vw,85px)}.sh-story-head h1,.sh-section-intro h2,.sh-space h2,.sh-store h2{font-family:'Noto Serif KR','Iowan Old Style',Georgia,serif;font-weight:500;letter-spacing:-.055em;margin:0}.sh-story-head h1{font-size:clamp(48px,6.2vw,96px);line-height:1.08}.sh-story-head>p{margin:0;color:#5e584f;font-size:15px;line-height:1.95;max-width:520px}.sh-story-notes{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:0}.sh-story-notes article{padding:42px 36px 20px 0;border-right:1px solid var(--line);min-height:230px}.sh-story-notes article+article{padding-left:36px}.sh-story-notes article:last-child{border-right:0}.sh-story-notes small,.sh-menu-grid small,.sh-community-grid small{font-size:10px;letter-spacing:.16em;color:#806248;font-weight:800}.sh-story-notes h2{font:500 26px/1.2 'Noto Serif KR',Georgia,serif;margin:18px 0 12px}.sh-story-notes p{font-size:13px;line-height:1.8;color:#696157;margin:0}.sh-coffee{background:#faf7f1}.sh-section-intro{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:30px;margin-bottom:54px}.sh-section-intro .sh-eyebrow{grid-column:1/-1;margin-bottom:0}.sh-section-intro h2{font-size:clamp(42px,5vw,78px);line-height:1.1}.sh-section-intro>a{font-size:11px;font-weight:800;text-decoration:none;letter-spacing:.08em;border-bottom:1px solid currentColor;padding-bottom:5px}.sh-menu-grid{border-top:1px solid var(--ink)}.sh-menu-grid article{display:grid;grid-template-columns:70px minmax(0,1fr) auto;gap:24px;align-items:center;padding:30px 4px;border-bottom:1px solid var(--line);transition:padding .25s,background .25s}.sh-menu-grid article:hover{padding-left:18px;padding-right:18px;background:#f0e8dc}.sh-menu-grid article>span{font:400 20px/1 Georgia,serif;color:#9b7658}.sh-menu-grid h3{font:500 clamp(28px,3vw,46px)/1.1 Georgia,'Times New Roman',serif;margin:5px 0 7px}.sh-menu-grid p{margin:0;font-size:13px;color:#686158}.sh-menu-grid em{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.14em;color:#7b5b43}.sh-space{background:var(--green);color:#f4ecdf;min-height:620px;padding:clamp(80px,9vw,150px) clamp(28px,8vw,150px);display:grid;grid-template-columns:1.2fr .8fr;gap:clamp(70px,10vw,170px);align-items:center}.sh-eyebrow--light{color:#c9aa7d}.sh-space h2{font-size:clamp(52px,6vw,96px);line-height:1.02}.sh-space-copy>p{font-size:14px;line-height:1.9;color:#c6c3ba;max-width:560px;margin:28px 0 34px}.sh-outline-btn{display:inline-flex;padding:13px 18px;border:1px solid rgba(255,255,255,.55);border-radius:999px;text-decoration:none;font-size:10px;font-weight:800;letter-spacing:.1em}.sh-space-meta{border-top:1px solid rgba(255,255,255,.2)}.sh-space-meta>div{padding:26px 0;border-bottom:1px solid rgba(255,255,255,.14);display:grid;grid-template-columns:115px 1fr;gap:20px}.sh-space-meta small{font-size:9px;letter-spacing:.16em;color:#b59d7c}.sh-space-meta strong{font-size:13px;line-height:1.65;font-weight:500}.sh-space-meta a{text-decoration:none}.sh-community{background:var(--ivory)}.sh-community-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink);margin-top:54px}.sh-community-grid article{padding:40px 34px 20px 0;border-right:1px solid var(--line);min-height:240px}.sh-community-grid article+article{padding-left:34px}.sh-community-grid article:last-child{border-right:0}.sh-community-grid h3{font:500 28px/1.2 Georgia,serif;margin:38px 0 15px}.sh-community-grid p{margin:0;max-width:310px;font-size:13px;line-height:1.8;color:#686158}.sh-store{background:#b96640;color:#fff;padding:clamp(82px,10vw,160px) clamp(28px,8vw,150px);text-align:center}.sh-store>p{font-size:10px;letter-spacing:.2em;font-weight:800;margin:0 0 28px}.sh-store h2{font-size:clamp(46px,6vw,92px);line-height:1.08}.sh-store>a{display:inline-flex;align-items:center;gap:30px;margin-top:42px;border:1px solid rgba(255,255,255,.75);border-radius:999px;padding:14px 22px;color:#fff;text-decoration:none;font-size:10px;font-weight:850;letter-spacing:.12em}.sh-footer{background:#111a15;color:#dcd4c8;min-height:190px;padding:52px clamp(28px,8vw,150px);display:flex;justify-content:space-between;align-items:end;gap:40px}.sh-footer strong{font:600 28px/1 Georgia,serif}.sh-footer p{font-size:9px;letter-spacing:.16em;color:#988f83}.sh-footer nav{display:flex;gap:24px;flex-wrap:wrap}.sh-footer nav a{font-size:11px;text-decoration:none;color:#aaa297}.sh-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,18px);opacity:0;pointer-events:none;z-index:999;padding:11px 16px;border-radius:999px;background:#151a16;color:white;font-size:12px;transition:.2s}.sh-toast.is-show{opacity:1;transform:translate(-50%,0)}
@media(max-width:1050px){.sh-ref-header{grid-template-columns:190px 1fr auto;padding-inline:28px}.sh-ref-brand img{width:180px}.sh-ref-nav{gap:20px}.sh-ref-nav a{font-size:10px}.sh-story-head{grid-template-columns:1fr;align-items:start}.sh-space{grid-template-columns:1fr}.sh-space-meta{max-width:650px}.sh-hero-image{object-position:56% center}}
@media(max-width:760px){.sh-ref-header{height:82px;grid-template-columns:1fr auto;padding:12px 18px}.sh-ref-brand img{width:150px}.sh-ref-nav{display:none}.sh-icon-btn{display:none}.sh-mobile-menu summary{width:42px;height:42px}.sh-mobile-menu nav{width:calc(100vw - 36px);right:0}.sh-hero-media{min-height:660px;height:88svh}.sh-hero-image{object-position:64% center}.sh-hero-shade{background:linear-gradient(180deg,rgba(8,10,8,.28),rgba(8,10,8,.02) 45%,rgba(8,10,8,.5))}.sh-hero-foot{left:18px;right:18px;bottom:22px}.sh-hero-foot p{font-size:8px}.sh-story,.sh-coffee,.sh-community{padding:70px 22px}.sh-story-head h1{font-size:48px}.sh-story-notes,.sh-community-grid{grid-template-columns:1fr}.sh-story-notes article,.sh-community-grid article,.sh-story-notes article+article,.sh-community-grid article+article{padding:28px 0;border-right:0;border-bottom:1px solid var(--line);min-height:auto}.sh-section-intro{grid-template-columns:1fr}.sh-section-intro h2{font-size:46px}.sh-menu-grid article{grid-template-columns:44px 1fr;gap:14px}.sh-menu-grid article>em{grid-column:2}.sh-menu-grid h3{font-size:32px}.sh-space{padding:72px 22px;gap:55px}.sh-space h2{font-size:52px}.sh-space-meta>div{grid-template-columns:90px 1fr}.sh-store{padding:80px 22px}.sh-store h2{font-size:46px}.sh-footer{padding:45px 22px;align-items:flex-start;flex-direction:column}.sh-footer nav{gap:14px 20px}}
`;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shin's House — Coffee, People & Better Days</title><meta name="description" content="Shin's House — 부산의 커피와 공간, 그리고 사람들의 이야기."><link rel="stylesheet" href="/editorial.css"></head><body>${home}</body></html>`;
fs.writeFileSync(path.join(out, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(out, 'editorial.css'), css, 'utf8');

const sitemap = path.join(out, 'sitemap.xml');
if (fs.existsSync(sitemap)) {
  let xml = fs.readFileSync(sitemap, 'utf8');
  if (!xml.includes('/shop.html')) xml = xml.replace('</urlset>', `<url><loc>https://shinshouse.netlify.app/shop.html</loc></url></urlset>`);
  fs.writeFileSync(sitemap, xml, 'utf8');
}

console.log(`Rebuilt Shin's House homepage from scratch with cinematic hero (${heroBytes.length} bytes); legacy commerce preserved at /shop.html`);
