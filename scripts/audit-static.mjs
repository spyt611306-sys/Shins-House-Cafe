import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dist = path.join(root, 'dist');
const read = (name) => fs.readFileSync(path.join(dist, name), 'utf8');

for (const required of ['index.html','styles.css','robots.txt','sitemap.xml','404.html']) {
  assert.ok(fs.existsSync(path.join(dist, required)), `${required} must exist in dist`);
  assert.ok(fs.statSync(path.join(dist, required)).size > 0, `${required} must not be empty`);
}

const html = read('index.html');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');

for (const forbidden of ['Loading v4.3','bundle-mini/','DecompressionStream','atob(']) {
  assert.ok(!html.includes(forbidden), `production HTML must not contain legacy runtime loader: ${forbidden}`);
}

for (const expected of [
  '<meta name="description"',
  '<link rel="canonical"',
  'property="og:title"',
  'application/ld+json',
  '/legal/terms',
  '/legal/privacy',
  '/legal/refund',
  'class="sh-brand-lockup"',
  '/assets/shins-house-mascot-logo.webp'
]) assert.ok(html.includes(expected), `production HTML missing ${expected}`);

assert.match(robots, /Sitemap:/, 'robots.txt must reference sitemap');
assert.match(sitemap, /<urlset/, 'sitemap.xml must be valid sitemap-shaped XML');
assert.ok(fs.existsSync(path.join(dist, 'assets')), 'assets directory must exist');
const assets = fs.readdirSync(path.join(dist, 'assets')).filter((name) => fs.statSync(path.join(dist, 'assets', name)).isFile());
assert.ok(assets.length >= 10, `expected at least 10 static assets, found ${assets.length}`);
const brandAsset = path.join(dist, 'assets', 'shins-house-mascot-logo.webp');
assert.ok(fs.existsSync(brandAsset), 'official mascot logo asset must exist');
assert.ok(fs.statSync(brandAsset).size > 10000, 'official mascot logo asset is unexpectedly small');

const imgTags = html.match(/<img\b[^>]*>/gi) || [];
const missingAlt = imgTags.filter((tag) => !/\balt\s*=/.test(tag));
const missingDecoding = imgTags.filter((tag) => !/\bdecoding\s*=/.test(tag) && !/shins-house-mascot-logo/.test(tag));
assert.equal(missingDecoding.length, 0, 'all content images should opt into async decoding');

const forms = html.match(/<form\b[^>]*>/gi) || [];
const buttons = html.match(/<button\b[^>]*>/gi) || [];
console.log(JSON.stringify({
  staticAudit: 'passed',
  assets: assets.length,
  images: imgTags.length,
  imagesMissingAlt: missingAlt.length,
  mascotBrandAsset: fs.statSync(brandAsset).size,
  forms: forms.length,
  buttons: buttons.length,
  note: missingAlt.length ? 'Missing alt text remains a launch accessibility task.' : 'Image alt coverage detected.'
}, null, 2));
