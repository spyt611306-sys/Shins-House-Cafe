import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');

const logoParts = ['shins-house-logo-generated-v2.part01','shins-house-logo-generated-v2.part02']
  .map((name) => path.join(root, 'brand-source', name));
const logoFile = 'shins-house-logo-generated-v2.webp';
const logoTarget = path.join(assetsOut, logoFile);
const LOGO_SHA256 = 'bae8549f358b1438191be51b199d9b63866746463e8579275a4afe20a6a38ed7';

const heroSource = path.join(root, 'brand-source', 'shins-house-hero-generated-4k-v1.webp');
const heroFile = 'shins-house-hero-generated-4k-v1.webp';
const heroTarget = path.join(assetsOut, heroFile);
const HERO_SHA256 = 'cd443f622f126915e1e3bd20ad7360ae5160a5de6bf96b84bcd25ca4b611464b';

for (const file of logoParts) {
  if (!fs.existsSync(file)) throw new Error(`Missing generated logo source part: ${path.basename(file)}`);
}
const logoEncoded = logoParts.map((file) => fs.readFileSync(file, 'utf8').replace(/\s+/g, '')).join('');
const logoImage = Buffer.from(logoEncoded, 'base64');
const logoDigest = crypto.createHash('sha256').update(logoImage).digest('hex');
if (logoDigest !== LOGO_SHA256) throw new Error(`Generated logo integrity mismatch: ${logoDigest}`);
if (logoImage.toString('ascii',0,4) !== 'RIFF' || logoImage.toString('ascii',8,12) !== 'WEBP') throw new Error('Generated logo is not WebP');

if (!fs.existsSync(heroSource)) throw new Error('Missing generated 4K Shin\'s House hero image');
const heroImage = fs.readFileSync(heroSource);
const heroDigest = crypto.createHash('sha256').update(heroImage).digest('hex');
if (heroDigest !== HERO_SHA256) throw new Error(`Generated hero integrity mismatch: ${heroDigest}`);
if (heroImage.toString('ascii',0,4) !== 'RIFF' || heroImage.toString('ascii',8,12) !== 'WEBP') throw new Error('Generated hero is not WebP');

fs.mkdirSync(assetsOut, { recursive: true });
fs.writeFileSync(logoTarget, logoImage);
fs.writeFileSync(heroTarget, heroImage);

const brandMarkup = `<a class="sh-brand-lockup" href="/" aria-label="Shin's House 홈"><img src="/assets/${logoFile}" width="320" height="107" decoding="async" alt="커피잔을 든 바리스타 강아지와 Shin's House 로고"></a>`;
const navMarkup = `<nav class="sh-primary-nav" aria-label="주요 메뉴"><a href="/" data-sh-target="top">홈</a><a href="#coffee" data-sh-target="coffee">커피 구매</a><a href="#goods" data-sh-target="goods">굿즈 구매</a><a href="#store" data-sh-target="store">매장 안내</a></nav>`;
const heroMarkup = `<section class="sh-home-hero" id="sh-home-hero" aria-labelledby="sh-hero-title"><img class="sh-home-hero__image" src="/assets/${heroFile}" width="3840" height="2160" decoding="async" fetchpriority="high" alt="햇살이 드는 Shin's House 카페와 핸드드립 커피"><div class="sh-home-hero__overlay"><p class="sh-home-hero__eyebrow">SHIN'S HOUSE · COFFEE & OBJECTS</p><h1 id="sh-hero-title">좋은 커피가 만드는<br>조금 더 좋은 하루.</h1><p class="sh-home-hero__copy">천천히 고른 원두와 정성스러운 한 잔. Shin's House의 커피를 만나보세요.</p><div class="sh-home-hero__actions"><a href="#coffee" data-sh-target="coffee">커피 구매</a><a href="#goods" data-sh-target="goods">굿즈 보기</a></div></div></section>`;

