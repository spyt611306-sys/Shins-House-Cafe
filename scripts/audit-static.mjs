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
const css = read('styles.css');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');

for (const forbidden of ['Loading v4.3','bundle-mini/','DecompressionStream','atob(','sh-mascot-crop','sh-wordmark','shins-house-mascot-source.webp']) {
  assert.ok(!html.includes(forbidden), `production HTML must not contain legacy runtime/brand artifact: ${forbidden}`);
}

for (const expected of [
  '<meta name="description"', '<link rel="canonical"', 'property="og:title"', 'application/ld+json',
  '/legal/terms', '/legal/privacy', '/legal/refund', 'class="sh-brand-lockup"',
  '/assets/shins-house-logo.svg', "Shin's House"
]) assert.ok(html.includes(expected), `production HTML missing ${expected}`);

assert.match(html, /<header\b[^>]*>[\s\S]*?class=["']sh-brand-lockup["'][\s\S]*?<\/header>/i, 'new SVG logo must replace branding inside the header');
assert.ok(!/\.sh-brand-lockup\s*\{[^}]*position\s*:\s*fixed/i.test(css), 'brand lockup must replace the header logo, not use a fixed overlay');
assert.match(robots, /Sitemap:/, 'robots.txt must reference sitemap');
assert.match(sitemap, /<urlset/, 'sitemap.xml must be valid sitemap-shaped XML');
assert.ok(fs.existsSync(path.join(dist, 'assets')), 'assets directory must exist');
const assets = fs.readdirSync(path.join(dist, 'assets')).filter((name) => fs.statSync(path.join(dist, 'assets', name)).isFile());
assert.ok(assets.length >= 10, `expected at least 10 static assets, found ${assets.length}`);

const brandAsset = path.join(dist, 'assets', 'shins-house-logo.svg');
assert.ok(fs.existsSync(brandAsset), 'new SVG logo asset must exist');
const brandSvg = fs.readFileSync(brandAsset, 'utf8');
assert.ok(brandSvg.length > 4000, 'new SVG logo asset is unexpectedly small');
assert.ok(brandSvg.includes("SHIN'S HOUSE"), 'new SVG must contain the Shin\'s House wordmark');
assert.ok(brandSvg.includes('coffee cup'), 'new SVG must describe the coffee-holding mascot');

const imgTags = html.match(/<img\b[^>]*>/gi) || [];
const missingAlt = imgTags.filter((tag) => !/\balt\s*=/.test(tag));
const missingDecoding = imgTags.filter((tag) => !/\bdecoding\s*=/.test(tag) && !/shins-house-logo\.svg/.test(tag));
assert.equal(missingDecoding.length, 0, 'all content images should opt into async decoding');

const forms = html.match(/<form\b[^>]*>/gi) || [];
const buttons = html.match(/<button\b[^>]*>/gi) || [];
console.log(JSON.stringify({
  staticAudit: 'passed', assets: assets.length, images: imgTags.length,
  imagesMissingAlt: missingAlt.length, logoCharacters: brandSvg.length,
  brandMode: 'new-svg-header-replacement', forms: forms.length, buttons: buttons.length,
  note: missingAlt.length ? 'Missing alt text remains a launch accessibility task.' : 'Image alt coverage detected.'
}, null, 2));
