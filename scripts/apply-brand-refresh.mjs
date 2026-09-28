import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');
const homepage = path.join(root, 'homepage');

// The bundle-mini payload is kept only as a historical build input. Nothing from
// its legacy consumer storefront is allowed to survive in the final deployment.
for (const legacyFile of ['styles.css', 'app.js', 'shop-runtime.js']) {
  fs.rmSync(path.join(out, legacyFile), { force: true });
}

// Remove stale legacy product/hero assets so old cached screens cannot be linked
// from the current deployment, then rebuild the public asset set from homepage/.
fs.rmSync(assetsOut, { recursive: true, force: true });
fs.mkdirSync(assetsOut, { recursive: true });
for (const file of fs.readdirSync(path.join(homepage, 'assets'))) {
  if (!/^[a-z0-9-]+\.webp\.b64$/.test(file)) continue;
  const bytes = Buffer.from(fs.readFileSync(path.join(homepage, 'assets', file), 'utf8'), 'base64');
  fs.writeFileSync(path.join(assetsOut, file.slice(0, -4)), bytes);
}

for (const file of ['index.html', 'editorial.css', 'home.js', 'shop.html', 'cart.css', 'cart.js']) {
  fs.copyFileSync(path.join(homepage, file), path.join(out, file));
}

const siteUrl = String(process.env.SITE_URL || process.env.URL || 'https://shinshouse.netlify.app').replace(/\/$/, '');
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
if (!html.includes('rel="canonical"')) {
  html = html.replace('</head>', `<link rel="canonical" href="${siteUrl}/"><meta property="og:title" content="Shin's House"><meta property="og:description" content="직접 고르고 직접 볶는 신스하우스 로스터리"><meta property="og:url" content="${siteUrl}/"></head>`);
}
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, '404.html'), html);

let shop = fs.readFileSync(path.join(out, 'shop.html'), 'utf8');
if (!shop.includes('rel="canonical"')) {
  shop = shop.replace('</head>', `<link rel="canonical" href="${siteUrl}/shop.html"></head>`);
}
fs.writeFileSync(path.join(out, 'shop.html'), shop);

fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}/</loc></url><url><loc>${siteUrl}/shop.html</loc></url><url><loc>${siteUrl}/legal/terms</loc></url><url><loc>${siteUrl}/legal/privacy</loc></url><url><loc>${siteUrl}/legal/refund</loc></url></urlset>\n`, 'utf8');

console.log('Published clean Shin’s House homepage + current cart/store; legacy storefront removed.');
