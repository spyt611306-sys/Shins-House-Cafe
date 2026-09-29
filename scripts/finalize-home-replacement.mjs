import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync('dist/index.html', 'utf8');
const shop = fs.readFileSync('dist/shop.html', 'utf8');
const experience = fs.readFileSync('dist/experience.js', 'utf8');

for (const tag of ['html', 'head', 'body', 'main']) {
  assert.equal((home.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length, 1, `Exactly one ${tag} required`);
}

for (const legacy of ['sh-hero-copy', 'sh-brand-panel', 'sh-note-grid', 'sh-original-shop', 'Loading v4.3', 'Coffee & Objects', 'NIGHT DECAF']) {
  assert.ok(!home.includes(legacy), `Legacy homepage remains: ${legacy}`);
  assert.ok(!shop.includes(legacy), `Legacy storefront remains: ${legacy}`);
}

assert.ok(!/href=["'](?:\.\/)?styles\.css["']/.test(home), 'Homepage must not load old stylesheet');
assert.ok(!/href=["'](?:\.\/)?styles\.css["']/.test(shop), 'Shop must not load old stylesheet');
assert.ok(home.includes('/assets/hero-20260928.webp'));
assert.ok(fs.existsSync('dist/assets/hero-cafe-v2.webp'), 'Alternate cafe hero artwork must be built');
assert.ok(fs.statSync('dist/assets/hero-cafe-v2.webp').size > 12000, 'Alternate hero artwork must not be empty');
assert.ok(home.includes('/experience.css'), 'Homepage must load experience.css');
assert.ok(home.includes('/experience.js'), 'Homepage must load experience.js');
assert.ok(experience.includes('나에게 맞는 원두 찾기'), 'Taste finder trigger is required');
assert.ok(experience.includes('questions.length'), 'Taste finder questions are required');
assert.ok(experience.includes("secondary.src = '/assets/hero-cafe-v2.webp'"), 'Second hero slide must use the cafe artwork');
assert.ok(shop.includes('/cart.css'));
assert.ok(shop.includes('/cart.js'));
assert.ok(!fs.existsSync('dist/shop-runtime.js'), 'Legacy shop runtime must not be published');
assert.ok(!fs.existsSync('dist/styles.css'), 'Legacy stylesheet must not be published');
assert.ok(!fs.existsSync('dist/app.js'), 'Legacy app runtime must not be published');

console.log('Verified homepage taste finder, active hero rotation and clean cart/store build.');
