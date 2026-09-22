import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dist = path.join(root, 'dist');
const read = (name) => fs.readFileSync(path.join(dist, name), 'utf8');

for (const required of ['index.html','styles.css','robots.txt','sitemap.xml','404.html','app.js']) {
  assert.ok(fs.existsSync(path.join(dist, required)), `${required} must exist in dist`);
  assert.ok(fs.statSync(path.join(dist, required)).size > 0, `${required} must not be empty`);
}

const html = read('index.html');
const css = read('styles.css');
const app = read('app.js');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');
const netlifyToml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
const logoFile = 'shins-house-logo-generated-v2.webp';
const heroFile = 'shins-house-hero-4k-v1.svg';

for (const forbidden of [
  'Loading v4.3','bundle-mini/','DecompressionStream','atob(',
  'sh-mascot-crop','sh-wordmark','shins-house-mascot-source.webp',
  '/assets/shins-house-logo.svg','/assets/shins-house-logo-premium-v2.svg',
  '/assets/shins-house-logo-generated-v1.webp',
  'sh-home-hero__shade','sh-home-hero__content','sh-home-hero__actions','sh-home-hero__eyebrow','sh-home-hero__copy'
]) assert.ok(!html.includes(forbidden), `production HTML must not contain legacy/overlay artifact: ${forbidden}`);

for (const expected of [
  '<meta name="description"','<link rel="canonical"','property="og:title"','application/ld+json',
  '/legal/terms','/legal/privacy','/legal/refund','class="sh-brand-lockup"',
  `/assets/${logoFile}`,`/assets/${heroFile}`,'class="sh-home-hero"',"Shin's House"
]) assert.ok(html.includes(expected), `production HTML missing ${expected}`);

for (const expected of [
  '커피 구매','굿즈 구매','매장 안내','navigator.clipboard?.writeText','sh-primary-nav','sh-search-dialog',
  "control.closest('#sh-search-dialog')","form.addEventListener('submit'",'class="sh-search-close"','scrollMarginTop'
]) assert.ok(app.includes(expected), `runtime UI missing ${expected}`);
assert.ok(!app.includes('method="dialog"'), 'search form must not rely on dialog form submission semantics');
assert.match(app, /sh-search-close[\s\S]*type=\"button\"|type=\"button\"[\s\S]*sh-search-close/, 'search close control must be a non-submit button');

assert.match(netlifyToml, /command\s*=\s*["']npm run build["']/i, 'Netlify must run the full npm build');
assert.match(html, /<header\b[^>]*>[\s\S]*?class=["']sh-brand-lockup["'][\s\S]*?<\/header>/i, 'generated logo must replace branding inside the header');
assert.match(html, /<\/header>\s*<section[^>]+class=["']sh-home-hero["'][^>]*>\s*<img[^>]+class=["']sh-home-hero__image["'][^>]*>\s*<\/section>/i, 'hero must be image-only and directly below header');
assert.ok(!/\.sh-brand-lockup\s*\{[^}]*position\s*:\s*fixed/i.test(css), 'brand lockup must not be a fixed overlay');
assert.match(css, /header\{[^}]*position:relative!important[^}]*inset:auto!important/i, 'header must not overlay the hero');
assert.ok(css.includes('width:100vw') && css.includes('calc(50% - 50vw)'), 'hero must render full bleed without left/right page boundaries');
assert.match(robots, /Sitemap:/, 'robots.txt must reference sitemap');
assert.match(sitemap, /<urlset/, 'sitemap.xml must be valid sitemap-shaped XML');

const brandAsset = path.join(dist, 'assets', logoFile);
const heroAsset = path.join(dist, 'assets', heroFile);
assert.ok(fs.existsSync(brandAsset), 'generated logo asset must exist');
assert.ok(fs.existsSync(heroAsset), '4K hero asset must exist');
const logoBytes = fs.readFileSync(brandAsset);
const heroSvg = fs.readFileSync(heroAsset, 'utf8');
assert.equal(logoBytes.length, 14418, 'generated logo asset byte size mismatch');
assert.equal(logoBytes.toString('ascii',0,4), 'RIFF', 'generated logo must be WebP/RIFF');
assert.equal(logoBytes.toString('ascii',8,12), 'WEBP', 'generated logo must be WebP');
assert.ok(heroSvg.includes('viewBox="0 0 3840 2160"'), 'hero artwork must be 4K 3840x2160');

const imgTags = html.match(/<img\b[^>]*>/gi) || [];
const missingAlt = imgTags.filter((tag) => !/\balt\s*=/.test(tag));
const missingDecoding = imgTags.filter((tag) => !/\bdecoding\s*=/.test(tag));
assert.equal(missingDecoding.length, 0, 'all images should opt into async decoding');

console.log(JSON.stringify({
  staticAudit:'passed', images:imgTags.length, imagesMissingAlt:missingAlt.length,
  logoBytes:logoBytes.length, hero:'3840x2160 SVG image-only', navigation:'separate header menu',
  heroOverlay:'removed', headerOverlap:'prevented', share:'clipboard + fallback', search:'dialog submit/close guarded', netlifyBuild:'npm run build'
}, null, 2));
