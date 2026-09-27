import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const indexFile = path.join(dist, 'index.html');
const html = fs.readFileSync(indexFile, 'utf8');

const bodyStarts = [...html.matchAll(/<body\b[^>]*>/gi)];
if (!bodyStarts.length) throw new Error('No body element found after editorial build');

// The editorial builder writes the replacement body last. Always use the last body,
// then rebuild the entire document so legacy homepage DOM cannot survive before it.
const lastBody = bodyStarts[bodyStarts.length - 1];
const bodyOpenEnd = lastBody.index + lastBody[0].length;
const closing = html.indexOf('</body>', bodyOpenEnd);
if (closing < 0) throw new Error('Replacement body is missing closing tag');
const newBody = html.slice(bodyOpenEnd, closing);

if (!newBody.includes('class="sh-ref-header"') || !newBody.includes('class="sh-editorial-home"')) {
  throw new Error('Last body is not the editorial replacement homepage');
}

const doctype = html.match(/<!doctype[^>]*>/i)?.[0] || '<!doctype html>';
const htmlOpen = html.match(/<html\b[^>]*>/i)?.[0] || '<html lang="ko">';
let head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '<meta charset="utf-8">';

// Remove legacy visual/runtime payload from the homepage head while keeping SEO/meta/JSON-LD.
head = head
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<link\b[^>]*href=["'](?:\.\/)?styles\.css["'][^>]*>/gi, '')
  .replace(/<link\b[^>]*href=["']\/editorial\.css["'][^>]*>/gi, '')
  .replace(/<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, '');
head += '\n<link rel="stylesheet" href="/editorial.css">\n';

const rebuilt = `${doctype}\n${htmlOpen}\n<head>${head}</head>\n<body>${newBody}</body>\n</html>\n`;
fs.writeFileSync(indexFile, rebuilt, 'utf8');
fs.writeFileSync(path.join(dist, '404.html'), rebuilt, 'utf8');

const bodyMainCount = (newBody.match(/<main\b/gi) || []).length;
if (bodyMainCount !== 1) throw new Error(`Expected one main in rebuilt homepage, found ${bodyMainCount}`);
if (newBody.includes('sh-original-shop') || newBody.includes('sh-home-hero')) throw new Error('Legacy homepage DOM survived final replacement');

console.log('Final homepage document rebuilt from editorial body only; legacy homepage DOM removed');
