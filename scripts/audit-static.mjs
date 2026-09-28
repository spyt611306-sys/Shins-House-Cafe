import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('dist/index.html', 'utf8');
const shop = fs.readFileSync('dist/shop.html', 'utf8');
const cart = fs.readFileSync('dist/cart.js', 'utf8');
const admin = fs.readFileSync('dist/admin.html', 'utf8');
const adminJs = fs.readFileSync('dist/admin.js', 'utf8');
const followup = fs.readFileSync('dist/order-followup.js', 'utf8');

for (const file of ['index.html','404.html','editorial.css','home.js','media.js','shop.html','cart.css','cart.js','order-followup.js','admin.html','admin.css','admin-inventory.css','admin.js','robots.txt','sitemap.xml']) assert.ok(fs.statSync(`dist/${file}`).size > 0, file);
for (const legacy of ['styles.css','app.js','shop-runtime.js']) assert.ok(!fs.existsSync(`dist/${legacy}`), `legacy ${legacy} must be absent`);
assert.equal((html.match(/<main\b/g) || []).length, 1);
assert.equal((html.match(/class="drink"/g) || []).length, 6);
assert.ok(html.includes('/assets/hero-20260928.webp'));
assert.ok(shop.includes('checkout-dialog') && shop.includes('bank-dialog'));
assert.ok(cart.includes('/api/orders') && cart.includes('consents') && cart.includes('shipping_address'));
assert.ok(followup.includes('payment-notice') && followup.includes('orders/lookup') && followup.includes('/cancel'));
assert.ok(admin.includes('제품 관리') && admin.includes('재고 관리') && admin.includes('원두 주문 관리') && admin.includes('홈페이지 이미지 관리'));
assert.ok(adminJs.includes('/adjust') && adminJs.includes('absolute_stock') && adminJs.includes('inventory_logs'));
assert.ok(fs.readFileSync('dist/robots.txt','utf8').includes('Disallow: /admin.html'));
assert.ok(fs.readFileSync('dist/sitemap.xml','utf8').includes('/shop.html'));
console.log('Static audit passed: live checkout, order follow-up, inventory admin and legacy removal verified.');
