import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync('dist/index.html', 'utf8');
for (const tag of ['html', 'head', 'body', 'main']) assert.equal((html.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length, 1, `Exactly one ${tag} required`);
for (const legacy of ['sh-hero-copy', 'sh-brand-panel', 'sh-note-grid', 'sh-original-shop', 'Loading v4.3']) assert.ok(!html.includes(legacy), `Legacy homepage remains: ${legacy}`);
assert.ok(!/href=["'](?:\.\/)?styles\.css["']/.test(html), 'Homepage must not load old stylesheet');
assert.ok(html.includes('/assets/hero-20260928.webp'));
console.log('Verified full homepage replacement; old homepage DOM and styling absent.');
