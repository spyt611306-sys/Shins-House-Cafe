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
const EXPECTED_SHA256 = 'bae8549f358b1438191be51b199d9b63866746463e8579275a4afe20a6a38ed7';
const heroSource = path.join(root, 'brand-source', 'shins-house-hero-4k.svg');
const heroFile = 'shins-house-hero-4k-v1.svg';

for (const file of sourceParts) if (!fs.existsSync(file)) throw new Error(`Missing generated logo source part: ${path.basename(file)}`);
const encoded = sourceParts.map((file) => fs.readFileSync(file, 'utf8').replace(/\s+/g, '')).join('');
const image = Buffer.from(encoded, 'base64');
const digest = crypto.createHash('sha256').update(image).digest('hex');
if (image.length < 12000 || image.toString('ascii',0,4) !== 'RIFF' || image.toString('ascii',8,12) !== 'WEBP') throw new Error('Generated Shin\'s House logo source is not a valid WebP');
if (digest !== EXPECTED_SHA256) throw new Error(`Generated logo integrity mismatch: ${digest}`);
if (!fs.existsSync(heroSource)) throw new Error('Missing Shin\'s House 4K hero artwork');

fs.mkdirSync(assetsOut, { recursive: true });
fs.writeFileSync(targetLogo, image);
fs.copyFileSync(heroSource, path.join(assetsOut, heroFile));

const brandMarkup = `<a class="sh-brand-lockup" href="/" aria-label="Shin's House 홈"><img src="/assets/${logoFile}" width="320" height="107" decoding="async" alt="커피잔을 든 바리스타 강아지 마스코트와 Shin's House 로고"></a>`;
const heroMarkup = `<section class="sh-home-hero" id="sh-home-hero" aria-label="Shin's House 메인 배너"><img class="sh-home-hero__image" src="/assets/${heroFile}" width="3840" height="2160" decoding="async" fetchpriority="high" alt="Shin's House의 로스팅과 핸드드립을 담은 프리미엄 커피 공간"></section>`;
const brandCss = `
/* Shin's House commercial header + clean image-only hero */
html{scroll-behavior:smooth}body{overflow-x:hidden}.sh-brand-lockup{display:inline-flex;align-items:center;justify-content:flex-start;flex:0 0 auto;width:220px;max-width:24vw;text-decoration:none!important;line-height:1}.sh-brand-lockup img{display:block;width:100%!important;height:auto!important;max-width:100%!important;border:0;object-fit:contain}.sh-brand-lockup:hover{opacity:.93}.sh-brand-lockup:focus-visible{outline:3px solid #b88b55;outline-offset:4px;border-radius:10px}
header{position:relative!important;inset:auto!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;z-index:10!important;max-width:none!important;width:100%!important;margin:0!important;border-left:0!important;border-right:0!important;padding-left:clamp(18px,3vw,56px)!important;padding-right:clamp(18px,3vw,56px)!important;box-sizing:border-box}.sh-primary-nav{display:flex!important;align-items:center;justify-content:center;gap:clamp(18px,2.4vw,42px);flex:1}.sh-primary-nav a{font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;font-size:14px;font-weight:650;letter-spacing:-.02em;color:inherit;text-decoration:none;white-space:nowrap;position:relative;padding:12px 2px}.sh-primary-nav a:after{content:'';position:absolute;left:50%;right:50%;bottom:5px;height:1.5px;background:#8a633e;transition:.22s}.sh-primary-nav a:hover:after,.sh-primary-nav a:focus-visible:after{left:0;right:0}
.sh-home-hero{position:relative!important;z-index:0!important;width:100vw;max-width:none!important;height:min(74vh,900px);min-height:560px;margin:0 calc(50% - 50vw)!important;padding:0!important;overflow:hidden;border:0!important;border-radius:0!important;background:#17100c;isolation:isolate}.sh-home-hero__image{position:relative!important;inset:auto!important;display:block;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover;object-position:center;border:0!important;border-radius:0!important;pointer-events:none}.sh-home-hero__shade,.sh-home-hero__content,.sh-home-hero__eyebrow,.sh-home-hero__copy,.sh-home-hero__actions{display:none!important}.sh-legacy-hero-hidden{display:none!important}.sh-toast{position:fixed;left:50%;bottom:34px;z-index:99999;transform:translate(-50%,18px);padding:12px 18px;border-radius:999px;background:rgba(20,16,13,.92);color:#fff;font:600 13px/1.4 Pretendard,'Noto Sans KR',sans-serif;opacity:0;pointer-events:none;transition:.22s}.sh-toast.is-show{opacity:1;transform:translate(-50%,0)}
@media(max-width:1100px){.sh-brand-lockup{width:196px;max-width:25vw}.sh-primary-nav{gap:22px}}@media(max-width:900px){.sh-brand-lockup{width:178px;max-width:29vw}.sh-home-hero{height:680px}}@media(max-width:760px){header{padding-left:16px!important;padding-right:16px!important}.sh-brand-lockup{width:150px;max-width:42vw}.sh-primary-nav{gap:14px;overflow-x:auto;justify-content:flex-start;padding:0 6px;scrollbar-width:none}.sh-primary-nav::-webkit-scrollbar{display:none}.sh-primary-nav a{font-size:13px}.sh-home-hero{height:640px;min-height:560px}}@media(max-width:430px){.sh-brand-lockup{width:132px;max-width:44vw}.sh-primary-nav{gap:12px}.sh-home-hero{height:600px}}
`;

