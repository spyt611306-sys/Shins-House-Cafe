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

const legacyIndex = path.join(out, 'index.html');
const legacyHtml = fs.readFileSync(legacyIndex, 'utf8');
fs.writeFileSync(path.join(out, 'shop.html'), legacyHtml, 'utf8');

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

const home = `
${header}
<main class="sh-editorial-home" id="top">
  <section class="sh-hero" aria-labelledby="hero-title">
    <div class="sh-hero-copy">
      <p class="sh-kicker">COFFEE · PEOPLE · A BRIGHTER DAY</p>
      <h1 id="hero-title">좋은 커피가<br>좋은 하루를<br>만듭니다.</h1>
      <p class="sh-hand">Good Coffee, Brighter Days.</p>
      <p class="sh-lead">매일 마셔도 편안한 커피와 오래 곁에 둘 취향을 고릅니다.<br>신스하우스는 한 잔의 경험을 차분하게 설계합니다.</p>
      <div class="sh-hero-actions"><a class="sh-pill" href="#story" data-sh-target="story">OUR STORY <span>→</span></a><a class="sh-text-link" href="/shop.html">SHOP COFFEE ↗</a></div>
    </div>
    <aside class="sh-brand-panel" aria-label="Shin's House brand message">
      <div class="sh-brand-ring"><span>SHIN'S HOUSE</span><b>2010</b><small>BUSAN · SPECIALTY COFFEE</small></div>
      <p class="sh-panel-script">A small house<br>for better days.</p>
      <div class="sh-panel-meta"><span>COFFEE</span><span>PEOPLE</span><span>CULTURE</span><span>COMMUNITY</span></div>
    </aside>
  </section>

  <section class="sh-story" id="story">
    <div class="sh-section-title"><span>01</span><p class="sh-label">OUR STORY</p><h2>커피보다 먼저,<br>사람을 생각합니다.</h2></div>
    <div class="sh-story-grid">
      <article><b>ORIGIN</b><h3>좋은 재료에서 시작합니다.</h3><p>매일 편안하게 마실 수 있는 균형을 기준으로 원두를 고르고, 각 원두의 개성을 과하게 덮지 않는 방향을 지향합니다.</p></article>
      <article><b>ROAST</b><h3>서두르지 않고 굽습니다.</h3><p>단맛, 질감, 향의 흐름이 자연스럽게 이어지도록 로스팅의 작은 차이를 반복해서 확인합니다.</p></article>
      <article><b>EVERYDAY</b><h3>일상에 오래 남는 한 잔.</h3><p>강한 인상보다 다시 찾고 싶은 맛, 유행보다 오래 유지되는 취향을 신스하우스의 기준으로 삼습니다.</p></article>
    </div>
  </section>

  <section class="sh-coffee" id="coffee">
    <div class="sh-section-title sh-section-title--wide"><div><span>02</span><p class="sh-label">COFFEE NOTES</p><h2>오늘의 취향을<br>한눈에 고르세요.</h2></div><a class="sh-text-link" href="/shop.html">전체 원두 보기 ↗</a></div>
    <div class="sh-note-grid">
      <article><em>01</em><p class="sh-note-type">NUTTY & SWEET</p><h3>고소하고 부드럽게</h3><p>초콜릿 · 견과 · 캐러멜</p><div class="sh-meter"><i style="--w:86%"></i></div></article>
      <article><em>02</em><p class="sh-note-type">BALANCED</p><h3>매일 편안하게</h3><p>브라운슈가 · 코코아 · 클린 피니시</p><div class="sh-meter"><i style="--w:72%"></i></div></article>
      <article><em>03</em><p class="sh-note-type">BRIGHT & JUICY</p><h3>산뜻하고 선명하게</h3><p>시트러스 · 베리 · 플로럴</p><div class="sh-meter"><i style="--w:62%"></i></div></article>
      <article><em>04</em><p class="sh-note-type">COLD FAVORITE</p><h3>아이스로 더 깔끔하게</h3><p>달콤함 · 선명함 · 긴 여운</p><div class="sh-meter"><i style="--w:78%"></i></div></article>
    </div>
  </section>

  <section class="sh-space" id="space">
    <div class="sh-space-copy"><span>03</span><p class="sh-label">SPACE · BUSAN</p><h2>커피가 조금 더<br>천천히 흐르는 공간.</h2><p>원두를 고르고, 한 잔을 마시고, 잠시 머무르는 시간까지 신스하우스의 경험입니다.</p><a class="sh-pill sh-pill--light" href="https://maps.google.com/?q=부산광역시+부산진구+새싹로8번길+35-8" rel="noopener">GET DIRECTIONS <span>↗</span></a></div>
    <div class="sh-space-info"><div><small>ADDRESS</small><strong>부산광역시 부산진구<br>새싹로8번길 35-8 1층</strong></div><div><small>HOUSE NOTE</small><strong>GOOD COFFEE<br>BRIGHTER DAYS</strong></div><div><small>ONLINE</small><strong><a href="/shop.html">SHOP SHIN'S HOUSE ↗</a></strong></div></div>
  </section>

  <section class="sh-community" id="community">
    <div class="sh-section-title"><span>04</span><p class="sh-label">COMMUNITY</p><h2>커피를 매개로<br>좋은 이야기를 잇습니다.</h2></div>
    <div class="sh-community-grid">
      <article><small>01</small><h3>CUPPING</h3><p>다양한 원두의 향미를 비교하고 취향을 발견하는 커피 테이블.</p></article>
      <article><small>02</small><h3>WORKSHOP</h3><p>집에서도 더 좋은 한 잔을 만들 수 있도록 추출과 원두 이야기를 나눕니다.</p></article>
      <article><small>03</small><h3>NEIGHBORHOOD</h3><p>사람과 지역, 일상의 작은 문화를 연결하는 신스하우스의 커뮤니티.</p></article>
    </div>
  </section>

  <section class="sh-store" id="store">
    <p class="sh-label">ONLINE STORE</p><h2>집에서도 이어지는<br>신스하우스의 커피.</h2><p>원두와 굿즈, 선물까지. 신스하우스의 취향을 온라인에서 만나보세요.</p><a class="sh-pill" href="/shop.html">SHOP NOW <span>→</span></a>
  </section>
</main>
<footer class="sh-footer"><div><strong>Shin's House</strong><p>GOOD COFFEE · BRIGHTER DAYS</p></div><nav><a href="/legal/terms">이용약관</a><a href="/legal/privacy">개인정보처리방침</a><a href="/legal/refund">취소·교환·환불</a></nav></footer>
<script src="/app.js" defer></script>`;

