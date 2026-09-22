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
const netlifyToml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
const logoFile = 'shins-house-logo-generated-v2.webp';

for (const forbidden of [
  'Loading v4.3','bundle-mini/','DecompressionStream','atob(',
  'sh-mascot-crop','sh-wordmark','shins-house-mascot-source.webp',
  '/assets/shins-house-logo.svg','/assets/shins-house-logo-premium-v2.svg',
  '/assets/shins-house-logo-generated-v1.webp'
]) assert.ok(!html.includes(forbidden), `production HTML must not contain legacy runtime/brand artifact: ${forbidden}`);

for (const expected of [
  '<meta name="description"','<link rel="canonical"','property="og:title"','application/ld+json',
  '/legal/terms','/legal/privacy','/legal/refund','class="sh-brand-lockup"',
  `/assets/${logoFile}`,"Shin's House"
]) assert.ok(html.includes(expected), `production HTML missing ${expected}`);

assert.match(netlifyToml, /command\s*=\s*["']npm run build["']/i, 'Netlify must run the full npm build so brand replacement is applied');
assert.match(html, /<header\b[^>]*>[\s\S]*?class=["']sh-brand-lockup["'][\s\S]*?<\/header>/i, 'generated logo must replace branding inside the header');
assert.ok(!/\.sh-brand-lockup\s*\{[^}]*position\s*:\s*fixed/i.test(css), 'brand lockup must replace the header logo, not use a fixed overlay');
assert.match(robots, /Sitemap:/, 'robots.txt must reference sitemap');
assert.match(sitemap, /<urlset/, 'sitemap.xml must be valid sitemap-shaped XML');

const brandAsset = path.join(dist, 'assets', logoFile);
assert.ok(fs.existsSync(brandAsset), 'generated logo asset must exist');
const bytes = fs.readFileSync(brandAsset);
assert.equal(bytes.length, 14418, 'generated logo asset byte size mismatch');
assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', 'generated logo must be WebP/RIFF');
assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', 'generated logo must be WebP');

const imgTags = html.match(/<img\b[^>]*>/gi) || [];
const missingAlt = imgTags.filter((tag) => !/\balt\s*=/.test(tag));
const missingDecoding = imgTags.filter((tag) => !/\bdecoding\s*=/.test(tag));
assert.equal(missingDecoding.length, 0, 'all images should opt into async decoding');

console.log(JSON.stringify({
  staticAudit: 'passed', images: imgTags.length, imagesMissingAlt: missingAlt.length,
  logoBytes: bytes.length, logoMode: 'generated-transparent-webp-v2-header-replacement',
  netlifyBuild: 'npm run build'
}, null, 2));
