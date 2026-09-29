import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');
const homepage = path.join(root, 'homepage');
const brandSource = path.join(root, 'brand-source');

for (const legacyFile of ['styles.css', 'app.js', 'shop-runtime.js']) fs.rmSync(path.join(out, legacyFile), { force: true });

fs.rmSync(assetsOut, { recursive: true, force: true });
fs.mkdirSync(assetsOut, { recursive: true });
for (const file of fs.readdirSync(path.join(homepage, 'assets'))) {
  if (!/^[a-z0-9-]+\.webp\.b64$/.test(file)) continue;
  const bytes = Buffer.from(fs.readFileSync(path.join(homepage, 'assets', file), 'utf8'), 'base64');
  fs.writeFileSync(path.join(assetsOut, file.slice(0, -4)), bytes);
}

const alternateHeroParts = ['hero-cafe-v2.part01', 'hero-cafe-v2.part02', 'hero-cafe-v2.part03'];
const alternateHeroBase64 = alternateHeroParts.map(file => fs.readFileSync(path.join(brandSource, file), 'utf8').trim()).join('');
const alternateHeroBytes = Buffer.from(alternateHeroBase64, 'base64');
if (alternateHeroBytes.length < 12000 || alternateHeroBytes.subarray(0, 4).toString('ascii') !== 'RIFF' || alternateHeroBytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('Alternate Shin’s House hero artwork is invalid.');
}
fs.writeFileSync(path.join(assetsOut, 'hero-cafe-v2.webp'), alternateHeroBytes);

for (const file of ['index.html','editorial.css','experience.css','home.js','experience.js','media.js','shop.html','cart.css','cart.js','order-followup.js','admin.html','admin.css','admin-inventory.css','admin.js']) {
  fs.copyFileSync(path.join(homepage, file), path.join(out, file));
}

let experience = fs.readFileSync(path.join(out, 'experience.js'), 'utf8');
experience = experience.replace("secondary.src = '/assets/hero-20260928.webp';", "secondary.src = '/assets/hero-cafe-v2.webp';");
fs.writeFileSync(path.join(out, 'experience.js'), experience);

const siteUrl = String(process.env.SITE_URL || process.env.URL || 'https://shinshouse.netlify.app').replace(/\/$/, '');
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
if (!html.includes('rel="canonical"')) html = html.replace('</head>', `<link rel="canonical" href="${siteUrl}/"><meta property="og:title" content="Shin's House"><meta property="og:description" content="직접 고르고 직접 볶는 신스하우스 로스터리"><meta property="og:url" content="${siteUrl}/"></head>`);
if (!html.includes('/experience.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/experience.css"></head>');
if (!html.includes('/media.js')) html = html.replace('</body>', '<script src="/media.js" defer></script></body>');
if (!html.includes('/experience.js')) html = html.replace('</body>', '<script src="/experience.js" defer></script></body>');
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, '404.html'), html);

let shop = fs.readFileSync(path.join(out, 'shop.html'), 'utf8');
if (!shop.includes('rel="canonical"')) shop = shop.replace('</head>', `<link rel="canonical" href="${siteUrl}/shop.html"></head>`);
if (!shop.includes('/media.js')) shop = shop.replace('</body>', '<script src="/media.js" defer></script></body>');
if (!shop.includes('/order-followup.js')) shop = shop.replace('</body>', '<script src="/order-followup.js" defer></script></body>');
fs.writeFileSync(path.join(out, 'shop.html'), shop);

fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin.html\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}/</loc></url><url><loc>${siteUrl}/shop.html</loc></url><url><loc>${siteUrl}/legal/terms</loc></url><url><loc>${siteUrl}/legal/privacy</loc></url><url><loc>${siteUrl}/legal/refund</loc></url></urlset>\n`, 'utf8');

console.log('Published Shin’s House homepage, live ordering, taste finder, rotating hero and inventory admin dashboard.');
