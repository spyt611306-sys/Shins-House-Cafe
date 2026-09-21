import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const assetsOut = path.join(out, 'assets');

const EXPECTED = [
  { len:16000, hash:'0eba204cc0284f59' },
  { len:16000, hash:'db1443cdf3c0d125' },
  { len:16000, hash:'99e9e088abfa7d17' },
  { len:16000, hash:'696098f7c47fb137' },
  { len:16000, hash:'7ef48690516062b8' },
  { len:16000, hash:'6d16273fd52e08e4' },
  { len:16000, hash:'5bb12fa00d6e6985' },
  { len:16000, hash:'b31ddc15e68cebb5' },
  { len:16000, hash:'63306d1fc4c277d4' },
  { len:14880, hash:'ad0023ff424e55fc' }
];
const B = 911382323n;
const MASK = (1n << 64n) - 1n;

const hash64 = (s) => {
  let h = 0n;
  for (let i=0;i<s.length;i++) h = (h * B + BigInt(s.charCodeAt(i))) & MASK;
  return h;
};

const repairSingleExtra = (s, targetHex) => {
  const n = s.length;
  const target = BigInt(`0x${targetHex}`);
  const pow = new Array(n + 1);
  const pref = new Array(n + 1);
  const suff = new Array(n + 1);
  pow[0] = 1n;
  for (let i=1;i<=n;i++) pow[i] = (pow[i-1] * B) & MASK;
  pref[0] = 0n;
  for (let i=0;i<n;i++) pref[i+1] = (pref[i] * B + BigInt(s.charCodeAt(i))) & MASK;
  suff[n] = 0n;
  for (let i=n-1;i>=0;i--) suff[i] = (BigInt(s.charCodeAt(i)) * pow[n-1-i] + suff[i+1]) & MASK;
  for (let i=0;i<n;i++) {
    const candidate = (pref[i] * pow[n-1-i] + suff[i+1]) & MASK;
    if (candidate === target) return s.slice(0,i) + s.slice(i+1);
  }
  return null;
};

const normalizeChunk = (text, index) => {
  const spec = EXPECTED[index];
  let cleaned = text.replace(/[^A-Za-z0-9+/=]/g, '');
  if (cleaned.length === spec.len + 1) {
    const repaired = repairSingleExtra(cleaned, spec.hash);
    if (!repaired) throw new Error(`bundle-${String(index+1).padStart(2,'0')} single-character repair failed`);
    cleaned = repaired;
  }
  if (cleaned.length !== spec.len) throw new Error(`bundle-${String(index+1).padStart(2,'0')} length ${cleaned.length}, expected ${spec.len}`);
  const actual = hash64(cleaned).toString(16).padStart(16,'0');
  if (actual !== spec.hash) throw new Error(`bundle-${String(index+1).padStart(2,'0')} integrity mismatch ${actual}`);
  return cleaned;
};

const chunks = EXPECTED.map((_, index) => {
  const file = path.join(root, 'bundle-mini', `bundle-${String(index+1).padStart(2,'0')}.txt`);
  const base64 = normalizeChunk(fs.readFileSync(file, 'utf8'), index);
  return Buffer.from(base64, 'base64');
});

const compressed = Buffer.concat(chunks);
const decoded = zlib.gunzipSync(compressed).toString('utf8');
const payload = JSON.parse(decoded);
if (!payload || typeof payload.html !== 'string' || typeof payload.css !== 'string' || !payload.assets) {
  throw new Error('Invalid v4.3 payload structure');
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(assetsOut, { recursive: true });

for (const [name, data] of Object.entries(payload.assets)) {
  if (!/^[a-zA-Z0-9._-]+\.webp$/.test(name)) throw new Error(`Unsafe asset name: ${name}`);
  fs.writeFileSync(path.join(assetsOut, name), Buffer.from(String(data), 'base64'));
}

fs.writeFileSync(path.join(out, 'styles.css'), payload.css, 'utf8');
fs.copyFileSync(path.join(root, 'app.js'), path.join(out, 'app.js'));

const siteUrl = String(process.env.SITE_URL || process.env.URL || 'https://shinshouse.netlify.app').replace(/\/$/, '');
const description = 'Shin\'s House — 부산에서 매일 마시기 좋은 커피와 필요한 오브젝트를 차분하게 고릅니다.';
const businessName = process.env.BUSINESS_NAME || '신스하우스';
const phone = process.env.CUSTOMER_PHONE || '0503-5260-7479';
const address = process.env.BUSINESS_ADDRESS || '부산광역시 부산진구 새싹로8번길 35-8 1층';

const escapeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const injectBeforeClosing = (source, tag, fragment) => {
  const closing = new RegExp(`</${tag}\\s*>`, 'i');
  if (closing.test(source)) return source.replace(closing, `${fragment}\n</${tag}>`);
  return `${source}\n${fragment}`;
};

const seo = `\n<meta name="description" content="${description}">\n<link rel="canonical" href="${siteUrl}/">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="Shin's House">\n<meta property="og:title" content="Shin's House — Coffee & Objects">\n<meta property="og:description" content="${description}">\n<meta property="og:url" content="${siteUrl}/">\n<meta name="twitter:card" content="summary_large_image">\n<script type="application/ld+json">${escapeJson({ '@context':'https://schema.org', '@type':'Store', name:businessName, url:`${siteUrl}/`, telephone:phone, address:{ '@type':'PostalAddress', streetAddress:address, addressCountry:'KR' } })}</script>`;

const legalLinks = `<div class="shins-commercial-footer" role="contentinfo" style="padding:28px 20px;text-align:center;font-size:13px;line-height:1.8;background:#15110d;color:#d9cbbb"><a href="/legal/terms" style="color:inherit;margin:0 8px">이용약관</a><a href="/legal/privacy" style="color:inherit;margin:0 8px">개인정보처리방침</a><a href="/legal/refund" style="color:inherit;margin:0 8px">취소·교환·환불</a><div style="margin-top:8px;opacity:.72">© ${new Date().getFullYear()} Shin's House</div></div>`;

let html = payload.html;
html = html.replace(/<title>[^<]*<\/title>/i, `<title>Shin's House — Coffee & Objects</title>`);
if (!/href=["']styles\.css["']/i.test(html)) html = injectBeforeClosing(html, 'head', '<link rel="stylesheet" href="styles.css">');
html = injectBeforeClosing(html, 'head', seo);
html = injectBeforeClosing(html, 'body', legalLinks);
html = html.replace(/<img(?![^>]*\bdecoding=)/gi, '<img decoding="async"');

fs.writeFileSync(path.join(out, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}/</loc></url><url><loc>${siteUrl}/legal/terms</loc></url><url><loc>${siteUrl}/legal/privacy</loc></url><url><loc>${siteUrl}/legal/refund</loc></url></urlset>\n`, 'utf8');
fs.writeFileSync(path.join(out, '404.html'), html, 'utf8');

console.log(`Built Shin's House static production site: ${Object.keys(payload.assets).length} assets -> dist/`);
