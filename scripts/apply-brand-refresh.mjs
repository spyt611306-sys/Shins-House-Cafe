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

for (const file of sourceParts) if (!fs.existsSync(file)) throw new Error(`Missing generated logo source part: ${path.basename(file)}`);
const encoded = sourceParts.map((file) => fs.readFileSync(file, 'utf8').replace(/\s+/g, '')).join('');
const image = Buffer.from(encoded, 'base64');
const digest = crypto.createHash('sha256').update(image).digest('hex');
if (image.length < 12000 || image.toString('ascii',0,4) !== 'RIFF' || image.toString('ascii',8,12) !== 'WEBP') throw new Error('Generated Shin\'s House logo source is not a valid WebP');
if (digest !== EXPECTED_SHA256) throw new Error(`Generated logo integrity mismatch: ${digest}`);

fs.mkdirSync(assetsOut, { recursive: true });
fs.writeFileSync(targetLogo, image);

const brandMarkup = `<a class="sh-brand-lockup" href="/" aria-label="Shin's House 홈"><img src="/assets/${logoFile}" width="320" height="107" decoding="async" alt="커피잔을 든 바리스타 강아지 마스코트와 Shin's House 로고"></a>`;
const brandCss = `
/* Shin's House header: banner removed completely */
html{scroll-behavior:smooth}body{overflow-x:hidden}.sh-brand-lockup{display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center;justify-content:flex-start;flex:0 0 auto;width:210px;max-width:24vw;text-decoration:none!important;line-height:1;position:relative!important;z-index:20!important}.sh-brand-lockup img{display:block!important;visibility:visible!important;opacity:1!important;width:100%!important;height:auto!important;max-width:100%!important;border:0;object-fit:contain}.sh-brand-lockup:hover{opacity:.93!important}.sh-brand-lockup:focus-visible{outline:3px solid #b88b55;outline-offset:4px;border-radius:10px}
header{position:relative!important;inset:auto!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;z-index:10!important;display:flex!important;align-items:center!important;gap:clamp(18px,2.4vw,40px)!important;min-height:84px!important;max-width:none!important;width:100%!important;margin:0!important;border-left:0!important;border-right:0!important;padding:10px clamp(18px,3vw,56px)!important;box-sizing:border-box;overflow:visible!important}.sh-primary-nav{display:flex!important;align-items:center;justify-content:center;gap:clamp(18px,2.4vw,42px);flex:1}.sh-primary-nav a{font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;font-size:14px;font-weight:650;letter-spacing:-.02em;color:inherit;text-decoration:none;white-space:nowrap;position:relative;padding:12px 2px}.sh-primary-nav a:after{content:'';position:absolute;left:50%;right:50%;bottom:5px;height:1.5px;background:#8a633e;transition:.22s}.sh-primary-nav a:hover:after,.sh-primary-nav a:focus-visible:after{left:0;right:0}
header + .sh-home-hero,header + [class*="hero"],header + [class*="banner"],header + [class*="visual"],header + [class*="slider"],header + [class*="swiper"],header + [class*="carousel"]{display:none!important}.sh-toast{position:fixed;left:50%;bottom:34px;z-index:99999;transform:translate(-50%,18px);padding:12px 18px;border-radius:999px;background:rgba(20,16,13,.92);color:#fff;font:600 13px/1.4 Pretendard,'Noto Sans KR',sans-serif;opacity:0;pointer-events:none;transition:.22s}.sh-toast.is-show{opacity:1;transform:translate(-50%,0)}
@media(max-width:1100px){.sh-brand-lockup{width:185px;max-width:25vw}.sh-primary-nav{gap:22px}}@media(max-width:760px){header{min-height:72px!important;padding:8px 14px!important;gap:12px!important}.sh-brand-lockup{width:132px;max-width:38vw}.sh-primary-nav{gap:14px;overflow-x:auto;justify-content:flex-start;padding:0 4px;scrollbar-width:none}.sh-primary-nav::-webkit-scrollbar{display:none}.sh-primary-nav a{font-size:13px}}@media(max-width:430px){.sh-brand-lockup{width:112px;max-width:34vw}.sh-primary-nav{gap:12px}.sh-primary-nav a{font-size:12px}}
`;

const replaceHeaderBrand = (html) => {
  html = html.replace(/\s*<a\s+class=["']sh-brand-lockup["'][\s\S]*?<\/a>\s*/gi, '\n');
  return html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, (header) => {
    let next = header;
    next = next.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => {
      if (!/<img\b/i.test(anchor)) return anchor;
      if (!/shins-house|shin(?:'|’)?s\s*house|logo|brand|mascot/i.test(anchor)) return anchor;
      return '';
    });
    return next.replace(/<header\b([^>]*)>/i, `<header$1>${brandMarkup}`);
  });
};

const removeElementAt = (source, start) => {
  const open = source.slice(start).match(/^<(section|div|main|aside)\b[^>]*>/i);
  if (!open) return source;
  const tag = open[1];
  const token = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(source))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return source.slice(0, start) + source.slice(token.lastIndex);
  }
  return source;
};

const removeTopBanner = (html) => {
  let match;
  while ((match = html.match(/<(?:section|div|main|aside)\b[^>]*class=["'][^"']*sh-home-hero[^"']*["'][^>]*>/i))) {
    html = removeElementAt(html, match.index);
  }
  const headerMatch = html.match(/<\/header\s*>/i);
  if (!headerMatch) return html;
  const headerEnd = headerMatch.index + headerMatch[0].length;
  const probe = html.slice(headerEnd, headerEnd + 6000);
  const legacy = probe.match(/<(?:section|div|main|aside)\b[^>]*(?:class|id)=["'][^"']*(?:hero|visual|banner|slider|swiper|carousel)[^"']*["'][^>]*>/i);
  if (legacy) html = removeElementAt(html, headerEnd + legacy.index);
  return html;
};

for (const name of ['index.html','404.html']) {
  const file = path.join(out, name);
  let html = fs.readFileSync(file, 'utf8');
  html = replaceHeaderBrand(html);
  html = removeTopBanner(html);
  html = html.replace(/shins-house-mascot-source\.webp|shins-house-logo-generated-v1\.webp|shins-house-logo(?:-premium-v2)?\.svg|shins-house-logo\.svg/g, logoFile);
  if (!/<script[^>]+src=["']\/?app\.js["']/i.test(html)) html = html.replace(/<\/body>/i, '<script src="/app.js" defer></script></body>');
  fs.writeFileSync(file, html, 'utf8');
}

fs.appendFileSync(path.join(out, 'styles.css'), brandCss, 'utf8');
console.log(`Removed homepage hero/banner completely and restored Shin's House header logo (${image.length} logo bytes)`);
