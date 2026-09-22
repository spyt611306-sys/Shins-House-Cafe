import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');

const logoParts = ['shins-house-logo-generated-v2.part01','shins-house-logo-generated-v2.part02'].map((name) => path.join(root, 'brand-source', name));
const heroParts = ['shins-house-hero-photo-v2.part01','shins-house-hero-photo-v2.part02','shins-house-hero-photo-v2.part03'].map((name) => path.join(root, 'brand-source', name));
const logoFile = 'shins-house-logo-generated-v2.webp';
const heroFile = 'shins-house-cafe-main-4k-v2.webp';
const EXPECTED_LOGO_SHA256 = 'bae8549f358b1438191be51b199d9b63866746463e8579275a4afe20a6a38ed7';

const decodeWebpParts = (parts, label) => {
  for (const file of parts) if (!fs.existsSync(file)) throw new Error(`Missing ${label} source: ${path.basename(file)}`);
  const encoded = parts.map((file) => fs.readFileSync(file, 'utf8').replace(/\s+/g, '')).join('');
  const image = Buffer.from(encoded, 'base64');
  if (image.length < 12000 || image.toString('ascii',0,4) !== 'RIFF' || image.toString('ascii',8,12) !== 'WEBP') throw new Error(`${label} is not a valid WebP`);
  return image;
};

const logoImage = decodeWebpParts(logoParts, 'logo');
const logoDigest = crypto.createHash('sha256').update(logoImage).digest('hex');
if (logoDigest !== EXPECTED_LOGO_SHA256) throw new Error(`Generated logo integrity mismatch: ${logoDigest}`);
const heroImage = decodeWebpParts(heroParts, '4K cafe hero');

fs.mkdirSync(assetsOut, { recursive: true });
fs.writeFileSync(path.join(assetsOut, logoFile), logoImage);
fs.writeFileSync(path.join(assetsOut, heroFile), heroImage);

const brandMarkup = `<a class="sh-brand-lockup" href="/" aria-label="Shin's House 홈"><img src="/assets/${logoFile}" width="320" height="107" decoding="async" alt="커피잔을 든 바리스타 강아지 마스코트와 Shin's House 로고"></a>`;
const navMarkup = `<nav class="sh-primary-nav" aria-label="주요 메뉴"><a href="/" data-sh-target="top">홈</a><a href="#coffee" data-sh-target="coffee">커피 구매</a><a href="#goods" data-sh-target="goods">굿즈 구매</a><a href="#store" data-sh-target="store">매장 안내</a></nav>`;
const heroMarkup = `<section class="sh-home-hero" id="sh-home-hero" aria-labelledby="sh-hero-title"><img class="sh-home-hero__image" src="/assets/${heroFile}" width="3840" height="2160" decoding="async" fetchpriority="high" alt="햇살이 들어오는 Shin's House 카페와 핸드드립 커피"><div class="sh-home-hero__shade"></div><div class="sh-home-hero__content"><p class="sh-home-hero__eyebrow">SHIN'S HOUSE · GOOD COFFEE, BETTER DAYS</p><h1 id="sh-hero-title">좋은 커피가 만드는<br>조금 더 좋은 하루.</h1><p class="sh-home-hero__copy">원두의 향, 따뜻한 공간, 천천히 내려지는 한 잔까지. 신스하우스가 좋아하는 커피의 시간을 담았습니다.</p><div class="sh-home-hero__actions"><a href="#coffee" data-sh-target="coffee">커피 구매</a><a href="#goods" data-sh-target="goods">굿즈 보기</a></div></div></section>`;