const css = `
:root{--ink:#171713;--paper:#f6f0e7;--paper2:#fbf8f2;--rust:#ad5b36;--green:#233126;--green2:#314235;--gold:#b99a66;--line:rgba(50,39,27,.16)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper2);color:var(--ink);font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;overflow-x:hidden}a{color:inherit}.sh-ref-header{min-height:88px;padding:10px clamp(22px,4.5vw,78px);display:grid;grid-template-columns:240px 1fr auto;align-items:center;gap:32px;background:rgba(249,246,239,.98);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:100;backdrop-filter:blur(12px)}.sh-ref-brand{display:flex;align-items:center}.sh-ref-brand img{display:block;width:205px;height:auto;max-width:100%}.sh-ref-nav{display:flex;justify-content:center;align-items:center;gap:clamp(20px,3vw,48px)}.sh-ref-nav a,.sh-ref-visit{font-size:11px;font-weight:850;letter-spacing:.14em;text-decoration:none;white-space:nowrap}.sh-ref-nav a{padding:14px 0;position:relative}.sh-ref-nav a:after{content:'';position:absolute;left:50%;right:50%;bottom:7px;height:1px;background:var(--rust);transition:.2s}.sh-ref-nav a:hover:after,.sh-ref-nav a:focus-visible:after{left:0;right:0}.sh-ref-visit{border:1px solid var(--ink);padding:12px 19px;border-radius:999px}.sh-editorial-home{width:100%;background:var(--paper2)}.sh-hero{min-height:660px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(390px,.75fr);background:var(--paper2);border-bottom:1px solid var(--line)}.sh-hero-copy{padding:clamp(70px,8vw,128px) clamp(30px,7vw,120px)}.sh-kicker,.sh-label{font-size:10px;font-weight:850;letter-spacing:.2em;color:#775d49;margin:0 0 18px}.sh-hero h1,.sh-section-title h2,.sh-space h2,.sh-store h2{font-family:'Noto Serif KR','Iowan Old Style','Baskerville',serif;font-weight:600;letter-spacing:-.045em}.sh-hero h1{font-size:clamp(54px,6vw,100px);line-height:1.05;margin:0;max-width:820px}.sh-hand{font-family:'Brush Script MT','Segoe Script',cursive;color:var(--rust);font-size:clamp(30px,3vw,48px);margin:26px 0 24px;transform:rotate(-2deg);transform-origin:left}.sh-lead{font-size:15px;line-height:1.9;color:#625b53;margin:0 0 30px}.sh-hero-actions{display:flex;align-items:center;gap:24px;flex-wrap:wrap}.sh-pill{display:inline-flex;gap:28px;align-items:center;padding:13px 21px;border-radius:999px;background:var(--rust);color:white;text-decoration:none;font-size:11px;font-weight:850;letter-spacing:.08em}.sh-text-link{font-size:12px;font-weight:800;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:4px}.sh-brand-panel{background:var(--green);color:#f7efe4;padding:clamp(48px,6vw,88px);display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}.sh-brand-panel:before,.sh-brand-panel:after{content:'';position:absolute;border:1px solid rgba(235,218,186,.16);border-radius:50%;pointer-events:none}.sh-brand-panel:before{width:430px;height:430px;right:-140px;top:-120px}.sh-brand-panel:after{width:240px;height:240px;right:40px;top:80px}.sh-brand-ring{position:relative;z-index:2;display:flex;flex-direction:column;gap:7px}.sh-brand-ring span{font:800 clamp(16px,1.5vw,24px)/1.2 Georgia,serif;letter-spacing:.18em}.sh-brand-ring b{font:400 clamp(72px,8vw,138px)/.9 Georgia,serif;color:#d8c297;letter-spacing:-.06em}.sh-brand-ring small{font-size:10px;font-weight:800;letter-spacing:.18em;opacity:.7}.sh-panel-script{position:relative;z-index:2;font:400 clamp(34px,4vw,62px)/1.05 'Brush Script MT','Segoe Script',cursive;margin:60px 0 28px}.sh-panel-meta{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:10px;font-weight:850;letter-spacing:.18em;padding-top:24px;border-top:1px solid rgba(255,255,255,.18)}.sh-story,.sh-coffee,.sh-community{padding:clamp(78px,8vw,132px) clamp(26px,7vw,120px)}.sh-story{background:var(--paper)}.sh-section-title{max-width:760px;margin-bottom:52px}.sh-section-title>span,.sh-section-title--wide>div>span,.sh-space-copy>span{display:block;color:var(--rust);font:700 12px/1 Georgia,serif;margin-bottom:10px}.sh-section-title h2,.sh-space h2,.sh-store h2{font-size:clamp(36px,4.4vw,68px);line-height:1.12;margin:0}.sh-section-title--wide{max-width:none;display:flex;justify-content:space-between;align-items:flex-end;gap:30px}.sh-story-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.sh-story-grid article{padding:38px clamp(18px,3vw,42px) 42px;border-right:1px solid var(--line);min-height:300px}.sh-story-grid article:last-child{border-right:0}.sh-story-grid b,.sh-note-type{font-size:10px;letter-spacing:.18em;color:var(--rust)}.sh-story-grid h3,.sh-note-grid h3,.sh-community-grid h3{font-family:'Noto Serif KR','Iowan Old Style','Baskerville',serif;font-size:24px;line-height:1.35;margin:30px 0 14px}.sh-story-grid p,.sh-note-grid p,.sh-community-grid p,.sh-space-copy>p,.sh-store>p{font-size:14px;line-height:1.85;color:#665f56}.sh-coffee{background:#efe6d8}.sh-note-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.sh-note-grid article{background:rgba(255,255,255,.55);padding:28px 24px 26px;min-height:300px;border:1px solid rgba(67,47,31,.08);transition:transform .2s,background .2s}.sh-note-grid article:hover{transform:translateY(-4px);background:#fff}.sh-note-grid em{font:400 48px/1 Georgia,serif;color:#b8a58c}.sh-note-type{margin:28px 0 0!important;color:#7b5f48!important}.sh-note-grid h3{margin:12px 0}.sh-meter{height:2px;background:rgba(40,30,20,.12);margin-top:32px;overflow:hidden}.sh-meter i{display:block;width:var(--w);height:100%;background:var(--rust)}.sh-space{display:grid;grid-template-columns:1.15fr .85fr;background:var(--green);color:#f9f2e8}.sh-space-copy{padding:clamp(72px,8vw,126px) clamp(28px,7vw,120px)}.sh-space-copy .sh-label{color:#cdb995}.sh-space-copy>p{color:rgba(255,255,255,.72);max-width:640px;margin:26px 0 30px}.sh-pill--light{background:#f4e8d7;color:var(--green)}.sh-space-info{background:var(--green2);padding:clamp(50px,7vw,100px);display:flex;flex-direction:column;justify-content:center}.sh-space-info>div{padding:28px 0;border-bottom:1px solid rgba(255,255,255,.14)}.sh-space-info>div:last-child{border-bottom:0}.sh-space-info small{display:block;font-size:9px;font-weight:800;letter-spacing:.2em;color:#cdb995;margin-bottom:10px}.sh-space-info strong{font:500 18px/1.55 'Noto Serif KR',serif}.sh-space-info a{text-decoration:none}.sh-community{background:var(--paper2)}.sh-community-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.sh-community-grid article{padding:34px;border:1px solid var(--line);min-height:240px}.sh-community-grid small{font:700 11px Georgia,serif;color:var(--rust)}.sh-store{text-align:center;padding:clamp(90px,10vw,160px) 26px;background:#decbb2;position:relative;overflow:hidden}.sh-store:before,.sh-store:after{content:'';position:absolute;border-radius:50%;background:rgba(255,255,255,.22)}.sh-store:before{width:420px;height:420px;left:-210px;top:-210px}.sh-store:after{width:280px;height:280px;right:-120px;bottom:-140px}.sh-store>*{position:relative;z-index:2}.sh-store p:not(.sh-label){max-width:650px;margin:24px auto 30px}.sh-footer{background:#151812;color:#e9dfcf;padding:46px clamp(24px,6vw,100px);display:flex;justify-content:space-between;align-items:flex-end;gap:30px}.sh-footer strong{font:500 26px Georgia,serif}.sh-footer p{font-size:9px;letter-spacing:.18em;opacity:.6}.sh-footer nav{display:flex;gap:20px;flex-wrap:wrap}.sh-footer a{font-size:11px;text-decoration:none;opacity:.72}.sh-footer a:hover{opacity:1}
@media(max-width:980px){.sh-ref-header{grid-template-columns:180px 1fr}.sh-ref-visit{display:none}.sh-ref-nav{justify-content:flex-end;gap:20px}.sh-hero{grid-template-columns:1fr}.sh-brand-panel{min-height:440px}.sh-story-grid,.sh-community-grid{grid-template-columns:1fr}.sh-story-grid article{border-right:0;border-bottom:1px solid var(--line);min-height:auto}.sh-story-grid article:last-child{border-bottom:0}.sh-note-grid{grid-template-columns:repeat(2,1fr)}.sh-space{grid-template-columns:1fr}.sh-section-title--wide{display:block}.sh-section-title--wide .sh-text-link{display:inline-block;margin-top:24px}}
@media(max-width:720px){.sh-ref-header{position:relative;grid-template-columns:1fr;min-height:auto;padding:12px 18px;gap:8px}.sh-ref-brand img{width:160px}.sh-ref-nav{justify-content:flex-start;overflow-x:auto;gap:20px;padding-bottom:2px;scrollbar-width:none}.sh-ref-nav::-webkit-scrollbar{display:none}.sh-ref-nav a{font-size:10px}.sh-hero-copy{padding:58px 24px 64px}.sh-hero h1{font-size:clamp(46px,14vw,70px)}.sh-brand-panel{padding:52px 24px;min-height:420px}.sh-brand-ring b{font-size:92px}.sh-panel-script{font-size:44px}.sh-story,.sh-coffee,.sh-community{padding:70px 22px}.sh-note-grid{grid-template-columns:1fr}.sh-note-grid article{min-height:240px}.sh-space-copy,.sh-space-info{padding:64px 24px}.sh-footer{display:block}.sh-footer nav{margin-top:26px}}
`;

