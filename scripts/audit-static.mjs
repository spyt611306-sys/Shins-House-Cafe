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
const app = read('app.js');
const sitemap = read('sitemap.xml');
const netlifyToml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
const logoFile = 'shins-house-logo-generated-v2.webp';
const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';

for (const expected of [
  'class="sh-ref-header"','class="sh-ref-brand"','class="sh-editorial-home"',
  '좋은 커피가','OUR STORY','COFFEE NOTES','SPACE · BUSAN','COMMUNITY',
  'ONLINE STORE','/shop.html',`/assets/${logoFile}`,'href="/editorial.css"'
]) assert.ok(html.includes(expected), `replacement homepage missing ${expected}`);

for (const forbidden of [
  'id="sh-original-shop"','class="sh-home-hero"','shins-house-hero-4k-v1.svg',
  'Loading v4.3','bundle-mini/','DecompressionStream','atob(',
  'class="sh-hero-photo"','class="sh-film"','class="sh-blob"','class="sh-dessert-visual"','class="sh-store-photo"','class="sh-photo"'
]) assert.ok(!body.includes(forbidden), `replacement homepage body still contains legacy/photo artifact ${forbidden}`);

assert.ok(body.length > 0, 'homepage body must exist');
assert.equal((body.match(/<main\b/gi) || []).length, 1, 'homepage body must have exactly one main DOM');
assert.equal((body.match(/class="sh-editorial-home"/g) || []).length, 1, 'editorial homepage must exist exactly once in body');
assert.ok(!/href=["'](?:\.\/)?styles\.css["']/i.test(html), 'homepage must not load legacy visual stylesheet');
assert.ok(/href=["'](?:\.\/)?styles\.css["']/i.test(shop), 'separate shop page must retain legacy commerce stylesheet');
assert.ok(css.includes('.sh-ref-header') && css.includes('.sh-editorial-home') && css.includes('.sh-brand-panel'), 'editorial stylesheet missing core layout');
assert.ok(app.includes("version: '5.1.0-home-replacement'"), 'runtime version must match replacement build');
assert.ok(body.includes('ONLINE STORE') && body.includes('href="/shop.html"'), 'online store must route to separated commerce page');
assert.ok(sitemap.includes('/shop.html'), 'sitemap must include separated shop page');
assert.match(netlifyToml, /command\s*=\s*["']npm run build["']/i, 'Netlify must run full build');

const logoPath = path.join(dist, 'assets', logoFile);
assert.ok(fs.existsSync(logoPath), 'preserved Shin\'s House logo must exist');
const logo = fs.readFileSync(logoPath);
assert.equal(logo.length, 14418, 'logo byte size changed unexpectedly');
assert.equal(logo.toString('ascii',0,4), 'RIFF', 'logo must remain WebP');
assert.equal(logo.toString('ascii',8,12), 'WEBP', 'logo must remain WebP');

const images = body.match(/<img\b[^>]*>/gi) || [];
assert.equal(images.length, 1, 'homepage must contain only the preserved header logo image');
assert.ok(images[0].includes(`/assets/${logoFile}`), 'the only homepage image must be the preserved logo');
assert.equal(images.filter((tag) => !/\balt=/.test(tag)).length, 0, 'all homepage images need alt text');
assert.equal(images.filter((tag) => !/\bdecoding=/.test(tag)).length, 0, 'all homepage images need decoding hint');

console.log(JSON.stringify({
  staticAudit:'passed',
  homepageMode:'full DOM replacement',
  homepagePhotos:'none except preserved logo',
  legacyHomepageVisible:false,
  commercePage:'/shop.html',
  logo:'preserved exact WebP',
  homepageStylesheet:'editorial.css',
  legacyShopStylesheet:'styles.css'
}, null, 2));
