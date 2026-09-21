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
fs.writeFileSync(path.join(assetsOut, 'shins-house-mascot-source.webp'), image);

const brandMarkup = `<a class="sh-brand-lockup" href="/" aria-label="Shin's House 홈"><span class="sh-mascot-crop" aria-hidden="true"><img src="/assets/shins-house-mascot-source.webp" alt=""></span><span class="sh-wordmark"><strong>Shin's House</strong><small>GOOD COFFEE · BETTER DAYS</small></span></a>`;
const brandCss = `\n/* Shin's House official brand replacement: mascot only + new wordmark */\n.sh-brand-lockup{display:inline-flex;align-items:center;gap:10px;flex:0 0 auto;text-decoration:none!important;color:#2d2118!important;line-height:1;min-width:max-content}.sh-mascot-crop{position:relative;display:block;width:74px;height:54px;overflow:hidden;flex:0 0 74px;border-radius:28px;background:#f4ecd2;box-shadow:0 2px 12px rgba(35,24,15,.10)}.sh-mascot-crop img{position:absolute!important;z-index:1;width:124px!important;height:auto!important;max-width:none!important;left:-25px!important;top:0!important;display:block!important}.sh-mascot-crop:before,.sh-mascot-crop:after{content:'';position:absolute;z-index:2;top:33px;height:19px;background:#f4ecd2;pointer-events:none}.sh-mascot-crop:before{left:0;width:17px}.sh-mascot-crop:after{right:0;width:18px}.sh-wordmark{display:flex;flex-direction:column;gap:7px}.sh-wordmark strong{font-family:Georgia,'Times New Roman',serif;font-size:29px;font-weight:700;letter-spacing:-1.1px;white-space:nowrap}.sh-wordmark small{font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:2.6px;color:#7a5c43;white-space:nowrap}.sh-brand-lockup:hover .sh-wordmark strong{color:#6f492f}.sh-brand-lockup:focus-visible{outline:3px solid #c9955f;outline-offset:5px;border-radius:10px}@media(max-width:760px){.sh-brand-lockup{gap:7px}.sh-mascot-crop{width:58px;height:43px;flex-basis:58px;border-radius:22px}.sh-mascot-crop img{width:98px!important;left:-20px!important}.sh-mascot-crop:before,.sh-mascot-crop:after{top:26px;height:15px}.sh-mascot-crop:before{width:13px}.sh-mascot-crop:after{width:14px}.sh-wordmark strong{font-size:22px;letter-spacing:-.8px}.sh-wordmark small{font-size:7px;letter-spacing:1.7px}}@media(max-width:420px){.sh-mascot-crop{width:50px;height:38px;flex-basis:50px;border-radius:19px}.sh-mascot-crop img{width:85px!important;left:-17px!important}.sh-mascot-crop:before,.sh-mascot-crop:after{top:22px;height:14px}.sh-mascot-crop:before{width:11px}.sh-mascot-crop:after{width:12px}.sh-wordmark strong{font-size:19px}.sh-wordmark small{font-size:6.2px;letter-spacing:1.35px}}\n`;

const replaceHeaderBrand = (html) => {
  // Remove the previous injected lockup entirely. The new identity replaces the real header brand slot.
  html = html.replace(/\s*<a\s+class=["']sh-brand-lockup["'][\s\S]*?<\/a>\s*/gi, '\n');
  let replaced = false;
  html = html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, (header) => {
    let next = header.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => {
      if (replaced) return anchor;
      const looksLikeBrand = /Shin(?:'|’)?s\s*House|logo|brand/i.test(anchor) || /href=["'](?:\/|#top)["']/i.test(anchor);
      if (!looksLikeBrand) return anchor;
      replaced = true;
      return brandMarkup;
    });
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
  const html = replaceHeaderBrand(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, html, 'utf8');
}
fs.appendFileSync(path.join(out, 'styles.css'), brandCss, 'utf8');
console.log(`Replaced Shin's House header identity with cleaned mascot + new wordmark (${image.length} bytes)`);