const css = `
/* Shin's House structural home refresh — replaces original elements, no overlay patch */
html{scroll-behavior:smooth}html,body{margin:0!important;padding:0!important;overflow-x:hidden}body{border:0!important}.sh-brand-lockup{display:inline-flex;align-items:center;justify-content:flex-start;flex:0 0 auto;width:220px;max-width:24vw;text-decoration:none!important;line-height:1}.sh-brand-lockup img{display:block;width:100%!important;height:auto!important;max-width:100%!important;border:0;object-fit:contain}.sh-brand-lockup:hover{opacity:.93}.sh-brand-lockup:focus-visible{outline:3px solid #9f7649;outline-offset:4px;border-radius:10px}
header{box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;border-left:0!important;border-right:0!important;padding-left:clamp(18px,3vw,56px)!important;padding-right:clamp(18px,3vw,56px)!important}.sh-primary-nav{display:flex!important;align-items:center;justify-content:center;gap:clamp(20px,2.6vw,46px);flex:1;margin:0 auto}.sh-primary-nav a{position:relative;padding:14px 2px 12px;color:inherit;text-decoration:none;white-space:nowrap;font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',Arial,sans-serif;font-size:14px;font-weight:650;letter-spacing:-.025em}.sh-primary-nav a::after{content:'';position:absolute;left:50%;right:50%;bottom:5px;height:1px;background:#8b633c;transition:left .2s ease,right .2s ease}.sh-primary-nav a:hover::after,.sh-primary-nav a:focus-visible::after{left:0;right:0}
.sh-home-hero{position:relative;width:100vw!important;max-width:none!important;height:min(76vh,900px);min-height:570px;margin:0!important;border:0!important;border-radius:0!important;overflow:hidden;background:#17110c;color:#fff}.sh-home-hero__image{display:block;position:absolute;inset:0;width:100%!important;height:100%!important;object-fit:cover;object-position:center;border:0!important;border-radius:0!important}.sh-home-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,11,7,.68) 0%,rgba(17,11,7,.42) 34%,rgba(17,11,7,.08) 66%,rgba(17,11,7,0) 100%)}.sh-home-hero__overlay{position:absolute;z-index:2;left:clamp(28px,6.5vw,124px);bottom:clamp(44px,9vh,110px);width:min(620px,78vw);padding:0;font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif}.sh-home-hero__eyebrow{margin:0 0 18px;font-size:12px;font-weight:700;letter-spacing:.22em;color:#efd6ad}.sh-home-hero h1{margin:0;font-family:'Noto Serif KR','Iowan Old Style','Baskerville','Times New Roman',serif;font-size:clamp(42px,4.5vw,72px);font-weight:600;line-height:1.13;letter-spacing:-.045em;text-shadow:0 3px 24px rgba(0,0,0,.28)}.sh-home-hero__copy{max-width:530px;margin:22px 0 30px;font-size:clamp(15px,1.15vw,18px);line-height:1.75;color:rgba(255,255,255,.88);letter-spacing:-.02em}.sh-home-hero__actions{display:flex;gap:12px;flex-wrap:wrap}.sh-home-hero__actions a{display:inline-flex;align-items:center;justify-content:center;min-width:136px;padding:14px 22px;border:1px solid rgba(255,255,255,.72);border-radius:999px;color:#fff;text-decoration:none;font-size:14px;font-weight:700;backdrop-filter:blur(7px);transition:transform .18s ease,background .18s ease}.sh-home-hero__actions a:first-child{background:#f2e5d1;border-color:#f2e5d1;color:#21150e}.sh-home-hero__actions a:hover{transform:translateY(-2px)}
.sh-toast{position:fixed;left:50%;bottom:34px;z-index:99999;transform:translate(-50%,16px);padding:12px 18px;border-radius:999px;background:rgba(22,17,13,.94);color:#fff;font:600 13px/1.4 Pretendard,'Noto Sans KR',sans-serif;opacity:0;pointer-events:none;transition:.2s}.sh-toast.is-show{opacity:1;transform:translate(-50%,0)}#sh-search-dialog{border:0;border-radius:20px;padding:0;box-shadow:0 25px 80px rgba(0,0,0,.25)}#sh-search-dialog::backdrop{background:rgba(0,0,0,.44)}.sh-search-panel{min-width:min(520px,86vw);padding:28px;background:#f6f1e8;color:#2b2119}.sh-search-panel label{display:block;margin-bottom:14px;font:700 18px/1.3 Pretendard,'Noto Sans KR',sans-serif}.sh-search-panel div{display:flex;gap:8px}.sh-search-panel input{flex:1;min-width:0;padding:13px 15px;border:1px solid #cbbda8;border-radius:12px;background:#fff}.sh-search-panel button{padding:12px 18px;border:0;border-radius:12px;background:#263a2e;color:#fff;font-weight:700}.sh-search-close{float:right!important;background:transparent!important;color:#2b2119!important;font-size:20px!important;padding:0!important}.sh-search-help{margin:12px 0 0;font-size:12px;opacity:.68}
@media(max-width:1100px){.sh-brand-lockup{width:194px;max-width:25vw}.sh-primary-nav{gap:22px}}@media(max-width:820px){header{padding-left:14px!important;padding-right:14px!important}.sh-brand-lockup{width:158px;max-width:38vw}.sh-primary-nav{justify-content:flex-start;gap:15px;overflow-x:auto;scrollbar-width:none}.sh-primary-nav::-webkit-scrollbar{display:none}.sh-primary-nav a{font-size:13px}.sh-home-hero{height:660px;min-height:540px}.sh-home-hero::after{background:linear-gradient(90deg,rgba(17,11,7,.7),rgba(17,11,7,.26))}.sh-home-hero__overlay{left:24px;bottom:52px}.sh-home-hero h1{font-size:clamp(38px,10vw,56px)}}@media(max-width:430px){.sh-brand-lockup{width:130px}.sh-primary-nav{gap:12px}.sh-home-hero{height:590px;min-height:520px}.sh-home-hero__overlay{left:20px;bottom:40px;width:calc(100vw - 40px)}.sh-home-hero__copy{font-size:14px}.sh-home-hero__actions a{min-width:118px;padding:12px 18px}}
`;