const css = `
/* Shin's House header / hero replacement v8 — not overlay */
html{scroll-behavior:smooth}body{overflow-x:hidden}header{width:100%!important;max-width:none!important;margin:0!important;border-left:0!important;border-right:0!important;box-sizing:border-box;padding-left:clamp(18px,3vw,56px)!important;padding-right:clamp(18px,3vw,56px)!important}.sh-brand-lockup{display:inline-flex;align-items:center;flex:0 0 auto;width:210px;max-width:23vw;text-decoration:none!important;line-height:1}.sh-brand-lockup img{display:block;width:100%!important;height:auto!important;object-fit:contain;border:0}.sh-primary-nav{display:flex!important;align-items:center;justify-content:center;gap:clamp(20px,2.4vw,44px);flex:1}.sh-primary-nav a{font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;font-size:14px;font-weight:650;letter-spacing:-.025em;color:inherit;text-decoration:none;white-space:nowrap;padding:13px 2px;position:relative}.sh-primary-nav a:after{content:'';position:absolute;left:50%;right:50%;bottom:5px;height:1.5px;background:#8a633e;transition:.2s}.sh-primary-nav a:hover:after,.sh-primary-nav a:focus-visible:after{left:0;right:0}
.sh-home-hero{position:relative;width:100vw!important;max-width:none!important;height:min(76vh,920px);min-height:590px;margin:0 calc(50% - 50vw)!important;border:0!important;border-radius:0!important;overflow:hidden;background:#1a130f;color:#fff}.sh-home-hero__image{position:absolute;inset:0;width:100%!important;height:100%!important;object-fit:cover;object-position:center;border:0!important;border-radius:0!important}.sh-home-hero__shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,12,8,.72) 0%,rgba(20,12,8,.48) 34%,rgba(20,12,8,.11) 66%,rgba(20,12,8,.04) 100%)}.sh-home-hero__content{position:relative;z-index:2;width:min(720px,84vw);padding:clamp(96px,12vh,154px) clamp(24px,7vw,136px);font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif}.sh-home-hero__eyebrow{margin:0 0 22px;font-size:12px;font-weight:700;letter-spacing:.22em;color:#ead1a4}.sh-home-hero h1{margin:0;font-family:'Noto Serif KR','Iowan Old Style','Baskerville','Times New Roman',serif;font-size:clamp(42px,5vw,78px);font-weight:600;line-height:1.12;letter-spacing:-.045em;text-shadow:0 4px 28px rgba(0,0,0,.25)}.sh-home-hero__copy{max-width:600px;margin:26px 0 36px;font-size:clamp(16px,1.25vw,20px);line-height:1.75;letter-spacing:-.02em;color:rgba(255,255,255,.86)}.sh-home-hero__actions{display:flex;gap:12px;flex-wrap:wrap}.sh-home-hero__actions a{display:inline-flex;align-items:center;justify-content:center;min-width:146px;padding:15px 24px;border-radius:999px;border:1px solid rgba(255,255,255,.74);color:#fff;text-decoration:none;font-size:14px;font-weight:700;transition:.2s}.sh-home-hero__actions a:first-child{background:#f1e5d2;border-color:#f1e5d2;color:#26180f}.sh-home-hero__actions a:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.2)}.sh-toast{position:fixed;left:50%;bottom:32px;z-index:99999;transform:translate(-50%,16px);padding:12px 18px;border-radius:999px;background:rgba(20,16,13,.94);color:#fff;font:600 13px/1.4 Pretendard,'Noto Sans KR',sans-serif;opacity:0;pointer-events:none;transition:.2s}.sh-toast.is-show{opacity:1;transform:translate(-50%,0)}
@media(max-width:900px){.sh-brand-lockup{width:172px;max-width:29vw}.sh-primary-nav{gap:20px}.sh-home-hero{height:690px}.sh-home-hero__content{padding-top:112px}}@media(max-width:760px){header{padding-left:14px!important;padding-right:14px!important}.sh-brand-lockup{width:145px;max-width:40vw}.sh-primary-nav{gap:14px;justify-content:flex-start;overflow-x:auto;scrollbar-width:none}.sh-primary-nav::-webkit-scrollbar{display:none}.sh-primary-nav a{font-size:13px}.sh-home-hero{height:630px;min-height:560px}.sh-home-hero__content{width:auto;padding:90px 24px 46px}.sh-home-hero h1{font-size:clamp(39px,10.5vw,58px)}.sh-home-hero__copy{font-size:15px}.sh-home-hero__shade{background:linear-gradient(90deg,rgba(20,12,8,.75),rgba(20,12,8,.3))}}@media(max-width:430px){.sh-brand-lockup{width:128px}.sh-home-hero{height:590px}.sh-home-hero__content{padding-top:76px}}
`;

const replaceHeader = (html) => html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, (header) => {
  let next = header;
  next = next.replace(/\s*<a\s+class=["']sh-brand-lockup["'][\s\S]*?<\/a>\s*/gi, '');
  let brandReplaced = false;
  next = next.replace(/<a\b[^>]*>[\s\S]*?<img\b[^>]*(?:src|alt|class)=["'][^"']*(?:shin|logo|brand)[^"']*["'][^>]*>[\s\S]*?<\/a>/i, () => { brandReplaced = true; return brandMarkup; });
  if (!brandReplaced) next = next.replace(/<a\b[^>]*href=["']\/["'][^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/a>/i, () => { brandReplaced = true; return brandMarkup; });
  if (!brandReplaced) next = next.replace(/<header\b([^>]*)>/i, `<header$1>${brandMarkup}`);

  let navReplaced = false;
  next = next.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/i, () => { navReplaced = true; return navMarkup; });
  if (!navReplaced) next = next.replace(/<header\b([^>]*)>/i, `<header$1>${navMarkup}`);
  return next;
});

const removeLegacyHero = (html) => {
  html = html.replace(/<section\b[^>]*class=["'][^"']*sh-home-hero[^"']*["'][\s\S]*?<\/section>/gi, '');
  const headerEnd = html.search(/<\/header>/i);
  if (headerEnd < 0) return html;
  const before = html.slice(0, headerEnd + html.slice(headerEnd).match(/<\/header>/i)[0].length);
  let after = html.slice(before.length);
  const legacy = /^(\s*)(<(section|div)\b[^>]*(?:class|id)=["'][^"']*(?:hero|visual|banner|slider|swiper|carousel)[^"']*["'][^>]*>[\s\S]*?<\/\3>)/i;
  if (legacy.test(after)) after = after.replace(legacy, '$1');
  return before + after;
};

for (const name of ['index.html','404.html']) {
  const file = path.join(out, name);
  let html = fs.readFileSync(file, 'utf8');
  html = replaceHeader(html);
  html = removeLegacyHero(html);
  html = html.replace(/shins-house-mascot-source\.webp|shins-house-logo-generated-v1\.webp|shins-house-logo(?:-premium-v2)?\.svg|shins-house-logo\.svg/g, logoFile);
  html = html.replace(/<\/header>/i, `</header>${heroMarkup}`);
  if (!/<script[^>]+src=["']\/?app\.js["']/i.test(html)) html = html.replace(/<\/body>/i, '<script src="/app.js" defer></script></body>');
  fs.writeFileSync(file, html, 'utf8');
}
fs.appendFileSync(path.join(out, 'styles.css'), css, 'utf8');
console.log(`Replaced original header/nav/hero with static production structure (${heroImage.length} hero bytes)`);
