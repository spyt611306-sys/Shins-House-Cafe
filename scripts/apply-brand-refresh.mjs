import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');
const sourceParts = [
  'shins-house-logo-generated-v2.part01',
  'shins-house-logo-generated-v2.part02'
].map((name) => path.join(root, 'brand-source', name));
const logoFile = 'shins-house-logo-generated-v2.webp';
const targetLogo = path.join(assetsOut, logoFile);
const EXPECTED_SHA256 = 'bae8549f358b1438191be51b199d9b63866746463e8579275a4afe20a6a38ed7';

for (const file of sourceParts) {
  if (!fs.existsSync(file)) throw new Error(`Missing generated logo source part: ${path.basename(file)}`);
}
const encoded = sourceParts.map((file) => fs.readFileSync(file, 'utf8').replace(/\s+/g, '')).join('');
const image = Buffer.from(encoded, 'base64');
const digest = crypto.createHash('sha256').update(image).digest('hex');
if (image.length < 12000 || image.toString('ascii', 0, 4) !== 'RIFF' || image.toString('ascii', 8, 12) !== 'WEBP') {
  throw new Error('Generated Shin\'s House logo source is not a valid WebP');
}
if (digest !== EXPECTED_SHA256) throw new Error(`Generated logo integrity mismatch: ${digest}`);

fs.mkdirSync(assetsOut, { recursive: true });
fs.writeFileSync(targetLogo, image);

const brandMarkup = `<a class="sh-brand-lockup" href="/" aria-label="Shin's House 홈"><img src="/assets/${logoFile}" width="320" height="107" decoding="async" alt="커피잔을 든 바리스타 강아지 마스코트와 Shin's House 로고"></a>`;
const brandCss = `\n/* Shin's House generated transparent logo — real header replacement */\n.sh-brand-lockup{display:inline-flex;align-items:center;justify-content:flex-start;flex:0 0 auto;width:220px;max-width:24vw;text-decoration:none!important;line-height:1}.sh-brand-lockup img{display:block;width:100%!important;height:auto!important;max-width:100%!important;border:0;object-fit:contain}.sh-brand-lockup:hover{opacity:.93}.sh-brand-lockup:focus-visible{outline:3px solid #b88b55;outline-offset:4px;border-radius:10px}@media(max-width:1100px){.sh-brand-lockup{width:196px;max-width:25vw}}@media(max-width:900px){.sh-brand-lockup{width:178px;max-width:29vw}}@media(max-width:760px){.sh-brand-lockup{width:160px;max-width:42vw}}@media(max-width:430px){.sh-brand-lockup{width:142px;max-width:46vw}}\n`;

const replaceHeaderBrand = (html) => {
  html = html.replace(/\s*<a\s+class=["']sh-brand-lockup["'][\s\S]*?<\/a>\s*/gi, '\n');
  let replaced = false;
  html = html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, (header) => {
    let next = header;
    next = next.replace(/<a\b[^>]*>[\s\S]*?<img\b[^>]*(?:src|alt|class)=["'][^"']*(?:shin|logo|brand)[^"']*["'][^>]*>[\s\S]*?<\/a>/i, () => {
      replaced = true;
      return brandMarkup;
    });
    if (!replaced) {
      next = next.replace(/<a\b[^>]*href=["']\/["'][^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/a>/i, () => {
        replaced = true;
        return brandMarkup;
      });
    }
    if (!replaced) {
      next = next.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => {
        if (replaced) return anchor;
        const looksLikeBrand = /Shin(?:'|’)?s\s*House|logo|brand/i.test(anchor) || /href=["'](?:\/|#top)["']/i.test(anchor);
        if (!looksLikeBrand) return anchor;
        replaced = true;
        return brandMarkup;
      });
    }
    if (!replaced) {
      next = next.replace(/<header\b([^>]*)>/i, `<header$1>${brandMarkup}`);
      replaced = true;
    }
    return next;
  });
  if (!replaced) html = html.replace(/<body\b([^>]*)>/i, `<body$1>${brandMarkup}`);
  return html;
};

for (const name of ['index.html', '404.html']) {
  const file = path.join(out, name);
  let html = replaceHeaderBrand(fs.readFileSync(file, 'utf8'));
  html = html
    .replace(/shins-house-mascot-source\.webp/g, logoFile)
    .replace(/shins-house-logo-generated-v1\.webp/g, logoFile)
    .replace(/shins-house-logo(?:-premium-v2)?\.svg/g, logoFile)
    .replace(/shins-house-logo\.svg/g, logoFile);
  fs.writeFileSync(file, html, 'utf8');
}

fs.appendFileSync(path.join(out, 'styles.css'), brandCss, 'utf8');
console.log(`Applied generated Shin's House transparent logo as ${logoFile} (${image.length} bytes)`);
