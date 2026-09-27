import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync('dist/index.html', 'utf8');
const shop = fs.readFileSync('dist/shop.html', 'utf8');
for (const file of ['index.html','404.html','editorial.css','home.js','styles.css','shop.html','app.js','robots.txt','sitemap.xml']) assert.ok(fs.statSync(`dist/${file}`).size > 0, file);
assert.equal((html.match(/<main\b/g) || []).length, 1);
assert.equal((html.match(/class="drink"/g) || []).length, 6);
for (const img of html.match(/<img\b[^>]*>/g) || []) {
  assert.match(img, /alt="[^"]+"/);
  const src = img.match(/src="([^"]+)"/)[1];
  assert.ok(fs.existsSync(`dist${src}`), src);
}
for (const link of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${link[1]}"`), link[1]);
assert.ok(!html.includes('sh-brand-panel'));
assert.ok(!html.includes('href="styles.css"'));
assert.ok(shop.includes('cartModal') && shop.includes('checkoutModal'));
assert.ok(shop.includes("get('open')==='cart'"));
assert.ok(fs.readFileSync('dist/sitemap.xml','utf8').includes('/shop.html'));
console.log('Static audit passed: full replacement, image paths, six drinks, navigation targets and commerce retained.');
