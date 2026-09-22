import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');

const logoParts = ['shins-house-logo-generated-v2.part01','shins-house-logo-generated-v2.part02'].map((name) => path.join(root, 'brand-source', name));
const logoFile = 'shins-house-logo-generated-v2.webp';
const LOGO_SHA256 = 'bae8549f358b1438191be51b199d9b63866746463e8579275a4afe20a6a38ed7';
const heroSource = path.join(root, 'brand-source', 'shins-house-hero-photo-v5.webp.b64');
const heroFile = 'shins-house-hero-photo-v5.webp';
const HERO_SHA256 = '6de432122e49b163b7683d4ea14f8f30c8ef30160319c55fe7ef4447ffb071ef';

const decodeWebp = (encoded, expectedSha, label) => {
  const bytes = Buffer.from(encoded.replace(/\s+/g, ''), 'base64');
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP') throw new Error(`${label} is not a valid WebP`);
  if (digest !== expectedSha) throw new Error(`${label} integrity mismatch: ${digest}`);
  return bytes;
};

for (const file of logoParts) if (!fs.existsSync(file)) throw new Error(`Missing logo source: ${path.basename(file)}`);
if (!fs.existsSync(heroSource)) throw new Error('Missing 4K Shin\'s House hero photo source');
const logoBytes = decodeWebp(logoParts.map((file) => fs.readFileSync(file,'utf8')).join(''), LOGO_SHA256, 'Logo');
const heroBytes = decodeWebp(fs.readFileSync(heroSource,'utf8'), HERO_SHA256, 'Hero photo');
fs.mkdirSync(assetsOut, { recursive:true });
fs.writeFileSync(path.join(assetsOut, logoFile), logoBytes);
fs.writeFileSync(path.join(assetsOut, heroFile), heroBytes);

const brandMarkup = `<a class="sh-brand-lockup" href="/" aria-label="Shin's House 홈"><img src="/assets/${logoFile}" width="320" height="107" decoding="async" alt="커피잔을 든 바리스타 강아지 마스코트와 Shin's House 로고"></a>`;
const navMarkup = `<nav class="sh-primary-nav" aria-label="주요 메뉴"><a href="/" data-sh-target="top">홈</a><a href="#coffee" data-sh-target="coffee">커피 구매</a><a href="#goods" data-sh-target="goods">굿즈 구매</a><a href="#store" data-sh-target="store">매장 안내</a></nav>`;
const heroMarkup = `<section class="sh-home-hero" id="sh-home-hero" aria-labelledby="sh-hero-title"><img class="sh-home-hero__image" src="/assets/${heroFile}" width="3840" height="2160" decoding="async" fetchpriority="high" alt="햇살이 들어오는 Shin's House 카페의 커피와 핸드드립 풍경"><div class="sh-home-hero__shade"></div><div class="sh-home-hero__content"><p class="sh-home-hero__eyebrow">SHIN'S HOUSE · GOOD COFFEE · BETTER DAYS</p><h1 id="sh-hero-title">좋은 커피가 만드는<br>조금 더 좋은 하루.</h1><p class="sh-home-hero__copy">매일 편안하게 마실 수 있는 커피와 오래 곁에 둘 오브젝트를 신스하우스에서 만나보세요.</p><div class="sh-home-hero__actions"><a href="#coffee" data-sh-target="coffee">커피 구매</a><a href="#goods" data-sh-target="goods">굿즈 보기</a></div></div></section>`;

