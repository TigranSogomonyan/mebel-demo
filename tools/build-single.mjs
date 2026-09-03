// Собирает весь сайт в один самодостаточный HTML-файл:
// стили, скрипты и эскизы (как data:URI) переезжают внутрь страницы.
// Запуск: node tools/build-single.mjs [путь_к_выходному_файлу]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || resolve(ROOT, 'dist-single.html');
const read = (f) => readFileSync(resolve(ROOT, f), 'utf8');

const dataUri = (f) => {
  const p = resolve(ROOT, f);
  if (!existsSync(p)) throw new Error('нет файла: ' + f);
  return 'data:image/svg+xml;base64,' + readFileSync(p).toString('base64');
};

let html = read('index.html');
const css = read('css/styles.css');
const data = read('js/catalog-data.js');
const app = read('js/app.js');

// пути к картинкам → data:URI (и в разметке, и в данных каталога)
const inlineImgs = (txt) => txt.replace(/img\/(catalog|ui)\/[A-Za-z0-9_\-]+\.svg/g, (m) => dataUri(m));

html = inlineImgs(html)
  .replace(/<link rel="stylesheet" href="css\/styles\.css">/, `<style>\n${css}\n</style>`)
  .replace(/<script src="js\/catalog-data\.js"><\/script>\s*<script src="js\/app\.js"><\/script>/,
    `<script>\n${inlineImgs(data)}\n</script>\n<script>\n${app}\n</script>`);

writeFileSync(OUT, html);
console.log(`${OUT} — ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} МБ`);
