/**
 * FAM — посредник между сайтом и Telegram (Google Apps Script).
 *
 * Токен бота хранится в свойствах этого скрипта и никогда не попадает на сайт.
 * Установка — в README.md рядом с этим файлом.
 *
 * Свойства скрипта (Настройки проекта → Свойства скрипта):
 *   TELEGRAM_TOKEN    — токен от @BotFather
 *   TELEGRAM_CHAT_ID  — номер канала или группы, узнаётся функцией findChatId()
 */

const MAX_LEADS_PER_MINUTE = 6;   // защита от флуда: больше заявок в минуту скрипт не пропустит
const MAX_FILE_MB = 10;
const ALLOWED_FILES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const LIMITS = { topic: 120, name: 80, phone: 20, category: 60, note: 1000 };

function doPost(e) {
  try {
    const raw = (e && e.parameter) || {};

    // ловушка для спам-ботов: поле скрыто от людей
    if (raw.website) return json_({ ok: true });

    // всё, что пришло с сайта, считаем недоверенным: обрезаем и чистим
    const p = {};
    Object.keys(LIMITS).forEach(function (k) { p[k] = clean_(raw[k], LIMITS[k]); });

    if (p.name.length < 2) return json_({ ok: false, error: 'Не заполнено имя' });
    const digits = p.phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return json_({ ok: false, error: 'Некорректный телефон' });

    let file = null;
    if (raw.file_b64) {
      const type = String(raw.file_type || '').toLowerCase();
      if (ALLOWED_FILES.indexOf(type) === -1) return json_({ ok: false, error: 'Можно прикрепить PDF или изображение' });
      if (raw.file_b64.length > MAX_FILE_MB * 1024 * 1024 * 1.37) return json_({ ok: false, error: 'Файл больше ' + MAX_FILE_MB + ' МБ' });
      file = {
        bytes: Utilities.base64Decode(raw.file_b64),
        type: type,
        name: clean_(raw.file_name, 80).replace(/[^\wА-Яа-яЁё.\- ]+/g, '_') || 'plan'
      };
    }

    const cache = CacheService.getScriptCache();
    const sent = Number(cache.get('leads-minute') || 0);
    if (sent >= MAX_LEADS_PER_MINUTE) return json_({ ok: false, error: 'Слишком много заявок, попробуйте через минуту' });
    cache.put('leads-minute', String(sent + 1), 60);

    const { token, chatId } = settings_();

    telegram_(token, 'sendMessage', {
      chat_id: chatId,
      text: leadText_(p),
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    if (file) {
      const blob = Utilities.newBlob(file.bytes, file.type, file.name);
      telegram_(token, 'sendDocument', {
        chat_id: chatId,
        document: blob,
        caption: 'План к заявке: ' + p.name + ', ' + p.phone
      });
    }

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Не удалось отправить в Telegram' });
  }
}

// Открытие адреса скрипта в браузере — простая проверка, что он развёрнут.
function doGet() {
  return json_({ ok: true, service: 'FAM leads' });
}

/**
 * Запустите один раз из редактора после того, как:
 *  1) токен сохранён в свойствах скрипта,
 *  2) бот добавлен администратором в канал,
 *  3) в канале опубликовано любое сообщение.
 * Номер канала появится в «Журнале выполнения».
 */
function findChatId() {
  const { token } = settings_(true);
  const res = telegram_(token, 'getUpdates', {});
  const chats = {};
  (res.result || []).forEach(function (u) {
    const m = u.channel_post || u.message || u.my_chat_member;
    if (m && m.chat) chats[m.chat.id] = (m.chat.title || m.chat.username || '') + ' (' + m.chat.type + ')';
  });
  const ids = Object.keys(chats);
  if (!ids.length) {
    console.log('Каналов не найдено. Проверьте, что бот — администратор канала, и опубликуйте в канале новое сообщение, затем запустите снова.');
    return;
  }
  ids.forEach(function (id) { console.log('TELEGRAM_CHAT_ID = ' + id + '   ← ' + chats[id]); });
}

// Запустите из редактора, чтобы отправить в канал тестовую заявку.
function testSend() {
  const out = doPost({ parameter: {
    topic: 'Тестовая заявка из редактора скрипта',
    name: 'Проверка', phone: '+7 (916) 123-45-67',
    category: 'Кухни', note: 'Если вы видите это сообщение — всё настроено.'
  } });
  console.log(out.getContent());
}

/* ——— служебное ——— */

function settings_(tokenOnly) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_TOKEN');
  const chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token) throw new Error('Не задано свойство TELEGRAM_TOKEN');
  if (!tokenOnly && !chatId) throw new Error('Не задано свойство TELEGRAM_CHAT_ID — запустите findChatId()');
  return { token: token.trim(), chatId: chatId && chatId.trim() };
}

function telegram_(token, method, payload, retried) {
  const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  });
  const body = JSON.parse(r.getContentText());

  // группу превратили в супергруппу — у неё новый номер: запоминаем и повторяем
  const moved = body.parameters && body.parameters.migrate_to_chat_id;
  if (!body.ok && moved && payload.chat_id && !retried) {
    PropertiesService.getScriptProperties().setProperty('TELEGRAM_CHAT_ID', String(moved));
    console.log('Номер чата сменился на ' + moved + ', свойство обновлено');
    payload.chat_id = String(moved);
    return telegram_(token, method, payload, true);
  }

  if (!body.ok) throw new Error(method + ': ' + body.description);
  return body;
}

function leadText_(p) {
  const rows = [
    ['Имя', p.name], ['Телефон', p.phone], ['Интересует', p.category], ['Комментарий', p.note]
  ].filter(function (r) { return r[1] && String(r[1]).trim(); })
   .map(function (r) { return '<b>' + r[0] + ':</b> ' + esc_(r[1]); });

  const when = Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM, HH:mm');
  return '<b>Новая заявка · FAM</b>\n' + esc_(p.topic || 'Заявка с сайта') + '\n\n' +
    rows.join('\n') + '\n\n<i>' + when + ' МСК</i>';
}

// убирает управляющие символы, сжимает пробелы, режет по длине
function clean_(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