const brandCss = `
/* Shin's House permanent header/hero replacement */
html{scroll-behavior:smooth}body{overflow-x:hidden}.sh-brand-lockup{display:inline-flex;align-items:center;justify-content:flex-start;flex:0 0 auto;width:220px;max-width:24vw;text-decoration:none!important;line-height:1}.sh-brand-lockup img{display:block;width:100%!important;height:auto!important;object-fit:contain;border:0}.sh-brand-lockup:hover{opacity:.93}.sh-brand-lockup:focus-visible{outline:2px solid #8b6848;outline-offset:5px;border-radius:8px}
header{width:100%!important;max-width:none!important;margin:0!important;border-left:0!important;border-right:0!important;padding-left:clamp(20px,3.6vw,72px)!important;padding-right:clamp(20px,3.6vw,72px)!important;box-sizing:border-box}.sh-primary-nav{display:flex;align-items:center;justify-content:center;gap:clamp(22px,3vw,52px);flex:1}.sh-primary-nav a{position:relative;padding:15px 1px 13px;color:inherit;text-decoration:none;white-space:nowrap;font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;font-size:14px;font-weight:650;letter-spacing:-.018em}.sh-primary-nav a::after{content:'';position:absolute;left:50%;right:50%;bottom:7px;height:1px;background:#7a5738;transition:left .2s ease,right .2s ease}.sh-primary-nav a:hover::after,.sh-primary-nav a:focus-visible::after{left:0;right:0}
.sh-home-hero{position:relative;width:100vw!important;max-width:none!important;height:min(76vh,920px);min-height:570px;margin:0 calc(50% - 50vw)!important;padding:0!important;border:0!important;border-radius:0!important;overflow:hidden;background:#19120c;color:#fff}.sh-home-hero__image{position:absolute;inset:0;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover;object-position:center;border:0!important;border-radius:0!important}.sh-home-hero__shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,11,7,.72) 0%,rgba(17,11,7,.42) 35%,rgba(17,11,7,.08) 66%,rgba(17,11,7,.02) 100%)}.sh-home-hero__content{position:relative;z-index:2;width:min(700px,82vw);padding:clamp(88px,12vh,150px) clamp(24px,7vw,138px);font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif}.sh-home-hero__eyebrow{margin:0 0 20px;color:#f1d7ac;font-size:12px;font-weight:700;letter-spacing:.22em}.sh-home-hero h1{margin:0;color:#fff;font-family:'Noto Serif KR','Iowan Old Style','Baskerville','Times New Roman',serif;font-size:clamp(45px,5vw,82px);font-weight:600;line-height:1.1;letter-spacing:-.048em;text-shadow:0 4px 28px rgba(0,0,0,.28)}.sh-home-hero__copy{max-width:570px;margin:26px 0 34px;color:rgba(255,255,255,.88);font-size:clamp(16px,1.25vw,19px);line-height:1.75;letter-spacing:-.02em}.sh-home-hero__actions{display:flex;gap:12px;flex-wrap:wrap}.sh-home-hero__actions a{display:inline-flex;align-items:center;justify-content:center;min-width:142px;padding:14px 23px;border:1px solid rgba(255,255,255,.78);border-radius:999px;color:#fff;text-decoration:none;font-size:14px;font-weight:700;transition:transform .2s ease,background .2s ease}.sh-home-hero__actions a:first-child{background:#f0e1cc;border-color:#f0e1cc;color:#25180f}.sh-home-hero__actions a:hover{transform:translateY(-2px)}.sh-toast{position:fixed;left:50%;bottom:32px;z-index:99999;transform:translate(-50%,16px);padding:12px 18px;border-radius:999px;background:rgba(20,16,13,.94);color:#fff;font:600 13px/1.4 Pretendard,'Noto Sans KR',sans-serif;opacity:0;pointer-events:none;transition:.2s}.sh-toast.is-show{opacity:1;transform:translate(-50%,0)}
@media(max-width:900px){.sh-brand-lockup{width:178px;max-width:30vw}.sh-primary-nav{gap:20px}.sh-home-hero{height:680px}.sh-home-hero__content{padding-top:110px}}@media(max-width:760px){header{padding-left:15px!important;padding-right:15px!important}.sh-brand-lockup{width:145px;max-width:42vw}.sh-primary-nav{justify-content:flex-start;gap:15px;overflow-x:auto;padding:0 5px;scrollbar-width:none}.sh-primary-nav::-webkit-scrollbar{display:none}.sh-primary-nav a{font-size:13px}.sh-home-hero{height:620px;min-height:540px}.sh-home-hero__shade{background:linear-gradient(90deg,rgba(17,11,7,.74),rgba(17,11,7,.25))}.sh-home-hero__content{width:auto;padding:92px 24px 44px}.sh-home-hero h1{font-size:clamp(39px,10.7vw,58px)}.sh-home-hero__copy{font-size:15px}}@media(max-width:430px){.sh-brand-lockup{width:128px}.sh-home-hero{height:590px}.sh-home-hero__content{padding-top:78px}}
`;