fs.writeFileSync(path.join(out, 'editorial.css'), css, 'utf8');

const siteUrl = String(process.env.SITE_URL || process.env.URL || 'https://shinshouse.netlify.app').replace(/\/$/, '');
const description = 'Shin\'s House — 부산에서 매일 마시기 좋은 커피와 오래 곁에 둘 취향을 고릅니다.';
const head = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shin's House — Good Coffee, Brighter Days</title><meta name="description" content="${description}"><link rel="canonical" href="${siteUrl}/"><meta property="og:type" content="website"><meta property="og:site_name" content="Shin's House"><meta property="og:title" content="Shin's House — Good Coffee, Brighter Days"><meta property="og:description" content="${description}"><meta property="og:url" content="${siteUrl}/"><link rel="stylesheet" href="/editorial.css"></head><body>`;
const document = `${head}${home}</body></html>`;
fs.writeFileSync(legacyIndex, document, 'utf8');
fs.writeFileSync(path.join(out, '404.html'), document, 'utf8');

const sitemapFile = path.join(out, 'sitemap.xml');
if (fs.existsSync(sitemapFile)) {
  let sitemap = fs.readFileSync(sitemapFile, 'utf8');
  if (!sitemap.includes('/shop.html')) sitemap = sitemap.replace('</urlset>', `<url><loc>${siteUrl}/shop.html</loc></url></urlset>`);
  fs.writeFileSync(sitemapFile, sitemap, 'utf8');
}

console.log(`Photo-free editorial homepage generated; original shop preserved at /shop.html; logo preserved (${logoBytes.length} bytes)`);
