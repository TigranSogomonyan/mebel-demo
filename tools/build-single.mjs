// Собирает весь сайт в один самодостаточный HTML-файл:
// стили, скрипты, шрифты и эскизы (как data:URI) переезжают внутрь страницы.
// Сверху добавляется политика безопасности (CSP) с отпечатками встроенных скриптов.
// Запуск: node tools/build-single.mjs [путь_к_выходному_файлу]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || resolve(ROOT, 'dist-single.html');
const read = (f) => readFileSync(resolve(ROOT, f), 'utf8');

const dataUri = (f, type) => {
  const p = resolve(ROOT, f);
  if (!existsSync(p)) throw new Error('нет файла: ' + f);
  return `data:${type};base64,` + readFileSync(p).toString('base64');
};

// Куда сайту разрешено обращаться. Всё остальное браузер заблокирует.
const CSP = (scriptHashes) => [
  "default-src 'none'",
  `script-src ${scriptHashes.map((h) => `'sha256-${h}'`).join(' ')}`,
  "style-src 'unsafe-inline'",                                         // встроенные стили и CSS-переменные в атрибутах
  "img-src 'self' data:",
  "font-src data:",
  "connect-src https://script.google.com https://script.googleusercontent.com",  // отправка заявок
  "frame-src https://yandex.ru",                                       // карта — только после нажатия
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "manifest-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

// Сайт нельзя встроить во фрейм на чужой странице (защита от кликджекинга).
// GitHub Pages не даёт задать заголовок X-Frame-Options, поэтому — скриптом.
const FRAME_GUARD = "if (window.top !== window.self) { document.documentElement.style.visibility = 'hidden'; }";

let html = read('index.html');
const css = read('css/styles.css')
  .replace(/url\('\.\.\/fonts\/([a-z0-9-]+\.woff2)'\)/g, (_, f) => `url('${dataUri('fonts/' + f, 'font/woff2')}')`);
const data = read('js/catalog-data.js');
const app = read('js/app.js');

// пути к картинкам → data:URI (и в разметке, и в данных каталога)
const inlineImgs = (txt) => txt.replace(/img\/(catalog|ui)\/[A-Za-z0-9_\-]+\.svg/g, (m) => dataUri(m, 'image/svg+xml'));

// ВАЖНО: замену передаём функцией. Со строкой JS трактует $$, $&, $` и $' как
// спецпоследовательности — в app.js есть хелпер $$, и он схлопывался в $.
html = inlineImgs(html)
  .replace(/<link rel="stylesheet" href="css\/styles\.css">/, () => `<style>\n${css}\n</style>`)
  .replace(/<script src="js\/catalog-data\.js"><\/script>\s*<script src="js\/app\.js"><\/script>/,
    () => `<script>\n${inlineImgs(data)}\n</script>\n<script>\n${app}\n</script>`)
  .replace('<meta charset="utf-8">', () => `<meta charset="utf-8">\n<script>${FRAME_GUARD}</script>`);

if (/<script[^>]+src=|https:\/\/fonts\.g/.test(html)) throw new Error('в сборке остались внешние скрипты или шрифты');

const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => createHash('sha256').update(m[1], 'utf8').digest('base64'));
html = html.replace('<meta charset="utf-8">',
  () => `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${CSP(hashes)}">`);

writeFileSync(OUT, html);
console.log(`${OUT} — ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} МБ, скриптов под CSP: ${hashes.length}`);
