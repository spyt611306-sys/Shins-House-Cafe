import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');
const sourceSvg = path.join(root, 'brand-source', 'shins-house-logo.svg');
const targetSvg = path.join(assetsOut, 'shins-house-logo.svg');

if (!fs.existsSync(sourceSvg)) throw new Error('Missing new Shin\'s House logo source');
const svg = fs.readFileSync(sourceSvg, 'utf8');
if (!svg.includes("SHIN'S HOUSE") || !svg.includes('coffee cup') || !svg.includes('<svg')) {
  throw new Error('Invalid Shin\'s House logo SVG source');
}

fs.mkdirSync(assetsOut, { recursive: true });
fs.writeFileSync(targetSvg, svg, 'utf8');

const brandMarkup = `<a class="sh-brand-lockup" href="/" aria-label="Shin's House 홈"><img src="/assets/shins-house-logo.svg" width="920" height="260" alt="커피를 든 바리스타 강아지 마스코트와 Shin's House 로고"></a>`;
const brandCss = `\n/* Shin's House premium logo replacement */\n.sh-brand-lockup{display:inline-flex;align-items:center;flex:0 0 auto;width:min(390px,36vw);text-decoration:none!important;line-height:1}.sh-brand-lockup img{display:block;width:100%!important;height:auto!important;max-width:100%!important;border:0}.sh-brand-lockup:hover{opacity:.92}.sh-brand-lockup:focus-visible{outline:3px solid #b88b55;outline-offset:5px;border-radius:10px}@media(max-width:900px){.sh-brand-lockup{width:min(320px,42vw)}}@media(max-width:760px){.sh-brand-lockup{width:230px;max-width:62vw}}@media(max-width:430px){.sh-brand-lockup{width:196px;max-width:66vw}}\n`;

const logSourceDiagnostics = (html) => {
  const header = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0] || 'NO_HEADER';
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const sources = [...html.matchAll(/(?:src|poster|data-src)=["'][^"']+["']/gi)].map((m) => m[0]);
  console.log('BRAND_DIAG_HEADER_START');
  console.log(header.slice(0, 12000));
  console.log('BRAND_DIAG_HEADER_END');
  console.log('BRAND_DIAG_IMAGE_TAGS=' + JSON.stringify(images.slice(0, 80)));
  console.log('BRAND_DIAG_SOURCES=' + JSON.stringify(sources.slice(0, 120)));
};

const replaceHeaderBrand = (html) => {
  html = html.replace(/\s*<a\s+class=["']sh-brand-lockup["'][\s\S]*?<\/a>\s*/gi, '\n');
  let replaced = false;
  html = html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, (header) => {
    const next = header.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => {
      if (replaced) return anchor;
      const looksLikeBrand = /Shin(?:'|’)?s\s*House|logo|brand/i.test(anchor) || /href=["'](?:\/|#top)["']/i.test(anchor);
      if (!looksLikeBrand) return anchor;
      replaced = true;
      return brandMarkup;
    });
    if (replaced) return next;
    replaced = true;
    return next.replace(/<header\b([^>]*)>/i, `<header$1>${brandMarkup}`);
  });
  if (!replaced) html = html.replace(/<body\b([^>]*)>/i, `<body$1>${brandMarkup}`);
  return html;
};

for (const name of ['index.html', '404.html']) {
  const file = path.join(out, name);
  const sourceHtml = fs.readFileSync(file, 'utf8');
  if (name === 'index.html') logSourceDiagnostics(sourceHtml);
  let html = replaceHeaderBrand(sourceHtml);
  html = html.replace(/shins-house-mascot-source\.webp/g, 'shins-house-logo.svg');
  fs.writeFileSync(file, html, 'utf8');
}

fs.appendFileSync(path.join(out, 'styles.css'), brandCss, 'utf8');
console.log(`Applied completely redesigned Shin's House SVG logo (${svg.length} chars)`);