function replaceHeader(html) {
  let brandDone = false;
  return html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, (header) => {
    let next = header.replace(/\s*<a\s+class=["']sh-brand-lockup["'][\s\S]*?<\/a>\s*/gi, '\n');
    next = next.replace(/<a\b[^>]*>[\s\S]*?<img\b[^>]*(?:src|alt|class)=["'][^"']*(?:shin|logo|brand)[^"']*["'][^>]*>[\s\S]*?<\/a>/i, () => { brandDone=true; return brandMarkup; });
    if (!brandDone) next = next.replace(/<a\b[^>]*href=["']\/["'][^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/a>/i, () => { brandDone=true; return brandMarkup; });
    if (!brandDone) next = next.replace(/<header\b([^>]*)>/i, `<header$1>${brandMarkup}`);

    let navDone = false;
    next = next.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, (nav) => {
      if (navDone) return nav;
      const links = (nav.match(/<a\b/gi) || []).length;
      if (links < 3 || !/홈|커피|브랜드|정기|매장|이용|coffee|store|shop/i.test(nav)) return nav;
      navDone = true;
      return navMarkup;
    });
    if (!navDone) next = next.replace(/<\/header>/i, `${navMarkup}</header>`);
    return next;
  });
}

function removeElementAt(source, start) {
  const open = source.slice(start).match(/^<(section|div|main)\b[^>]*>/i);
  if (!open) return source;
  const tag = open[1];
  const token = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  token.lastIndex = start;
  let depth = 0, match;
  while ((match = token.exec(source))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return source.slice(0,start) + source.slice(token.lastIndex);
  }
  return source;
}

function replaceHero(html) {
  const existing = html.search(/<(?:section|div|main)\b[^>]*(?:class|id)=["'][^"']*sh-home-hero[^"']*["'][^>]*>/i);
  if (existing >= 0) html = removeElementAt(html, existing);
  const headerEnd = html.search(/<\/header>/i);
  if (headerEnd < 0) return html.replace(/<body\b([^>]*)>/i, `<body$1>${heroMarkup}`);
  const closeEnd = html.indexOf('>', headerEnd) + 1;
  const probe = html.slice(closeEnd, closeEnd + 9000);
  const legacy = probe.search(/<(?:section|div|main)\b[^>]*(?:class|id)=["'][^"']*(?:hero|visual|banner|slider|swiper|carousel)[^"']*["'][^>]*>/i);
  if (legacy >= 0) {
    const absolute = closeEnd + legacy;
    html = removeElementAt(html, absolute);
  }
  const newHeaderEnd = html.search(/<\/header>/i);
  const insertAt = html.indexOf('>', newHeaderEnd) + 1;
  return html.slice(0,insertAt) + heroMarkup + html.slice(insertAt);
}

for (const name of ['index.html','404.html']) {
  const file = path.join(out, name);
  let html = fs.readFileSync(file,'utf8');
  html = replaceHeader(html);
  html = replaceHero(html);
  html = html.replace(/shins-house-mascot-source\.webp|shins-house-logo-generated-v1\.webp|shins-house-logo(?:-premium-v2)?\.svg|shins-house-logo\.svg/g, logoFile);
  if (!/<script[^>]+src=["']\/?app\.js["']/i.test(html)) html = html.replace(/<\/body>/i, '<script src="/app.js" defer></script></body>');
  fs.writeFileSync(file, html, 'utf8');
}
fs.appendFileSync(path.join(out,'styles.css'), brandCss, 'utf8');
console.log(`Replaced legacy header/nav/hero with permanent Shin's House structure; hero ${heroBytes.length} bytes`);
