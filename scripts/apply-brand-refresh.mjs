import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
// Keep the existing commerce document, then replace the homepage in full.
const legacy = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const runtimeStart = legacy.indexOf("<script>'use strict';const $ =");
if (runtimeStart < 0) throw new Error('Expected legacy runtime boundary not found');
const shop = legacy.slice(0, runtimeStart).replace('<script src="app.js"></script>', '') + '<script src="/shop-runtime.js" defer></script></body></html>';
fs.copyFileSync(path.join(root, 'homepage', 'shop-runtime.js'), path.join(out, 'shop-runtime.js'));
const cartBridge = `<script>document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('open')==='cart')document.querySelector('.cart-trigger')?.click()});</script>`;
fs.writeFileSync(path.join(out, 'shop.html'), shop.replace('</body>', `${cartBridge}</body>`));
for (const file of fs.readdirSync(path.join(root, 'homepage', 'assets'))) {
  if (!/^[a-z0-9-]+\.webp\.b64$/.test(file)) continue;
  const bytes = Buffer.from(fs.readFileSync(path.join(root, 'homepage', 'assets', file), 'utf8'), 'base64');
  fs.writeFileSync(path.join(out, 'assets', file.slice(0, -4)), bytes);
}
for (const file of ['index.html', 'editorial.css', 'home.js']) fs.copyFileSync(path.join(root, 'homepage', file), path.join(out, file));
const siteUrl = String(process.env.SITE_URL || process.env.URL || 'https://shinshouse.netlify.app').replace(/\/$/, '');
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace('</head>', `<link rel="canonical" href="${siteUrl}/"><meta property="og:title" content="Shin's House"><meta property="og:description" content="신스하우스의 커피와 공간"><meta property="og:url" content="${siteUrl}/"></head>`);
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, '404.html'), html);
let sitemap = fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8');
if (!sitemap.includes('/shop.html')) sitemap = sitemap.replace('</urlset>', `<url><loc>${siteUrl}/shop.html</loc></url></urlset>`);
fs.writeFileSync(path.join(out, 'sitemap.xml'), sitemap);
console.log('Replaced homepage with supplied hero, transparent header and six Library drink cutouts.');
