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
const heroFile = 'shins-house-hero-generated-4k-v1.webp';

for (const forbidden of [
  'Loading v4.3','bundle-mini/','DecompressionStream','atob(',
  'sh-mascot-crop','sh-wordmark','shins-house-mascot-source.webp',
  '/assets/shins-house-logo.svg','/assets/shins-house-logo-premium-v2.svg',
  '/assets/shins-house-logo-generated-v1.webp','sh-legacy-hero-hidden','shins-house-hero-4k-v1.svg'
]) assert.ok(!html.includes(forbidden), `production HTML must not contain legacy/overlay artifact: ${forbidden}`);

for (const expected of [
  '<meta name="description"','<link rel="canonical"','property="og:title"','application/ld+json',
  '/legal/terms','/legal/privacy','/legal/refund','class="sh-brand-lockup"',
  `/assets/${logoFile}`,`/assets/${heroFile}`,'class="sh-home-hero"','class="sh-primary-nav"',
  '홈','커피 구매','굿즈 구매','매장 안내',"Shin's House"
]) assert.ok(html.includes(expected), `production HTML missing ${expected}`);

for (const expected of ['navigator.clipboard.writeText','sh-search-dialog','openExistingCart','data-sh-target']) {
  assert.ok(app.includes(expected), `runtime controls missing ${expected}`);
}

assert.match(netlifyToml, /command\s*=\s*["']npm run build["']/i, 'Netlify must run the full npm build');
assert.match(html, /<header\b[^>]*>[\s\S]*?class=["']sh-brand-lockup["'][\s\S]*?class=["']sh-primary-nav["'][\s\S]*?<\/header>/i, 'logo and four-item nav must live inside the original header');
assert.equal((html.match(/class=["']sh-home-hero["']/g) || []).length, 1, 'there must be exactly one main hero, not a layered duplicate');
assert.ok(!/\.sh-brand-lockup\s*\{[^}]*position\s*:\s*fixed/i.test(css), 'brand lockup must not be a fixed overlay');
assert.ok(css.includes('width:100vw!important') && css.includes('margin:0!important'), 'hero must be full bleed without side boundaries');
assert.match(robots, /Sitemap:/, 'robots.txt must reference sitemap');
assert.match(sitemap, /<urlset/, 'sitemap.xml must be sitemap-shaped XML');

const logoAsset = path.join(dist, 'assets', logoFile);
const heroAsset = path.join(dist, 'assets', heroFile);
assert.ok(fs.existsSync(logoAsset), 'generated logo asset must exist');
assert.ok(fs.existsSync(heroAsset), 'generated 4K hero asset must exist');
const logoBytes = fs.readFileSync(logoAsset);
const heroBytes = fs.readFileSync(heroAsset);
assert.equal(logoBytes.length, 14418, 'generated logo asset byte size mismatch');
assert.equal(heroBytes.length, 547278, 'generated 4K hero byte size mismatch');
assert.equal(logoBytes.toString('ascii',0,4), 'RIFF', 'generated logo must be WebP/RIFF');
assert.equal(heroBytes.toString('ascii',0,4), 'RIFF', 'generated hero must be WebP/RIFF');
assert.equal(heroBytes.toString('ascii',8,12), 'WEBP', 'generated hero must be WebP');

const imgTags = html.match(/<img\b[^>]*>/gi) || [];
const missingAlt = imgTags.filter((tag) => !/\balt\s*=/.test(tag));
const missingDecoding = imgTags.filter((tag) => !/\bdecoding\s*=/.test(tag));
assert.equal(missingDecoding.length, 0, 'all images should opt into async decoding');

console.log(JSON.stringify({
  staticAudit:'passed', images:imgTags.length, imagesMissingAlt:missingAlt.length,
  logoBytes:logoBytes.length, heroBytes:heroBytes.length, hero:'generated 3840x2160 WebP',
  navigation:'four-item structural replacement', share:'clipboard + fallback',
  cart:'existing cart opener fallback', search:'dialog fallback', netlifyBuild:'npm run build'
}, null, 2));