const findMatchingElementEnd = (html, start, tagName) => {
  const re = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = re.exec(html))) {
    const isClose = /^<\//.test(match[0]);
    const selfClosing = /\/>$/.test(match[0]);
    if (!isClose && !selfClosing) depth++;
    if (isClose) depth--;
    if (depth === 0) return re.lastIndex;
  }
  return -1;
};

const replaceHeader = (html) => {
  return html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, (header) => {
    let next = header;
    next = next.replace(/\s*<a\s+class=["']sh-brand-lockup["'][\s\S]*?<\/a>\s*/gi, '\n');

    let brandDone = false;
    next = next.replace(/<a\b[^>]*>[\s\S]*?<img\b[^>]*(?:src|alt|class)=["'][^"']*(?:shin|logo|brand)[^"']*["'][^>]*>[\s\S]*?<\/a>/i, () => { brandDone = true; return brandMarkup; });
    if (!brandDone) next = next.replace(/<a\b[^>]*href=["']\/["'][^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/a>/i, () => { brandDone = true; return brandMarkup; });
    if (!brandDone) next = next.replace(/<header\b([^>]*)>/i, `<header$1>${brandMarkup}`);

    let navDone = false;
    next = next.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, (nav) => {
      if (navDone) return nav;
      const links = (nav.match(/<a\b/gi) || []).length;
      const text = nav.replace(/<[^>]+>/g, ' ');
      if (links < 3 && !/홈|커피|브랜드|정기|매장|이용|coffee|store/i.test(text)) return nav;
      navDone = true;
      return navMarkup;
    });
    if (!navDone) throw new Error('Could not locate the original primary navigation; refusing to layer a second menu');
    return next;
  });
};

const replaceExistingHero = (html) => {
  const headerClose = html.search(/<\/header>/i);
  const from = headerClose >= 0 ? headerClose : 0;
  const openTag = /<(section|div)\b[^>]*(?:class|id)=["'][^"']*(?:hero|visual|banner|slider|swiper|carousel|main[-_ ]?visual|key[-_ ]?visual|\bkv\b)[^"']*["'][^>]*>/ig;
  openTag.lastIndex = from;
  let match;
  while ((match = openTag.exec(html))) {
    if (/sh-home-hero/i.test(match[0])) continue;
    const tagName = match[1];
    const end = findMatchingElementEnd(html, match.index, tagName);
    if (end < 0) continue;
    return html.slice(0, match.index) + heroMarkup + html.slice(end);
  }
  throw new Error('Could not locate the original main hero/banner; refusing to append a second hero');
};

for (const name of ['index.html','404.html']) {
  const file = path.join(out, name);
  let html = fs.readFileSync(file, 'utf8');
  html = replaceHeader(html);
  html = replaceExistingHero(html);
  html = html.replace(/shins-house-mascot-source\.webp|shins-house-logo-generated-v1\.webp|shins-house-logo(?:-premium-v2)?\.svg|shins-house-logo\.svg/g, logoFile);
  if (!/<script[^>]+src=["']\/?app\.js["']/i.test(html)) html = html.replace(/<\/body>/i, '<script src="/app.js" defer></script></body>');
  fs.writeFileSync(file, html, 'utf8');
}

fs.appendFileSync(path.join(out, 'styles.css'), css, 'utf8');
console.log(`Replaced original header/nav/hero with Shin's House production UI; hero ${heroImage.length} bytes`);