const replaceHeaderBrand = (html) => {
  html = html.replace(/\s*<a\s+class=["']sh-brand-lockup["'][\s\S]*?<\/a>\s*/gi, '\n');
  let replaced = false;
  html = html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, (header) => {
    let next = header;
    next = next.replace(/<a\b[^>]*>[\s\S]*?<img\b[^>]*(?:src|alt|class)=["'][^"']*(?:shin|logo|brand)[^"']*["'][^>]*>[\s\S]*?<\/a>/i, () => { replaced = true; return brandMarkup; });
    if (!replaced) next = next.replace(/<a\b[^>]*href=["']\/["'][^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/a>/i, () => { replaced = true; return brandMarkup; });
    if (!replaced) next = next.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => { if (replaced) return anchor; if (!/Shin(?:'|’)?s\s*House|logo|brand|href=["'](?:\/|#top)["']/i.test(anchor)) return anchor; replaced = true; return brandMarkup; });
    if (!replaced) { next = next.replace(/<header\b([^>]*)>/i, `<header$1>${brandMarkup}`); replaced = true; }
    return next;
  });
  if (!replaced) html = html.replace(/<body\b([^>]*)>/i, `<body$1>${brandMarkup}`);
  return html;
};

for (const name of ['index.html','404.html']) {
  const file = path.join(out, name);
  let html = replaceHeaderBrand(fs.readFileSync(file, 'utf8'));
  html = html.replace(/<section\b[^>]*class=["'][^"']*sh-home-hero[^"']*["'][\s\S]*?<\/section>/gi, '');
  html = html.replace(/shins-house-mascot-source\.webp|shins-house-logo-generated-v1\.webp|shins-house-logo(?:-premium-v2)?\.svg|shins-house-logo\.svg/g, logoFile);
  html = html.replace(/<\/header>/i, `</header>${heroMarkup}`);
  if (!/<script[^>]+src=["']\/?app\.js["']/i.test(html)) html = html.replace(/<\/body>/i, '<script src="/app.js" defer></script></body>');
  fs.writeFileSync(file, html, 'utf8');
}

fs.appendFileSync(path.join(out, 'styles.css'), brandCss, 'utf8');
console.log(`Applied Shin's House clean image-only 4K hero (${image.length} logo bytes)`);
