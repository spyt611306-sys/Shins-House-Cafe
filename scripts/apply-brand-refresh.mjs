import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');
const sourceDir = path.join(root, 'brand-source');

const parts = Array.from({ length: 6 }, (_, index) =>
  path.join(sourceDir, `mascot-logo.part${String(index + 1).padStart(2, '0')}`)
);
const base64 = parts.map((file) => fs.readFileSync(file, 'utf8').trim()).join('');
const image = Buffer.from(base64, 'base64');

if (image.length < 10000 || image.toString('ascii', 0, 4) !== 'RIFF' || image.toString('ascii', 8, 12) !== 'WEBP') {
  throw new Error('Invalid Shin\'s House mascot WebP source');
}
fs.mkdirSync(assetsOut, { recursive: true });
fs.writeFileSync(path.join(assetsOut, 'shins-house-mascot-logo.webp'), image);

const brandMarkup = `<a class="sh-brand-lockup" href="/" aria-label="Shin's House 홈"><img src="/assets/shins-house-mascot-logo.webp" width="360" height="227" alt="커피잔을 든 강아지 Shin's House 마스코트와 로고"></a>`;
const brandCss = `\n/* Shin's House official mascot lockup */\n.sh-brand-lockup{position:fixed;top:14px;left:18px;z-index:9999;display:block;width:156px;filter:drop-shadow(0 5px 18px rgba(19,12,7,.18));transition:transform .2s ease,opacity .2s ease}.sh-brand-lockup:hover{transform:translateY(-1px)}.sh-brand-lockup img{display:block;width:100%;height:auto;border:0}.sh-brand-lockup:focus-visible{outline:3px solid #d6a968;outline-offset:4px;border-radius:12px}@media(max-width:760px){.sh-brand-lockup{top:10px;left:10px;width:112px}}@media(max-width:420px){.sh-brand-lockup{width:96px}}\n`;

for (const name of ['index.html', '404.html']) {
  const file = path.join(out, name);
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('class="sh-brand-lockup"')) {
    html = html.replace(/<body([^>]*)>/i, `<body$1>\n${brandMarkup}`);
    fs.writeFileSync(file, html, 'utf8');
  }
}
fs.appendFileSync(path.join(out, 'styles.css'), brandCss, 'utf8');
console.log(`Applied Shin's House official mascot brand asset (${image.length} bytes)`);
