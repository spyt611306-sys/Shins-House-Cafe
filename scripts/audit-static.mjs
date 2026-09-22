import crypto from 'node:crypto';
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
const heroFile = 'shins-house-hero-photo-v5.webp';

for (const forbidden of [
  'Loading v4.3','bundle-mini/','DecompressionStream','atob(',
  'sh-mascot-crop','sh-wordmark','shins-house-mascot-source.webp',
  '/assets/shins-house-logo.svg','/assets/shins-house-logo-premium-v2.svg',
  '/assets/shins-house-logo-generated-v1.webp','sh-legacy-hero-hidden'
]) assert.ok(!html.includes(forbidden), `production HTML contains legacy artifact: ${forbidden}`);

for (const expected of [
  '<meta name="description"','<link rel="canonical"','property="og:title"','application/ld+json',
  '/legal/terms','/legal/privacy','/legal/refund','class="sh-brand-lockup"',
  `src="/assets/${logoFile}"`,`src="/assets/${heroFile}"`,'class="sh-home-hero"',
  'class="sh-primary-nav"','홈','커피 구매','굿즈 구매','매장 안내','width="3840"','height="2160"'
]) assert.ok(html.includes(expected), `production HTML missing ${expected}`);

const header = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0] || '';
assert.ok(header, 'header must exist');
for (const oldMenu of ['브랜드 이야기','정기구독','이용 안내']) assert.ok(!header.includes(oldMenu), `legacy menu remains: ${oldMenu}`);
const nav = header.match(/<nav\b[^>]*class=["'][^"']*sh-primary-nav[^"']*["'][\s\S]*?<\/nav>/i)?.[0] || '';
assert.equal((nav.match(/<a\b/gi) || []).length, 4, 'primary navigation must contain exactly four links');
assert.match(html, /<\/header>\s*<section[^>]+class=["'][^"']*sh-home-hero[^"']*["']/i, 'photo hero must be directly below header');
assert.equal((html.match(/class=["'][^"']*sh-home-hero[^"']*["']/gi) || []).length, 1, 'only one home hero may exist');

assert.match(netlifyToml, /command\s*=\s*["']npm run build["']/i, 'Netlify must run full npm build');
assert.ok(css.includes('width:100vw') && css.includes('calc(50% - 50vw)'), 'hero must be full bleed');
assert.ok(!/\.sh-brand-lockup\s*\{[^}]*position\s*:\s*fixed/i.test(css), 'brand must not be a fixed overlay');
assert.ok(!app.includes('nav.innerHTML'), 'navigation must not be rewritten at runtime');
assert.ok(!app.includes('sh-legacy-hero-hidden'), 'legacy hero must not be hidden at runtime');
for (const expected of ['navigator.clipboard.writeText','sh-search-dialog','data-sh-target']) assert.ok(app.includes(expected), `button runtime missing ${expected}`);
assert.match(robots, /Sitemap:/, 'robots.txt must reference sitemap');
assert.match(sitemap, /<urlset/, 'sitemap.xml must be sitemap XML');

const logoBytes = fs.readFileSync(path.join(dist,'assets',logoFile));
assert.equal(logoBytes.length, 14418, 'logo byte size mismatch');
assert.equal(logoBytes.toString('ascii',0,4), 'RIFF');
assert.equal(logoBytes.toString('ascii',8,12), 'WEBP');

const heroBytes = fs.readFileSync(path.join(dist,'assets',heroFile));
assert.equal(heroBytes.length, 383632, '4K hero byte size mismatch');
assert.equal(heroBytes.toString('ascii',0,4), 'RIFF', 'hero must be WebP/RIFF');
assert.equal(heroBytes.toString('ascii',8,12), 'WEBP', 'hero must be WebP');
assert.equal(crypto.createHash('sha256').update(heroBytes).digest('hex'), '6de432122e49b163b7683d4ea14f8f30c8ef30160319c55fe7ef4447ffb071ef', 'hero image integrity mismatch');

const imgTags = html.match(/<img\b[^>]*>/gi) || [];
assert.equal(imgTags.filter((tag) => !/\bdecoding\s*=/.test(tag)).length, 0, 'all images should use async decoding');
console.log(JSON.stringify({
  staticAudit:'passed', navigation:'4 static links', hero:'3840x2160 attached cafe WebP',
  heroBytes:heroBytes.length, heroSha256:'6de432122e49...', replacementMode:'build-time DOM replacement',
  share:'clipboard + fallback', search:'dialog fallback', netlifyBuild:'npm run build'
}, null, 2));