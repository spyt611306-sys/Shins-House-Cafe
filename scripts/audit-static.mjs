import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dist = path.join(root, 'dist');
const read = (name) => fs.readFileSync(path.join(dist, name), 'utf8');

for (const required of ['index.html','404.html','editorial.css','styles.css','shop.html','app.js','robots.txt','sitemap.xml']) {
  assert.ok(fs.existsSync(path.join(dist, required)), `${required} must exist`);
  assert.ok(fs.statSync(path.join(dist, required)).size > 0, `${required} must not be empty`);
}

const html = read('index.html');
const shop = read('shop.html');
const css = read('editorial.css');
const sitemap = read('sitemap.xml');
const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
const logoFile = 'shins-house-logo-generated-v2.webp';
const heroFile = 'shins-house-cafe-hero.webp';

for (const expected of [
  'class="sh-ref-header"','class="sh-editorial-home"','class="sh-hero-media"','class="sh-hero-image"',
  'STORY','COFFEE','SPACE','COMMUNITY','ONLINE STORE','/shop.html',
  `/assets/${logoFile}`,`/assets/${heroFile}`,'href="/editorial.css"'
]) assert.ok(html.includes(expected), `rebuilt homepage missing ${expected}`);

for (const forbidden of [
  'id="sh-original-shop"','class="sh-home-hero"','class="sh-hero-copy"','class="sh-brand-panel"',
  '좋은 커피가<br>좋은 하루를','shins-house-hero-4k-v1.svg','Loading v4.3','bundle-mini/','DecompressionStream','atob('
]) assert.ok(!body.includes(forbidden), `rebuilt homepage still contains legacy artifact ${forbidden}`);

assert.ok(body.length > 0, 'homepage body must exist');
assert.equal((body.match(/<main\b/gi) || []).length, 1, 'homepage must have exactly one main DOM');
assert.equal((body.match(/class="sh-editorial-home"/g) || []).length, 1, 'new homepage must exist exactly once');
assert.equal((body.match(/class="sh-hero-media"/g) || []).length, 1, 'cinematic hero must exist exactly once');
assert.ok(!/href=["'](?:\.\/)?styles\.css["']/i.test(html), 'homepage must not load legacy stylesheet');
assert.ok(/href=["'](?:\.\/)?styles\.css["']/i.test(shop), 'shop page must retain legacy commerce stylesheet');
assert.ok(css.includes('.sh-ref-header') && css.includes('.sh-hero-media') && css.includes('.sh-hero-image'), 'new stylesheet missing cinematic layout');
assert.ok(sitemap.includes('/shop.html'), 'sitemap must include commerce page');

const logoPath = path.join(dist, 'assets', logoFile);
const heroPath = path.join(dist, 'assets', heroFile);
for (const [label, file] of [['logo',logoPath],['hero',heroPath]]) {
  assert.ok(fs.existsSync(file), `${label} asset must exist`);
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString('ascii',0,4), 'RIFF', `${label} must be WebP`);
  assert.equal(bytes.toString('ascii',8,12), 'WEBP', `${label} must be WebP`);
}
assert.equal(fs.statSync(logoPath).size, 14418, 'preserved logo bytes changed unexpectedly');
assert.equal(fs.statSync(heroPath).size, 20970, 'hero bytes changed unexpectedly');

const images = body.match(/<img\b[^>]*>/gi) || [];
assert.equal(images.length, 2, 'homepage should contain only preserved header logo and cinematic hero image');
assert.equal(images.filter((tag) => !/\balt=/.test(tag)).length, 0, 'all homepage images need alt text');
assert.ok(body.includes('fetchpriority="high"'), 'hero image should be prioritized');

console.log(JSON.stringify({
  staticAudit:'passed',
  homepageMode:'full DOM rebuild',
  legacyHomepageVisible:false,
  hero:'cinematic cafe image',
  header:'transparent overlay navigation',
  commercePage:'/shop.html',
  logo:'preserved exact WebP'
}, null, 2));
