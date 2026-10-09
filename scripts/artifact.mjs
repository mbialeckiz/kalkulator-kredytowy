// Zamienia dist/index.html (pełny dokument) na treść strony artefaktu:
// platforma sama dokłada <!doctype>, <html>, <head> i <body>, więc zostawiamy title, style, link, root i skrypt.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? '';
const keepHead = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .trim();
// <title> musi być na samym początku pliku (platforma skanuje pierwsze 8 KB).
const title = keepHead.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '';
const rest = keepHead.replace(title, '');
const scripts = [];
const restNoScripts = rest.replace(/<script[\s\S]*?<\/script>/gi, (m) => {
  scripts.push(m);
  return '';
});
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/kalkulator-kredytowy.html', `${title}\n${restNoScripts.trim()}\n${body.trim()}\n${scripts.join('\n')}\n`);
console.log('artifact/kalkulator-kredytowy.html', Math.round(readFileSync('artifact/kalkulator-kredytowy.html').length / 1024), 'KB');
