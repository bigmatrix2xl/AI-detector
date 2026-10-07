/*
 * Журнал действий: кто, когда и что делал — сообщениями в Telegram-группу,
 * которую видит только администратор (и кого он туда добавит).
 *
 * Вход, выход, неудачные попытки, загруженные файлы (сам файл — вложением),
 * каждая проверка (полный отчёт с текстом и подсветкой — вложением),
 * пакетные проверки, выгрузки, ошибки. Действия админа не записываются;
 * неудачные попытки входа записываются всегда, под любым логином.
 *
 * Без сервера: браузер шлёт сообщения прямо в Bot API. Запросы — формой
 * (FormData), иначе браузер сначала спрашивает разрешение (preflight),
 * а Telegram на такой вопрос не отвечает. Не ушло (нет сети) — текстовые
 * записи ждут в localStorage и уходят при следующем открытии страницы.
 *
 * Ключ бота лежит в открытом коде — бот должен быть отдельным, только для
 * журнала, и не администратором группы. На своём хостинге ключ переедет
 * на сервер.
 */
(function () {
  'use strict';
  var TG_TOKEN = '8663671320:AAFCXC1nUaT3T8VDlApn3XVi9iXnH6eU4jM';     // ключ от @BotFather
  var TG_CHAT = '-5499220265';      // id группы-журнала
  var API = 'https://api.telegram.org/bot';
  var QKEY = 'aidet_log_queue';
  var QMAX = 200;        // текстовых записей в очереди, старые выбрасываем

  var on = !!(TG_TOKEN && TG_CHAT);
  var queue = [];        // { text, file?: { name, blob } }
  var busy = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function num(n) { return Number(n || 0).toLocaleString('ru-RU'); }
  function when() {
    return new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  function who() {
    var a = self.DetectorAuth, u = a && a.user();
    return u ? '<b>' + esc(u.name) + '</b> (' + esc(u.login) + ')' : '<b>без входа</b>';
  }
  function device() {
    var ua = navigator.userAgent;
    var os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac'
      : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'другая система';
    var br = /YaBrowser/.test(ua) ? 'Яндекс Браузер' : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera'
      : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'браузер';
    return os + ', ' + br;
  }

  // очередь: в localStorage только текст — файлы туда не влезут
  function persist() {
    try {
      var texts = queue.map(function (q) { return q.file ? q.text + '\n<i>(вложение не дошло)</i>' : q.text; });
      if (texts.length) localStorage.setItem(QKEY, JSON.stringify(texts.slice(-QMAX)));
      else localStorage.removeItem(QKEY);
    } catch (e) {}
  }
  function restore() {
    try {
      var saved = JSON.parse(localStorage.getItem(QKEY) || '[]');
      saved.forEach(function (t) {
        queue.push({ text: t.indexOf('(отправлено с опозданием)') < 0 ? t + '\n<i>(отправлено с опозданием)</i>' : t });
      });
    } catch (e) {}
  }

  function post(item) {
    var fd = new FormData();
    fd.append('chat_id', TG_CHAT);
    fd.append('parse_mode', 'HTML');
    var method = 'sendMessage';
    if (item.file) {
      method = 'sendDocument';
      fd.append('document', item.file.blob, item.file.name);
      fd.append('caption', item.text.slice(0, 1024));
    } else {
      fd.append('text', item.text.slice(0, 4096));
      fd.append('disable_web_page_preview', 'true');
    }
    return fetch(API + TG_TOKEN + '/' + method, { method: 'POST', body: fd }).then(function (r) {
      return r.json().then(function (j) {
        // 400 — сообщение плохое (не повторять), 429 и 5xx — подождать и повторить
        if (!j.ok && r.status !== 400) throw new Error(j.description || r.status);
      });
    });
  }

  function pump(delay) {
    if (busy || !queue.length) return;
    busy = true;
    setTimeout(function () {
      post(queue[0]).then(function () {
        queue.shift(); persist(); busy = false; pump(0);
      }, function () {
        busy = false; pump(Math.min((delay || 2000) * 2, 60000));   // сеть пропала — пробуем реже
      });
    }, delay || 0);
  }

  function send(text, file) {
    if (!on) return;
    var a = self.DetectorAuth;
    if (a && a.role() === 'admin') return;   // админа не отслеживаем
    queue.push({ text: text + '\n<i>' + esc(when()) + '</i>', file: file });
    persist();
    pump(0);
  }

  // дождаться отправки (перед перезагрузкой страницы), но не дольше 2 секунд
  function flush() {
    return new Promise(function (done) {
      var t0 = Date.now();
      (function wait() { if (!queue.length || Date.now() - t0 > 2000) done(); else setTimeout(wait, 100); })();
    });
  }

  self.DetectorLog = {
    enabled: function () { return on; },
    flush: flush,
    login: function () { send('🔑 Вход: ' + who() + '\n' + esc(device())); },
    loginFailed: function (login) { send('⛔ Неудачный вход: логин «' + esc(login) + '»\n' + esc(device())); },
    logout: function () { send('🚪 Выход: ' + who()); },
    file: function (file, chars) {
      send('📎 ' + who() + ' загрузил файл «' + esc(file.name) + '», ' + num(chars) + ' симв.',
        file.size < 45e6 ? { name: file.name, blob: file } : null);
    },
    check: function (c) {
      send('🔎 ' + who() + ' проверил ' + (c.fileName ? '«' + esc(c.fileName) + '»' : 'текст из поля') + '\n' +
        num(c.words) + ' слов · строгость: ' + esc(c.profile) + '\n' +
        '<b>Балл ИИ ' + c.score + ' из 100 · ' + (c.ok ? 'можно сдавать' : 'на доработку') + '</b>\n' +
        'Машинных предложений: ' + c.flagged + ' · штампов: ' + c.hits + '\n' +
        'Начало: «' + esc(c.start) + '»',
        { name: c.reportName, blob: new Blob([c.reportHtml], { type: 'text/html' }) });
    },
    batch: function (rows, okN) {
      send('📦 ' + who() + ' — пакетная проверка, ' + rows.length + ' файл(ов), можно сдавать ' + okN + '\n' +
        rows.map(function (r) { return '• ' + esc(r.name) + ' — ' + (r.error ? 'ошибка: ' + esc(r.error) : r.score + (r.ok ? ' ✅' : ' ❌')); }).join('\n'));
    },
    action: function (what) { send('⬇️ ' + who() + ': ' + esc(what)); },
    error: function (what) { send('⚠️ Ошибка у ' + who() + ': ' + esc(what)); }
  };

  if (on) { restore(); pump(1500); }
  self.addEventListener('error', function (e) {
    if (e && e.message) self.DetectorLog.error(e.message + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : ''));
  });
})();
