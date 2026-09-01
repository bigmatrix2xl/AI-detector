/*
 * Связка интерфейса: ввод, файлы, настройки, запуск анализа,
 * очеловечивание, экспорт, тема.
 */
(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };
  // source — оригинал документа (буфер DOCX или разобранная структура),
  // чтобы вернуть пользователю тот же файл в том же оформлении, но с пометками
  var state = { text: '', report: null, humanized: null, generatedAt: null, source: null, fileName: '' };

  /* ---------------- настройки ---------------- */

  var DEFAULTS = { profile: 'balanced', lang: 'auto', segmentSize: 900, markdownAware: false, whitelist: '' };

  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem('aidet_settings') || '{}');
      return Object.assign({}, DEFAULTS, s);
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function saveSettings(s) {
    try { localStorage.setItem('aidet_settings', JSON.stringify(s)); } catch (e) {}
  }
  function readSettingsFromUi() {
    var s = {
      profile: (document.querySelector('input[name="profile"]:checked') || {}).value || 'balanced',
      lang: $('#set-lang').value,
      segmentSize: parseInt($('#set-seg').value, 10) || 900,
      markdownAware: $('#set-md').checked,
      whitelist: $('#set-wl').value
    };
    saveSettings(s);
    return s;
  }
  function applySettingsToUi(s) {
    var r = document.querySelector('input[name="profile"][value="' + s.profile + '"]');
    if (r) r.checked = true;
    $('#set-lang').value = s.lang;
    $('#set-seg').value = s.segmentSize;
    $('#set-md').checked = !!s.markdownAware;
    $('#set-wl').value = s.whitelist || '';
  }

  /* ---------------- тема ---------------- */

  function applyTheme(mode) {
    if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    try { localStorage.setItem('aidet_theme', mode); } catch (e) {}
    $('#theme-btn').textContent = mode === 'auto' ? '◐ Авто' : mode === 'dark' ? '● Тёмная' : '○ Светлая';
  }

  /* ---------------- ввод ---------------- */

  function setText(text, sourceNote, source, fileName) {
    state.text = text;
    state.source = source || null;
    state.fileName = fileName || '';
    $('#input-text').value = text;
    updateCounter();
    if (sourceNote) note(sourceNote, 'ok');
  }

  function updateCounter() {
    var t = $('#input-text').value;
    var words = t.trim() ? (t.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\-']*/g) || []).length : 0;
    var msg = t.length.toLocaleString('ru-RU') + ' симв. · ' + words.toLocaleString('ru-RU') + ' слов';
    if (t.length > 0 && words < 120) msg += ' — для надёжной оценки нужно 150+ слов';
    if (t.length > 300000) msg += ' — очень большой текст, анализ может занять несколько секунд';
    $('#counter').textContent = msg;
  }

  function note(msg, kind) {
    var n = $('#note');
    n.textContent = msg;
    n.className = 'note ' + (kind || '');
    n.hidden = false;
    clearTimeout(note._t);
    note._t = setTimeout(function () { n.hidden = true; }, 6000);
  }

  /* ---------------- файлы ---------------- */

  function handleFiles(files) {
    if (!files || !files.length) return;
    var file = files[0];
    note('Читаю «' + file.name + '»…');
    FileLoader.read(file).then(function (res) {
      setText(res.text, 'Загружено из «' + res.name + '»: ' + res.text.length.toLocaleString('ru-RU') + ' символов' +
        (res.source && res.source.kind === 'docx' ? '. Оформление сохранено — сможете скачать этот же файл с пометками' : '') +
        (res.warnings.length ? '. ' + res.warnings.join(' ') : ''),
        res.source, res.name);
    }).catch(function (err) {
      note(err.message || 'Не удалось прочитать файл', 'err');
    });
  }

  /* ---------------- анализ ---------------- */

  function runCheck() {
    var text = $('#input-text').value;
    if (!text.trim()) { note('Вставьте текст или прикрепите файл', 'err'); return; }
    if (text.trim().length < 120) { note('Текст слишком короткий: нужно хотя бы пара абзацев (150+ слов)', 'err'); return; }
    var btn = $('#check-btn');
    btn.disabled = true; btn.textContent = 'Анализирую…';
    setTimeout(function () {
      try {
        var s = readSettingsFromUi();
        var whitelist = s.whitelist.split(/[\n,;]+/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
        state.text = text;
        state.generatedAt = new Date().toISOString();
        state.report = AIDetector.analyze(text, AIDetectorKB, {
          profile: s.profile, lang: s.lang, segmentSize: s.segmentSize,
          markdownAware: s.markdownAware, whitelist: whitelist
        });
        state.humanized = null;
        Report.render($('#results'), text, state.report);
        $('#results-actions').hidden = false;
        $('#humanize-card').hidden = false;
        $('#humanize-out').innerHTML = '';
        $('#results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        note('Ошибка анализа: ' + e.message, 'err');
        if (window.console) console.error(e);
      }
      btn.disabled = false; btn.textContent = 'Проверить на ИИ';
    }, 30);
  }

  /* ---------------- очеловечивание ---------------- */

  function runHumanize(mode) {
    if (!state.report) return;
    var res = Humanizer.apply(state.text, state.report, { mode: mode });
    state.humanized = res;
    var out = $('#humanize-out');
    var changesHtml = res.changes.length
      ? res.changes.map(function (c) {
          return '<li>«<s>' + escHtml(c.before) + '</s>» → ' +
            (c.after ? '«<b>' + escHtml(c.after) + '</b>»' : '<i>удалено</i>') +
            ' <span class="muted">— ' + escHtml(c.reason) + '</span></li>';
        }).join('')
      : '<li>Автозамен не потребовалось — штампов с надёжными заменами не найдено.</li>';
    var checklistHtml = res.checklist.map(function (c) {
      return '<li><b>' + escHtml(c.title) + '.</b> ' + escHtml(c.detail) + '</li>';
    }).join('');
    out.innerHTML =
      '<div class="hum-stats">Режим: <b>' + (mode === 'aggressive' ? 'смелый' : 'бережный') + '</b> · автоправок: <b>' +
      res.changes.length + '</b> · ' + res.stats.charsBefore.toLocaleString('ru-RU') + ' → ' + res.stats.charsAfter.toLocaleString('ru-RU') + ' симв.</div>' +
      '<textarea id="hum-text" class="hum-text" spellcheck="false"></textarea>' +
      '<div class="btn-row">' +
      '<button class="btn" id="hum-copy">Скопировать текст</button>' +
      '<button class="btn" id="hum-dl">Скачать .txt</button>' +
      '<button class="btn primary" id="hum-recheck">Проверить результат заново</button>' +
      '</div>' +
      '<details class="hum-details"><summary>Список автоправок (' + res.changes.length + ')</summary><ul>' + changesHtml + '</ul></details>' +
      '<details class="hum-details"><summary>Чек-лист ручной доработки (' + res.checklist.length + ')</summary><ol>' + checklistHtml + '</ol></details>' +
      '<p class="muted">Автозамены убирают штампы, но главную «человечность» дают ритм и конкретика — их правьте вручную или через Claude (кнопка «Промпт для Claude»). Нейро-очеловечивание — в следующем релизе.</p>';
    $('#hum-text').value = res.text;
    $('#hum-copy').onclick = function () { copyText(res.text, this); };
    $('#hum-dl').onclick = function () { download('humanized.txt', $('#hum-text').value, 'text/plain'); };
    $('#hum-recheck').onclick = function () { setText($('#hum-text').value); runCheck(); };
  }

  /* ---------------- экспорт ---------------- */

  function download(name, content, mime) {
    downloadBlob(name, new Blob([content], { type: (mime || 'application/octet-stream') + ';charset=utf-8' }));
  }

  function downloadBlob(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function stamp() {
    return (state.generatedAt || new Date().toISOString()).replace(/[:T]/g, '-').slice(0, 19);
  }

  /* ---------------- Word с пометками ---------------- */

  function docxName() {
    var base = (state.fileName || '').replace(/\.[a-z0-9]+$/i, '').trim();
    if (!base) base = 'текст-' + stamp();
    return base.slice(0, 80) + ' — правки.docx';
  }

  function runDocxExport(btn) {
    if (!state.report) return;
    if (typeof DocxExport === 'undefined' || typeof JSZip === 'undefined') {
      note('Модуль экспорта в Word не загружен (js/docx.js, libs/jszip.min.js)', 'err');
      return;
    }
    var old = btn.textContent;
    btn.disabled = true; btn.textContent = 'Собираю документ…';
    DocxExport.build({
      text: state.text,
      report: state.report,
      generatedAt: state.generatedAt,
      source: state.source,
      options: {
        comments: $('#opt-comments').checked,
        human: $('#opt-human').checked,
        appendix: $('#opt-appendix').checked
      }
    }).then(function (res) {
      downloadBlob(docxName(), res.blob);
      var where = res.stats.mode === 'original'
        ? 'Оформление исходного файла сохранено полностью'
        : res.stats.mode === 'rebuilt'
          ? 'Исходный DOCX разметить не удалось — документ собран заново'
          : 'Документ собран из текста (заголовки, списки и жирный шрифт сохранены)';
      note('Готово: ' + res.stats.marks + ' пометок, ' + res.stats.comments + ' комментариев. ' + where + '.', 'ok');
    }).catch(function (err) {
      note('Не удалось собрать .docx: ' + (err && err.message ? err.message : err), 'err');
      if (window.console) console.error(err);
    }).then(function () {
      btn.disabled = false; btn.textContent = old;
    });
  }

  function copyText(text, btn) {
    var done = function () {
      if (btn) { var old = btn.textContent; btn.textContent = '✓ Скопировано'; setTimeout(function () { btn.textContent = old; }, 1600); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------------- вставка из Word с сохранением оформления ----------------
   * Если текст копируют прямо из Word/Google Docs, в буфере лежит и HTML.
   * Разбираем его в структуру (заголовки, списки, жирный) — тогда «Скачать
   * Word с пометками» вернёт документ в том же виде. Любой сбой — молча
   * отдаём вставку браузеру, как было раньше.
   */
  function tryRichPaste(e, cd) {
    try {
      var ta = $('#input-text');
      if (e.target !== ta || typeof DocxExport === 'undefined') return;
      var html = cd.getData('text/html');
      if (!html || html.length < 60) return;
      // структуру запоминаем только когда вставка заменяет весь текст целиком
      var whole = !ta.value || (ta.selectionStart === 0 && ta.selectionEnd === ta.value.length);
      if (!whole) return;
      var rich = DocxExport.richFromHtml(html);
      if (!rich || rich.text.trim().length < 40) return;
      // если разбор HTML заметно разошёлся с обычным текстом из буфера —
      // не рискуем содержимым и отдаём вставку браузеру
      var plain = cd.getData('text/plain') || '';
      if (plain) {
        var a = rich.text.replace(/\s+/g, '').length, b = plain.replace(/\s+/g, '').length;
        if (!b || a / b < 0.92 || a / b > 1.08) return;
      }
      e.preventDefault();
      setText(rich.text, 'Вставлено с сохранением оформления: ' + rich.paragraphs.length +
        ' абзацев. Их можно будет выгрузить обратно в Word с пометками.',
        { kind: 'rich', rich: rich, text: rich.text }, '');
    } catch (err) { /* не мешаем обычной вставке */ }
  }

  /* ---------------- примеры ---------------- */

  var SAMPLE_AI = 'В современном мире искусственный интеллект играет ключевую роль в развитии бизнеса. Важно отметить, что внедрение инновационных решений открывает новые горизонты для компаний любого масштаба. Давайте разберемся, почему автоматизация является неотъемлемой частью успешной стратегии.\n\nВо-первых, комплексный подход к автоматизации позволяет существенно оптимизировать бизнес-процессы. Во-вторых, передовые технологии обеспечивают широкий спектр возможностей для масштабирования. Кроме того, интуитивно понятный интерфейс современных платформ позволяет сэкономить время и деньги.\n\nТаким образом, цифровая трансформация — это не просто тренд, а необходимость. Стоит отметить, что компании, которые внедряют инновации, получают значительное конкурентное преимущество. Более того, индивидуальный подход к каждому клиенту становится залогом успеха в условиях стремительно развивающегося рынка.\n\nПодводя итог, можно с уверенностью сказать: будущее за технологиями. Не упустите уникальную возможность вывести свой бизнес на новый уровень!';

  var SAMPLE_HUMAN = 'Мы внедряли CRM три месяца вместо обещанных двух недель. Расскажу, где мы облажались (и что бы я сделал иначе).\n\nПервая ошибка — понадеялись на «коробку». Вендор клялся, что интеграция с 1С заведётся за день. Ага, конечно. В итоге наш бухгалтер Лена неделю вручную сверяла счета, а я по вечерам читал форумы. Нашли костыль: выгрузка через CSV раз в час. Некрасиво? Да. Работает? Уже полгода.\n\nВторое. Менеджеры саботировали систему примерно месяц. Продажи у нас, кстати, не упали — но и не выросли. Помогла банальная вещь: убрали 14 обязательных полей из карточки сделки, оставили 4. Заполняемость выросла с 30% до 90% за две недели.\n\nЧто в итоге? Цикл сделки сократился с 21 до 16 дней (считали по 240 сделкам за квартал). Стоило ли оно того? Пожалуй. Но если бы начинал заново — сначала месяц бы просто рисовал процессы на доске, и только потом выбирал софт.';

  /* ---------------- инициализация ---------------- */

  function init() {
    applySettingsToUi(loadSettings());
    var theme = 'auto';
    try { theme = localStorage.getItem('aidet_theme') || 'auto'; } catch (e) {}
    applyTheme(theme);

    $('#theme-btn').onclick = function () {
      var cur = 'auto';
      try { cur = localStorage.getItem('aidet_theme') || 'auto'; } catch (e) {}
      applyTheme(cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto');
    };

    $('#input-text').addEventListener('input', function () {
      // текст правили руками — оригинал документа больше ему не соответствует
      if (state.source && state.source.text !== this.value) { state.source = null; state.fileName = ''; }
      updateCounter();
    });
    $('#check-btn').onclick = runCheck;
    $('#clear-btn').onclick = function () { setText(''); $('#results').innerHTML = ''; $('#results-actions').hidden = true; $('#humanize-card').hidden = true; };
    $('#sample-ai').onclick = function () { setText(SAMPLE_AI, 'Вставлен пример типичного ИИ-текста'); };
    $('#sample-human').onclick = function () { setText(SAMPLE_HUMAN, 'Вставлен пример живого текста'); };

    $('#file-input').addEventListener('change', function () { handleFiles(this.files); this.value = ''; });
    var drop = $('#drop-zone');
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) { handleFiles(e.dataTransfer.files); });
    document.addEventListener('paste', function (e) {
      var cd = e.clipboardData;
      if (!cd) return;
      // Word/Pages кладут в буфер и текст, и картинку-снимок выделения.
      // Если есть текст — это обычная вставка, файлы не трогаем.
      var types = cd.types || [];
      var hasText = Array.prototype.indexOf.call(types, 'text/plain') !== -1 ||
                    Array.prototype.indexOf.call(types, 'text/html') !== -1;
      if (hasText) { tryRichPaste(e, cd); return; }
      if (cd.files && cd.files.length) {
        var f = cd.files[0];
        // Только реально поддерживаемые файлы; случайные картинки из буфера молча пропускаем
        if (/\.(docx|pdf|odt|txt|md|markdown|html|htm|rtf|csv|tsv|json|log|text)$/i.test(f.name || '')) {
          e.preventDefault();
          handleFiles(cd.files);
        }
      }
    });

    $('#dl-json').onclick = function () {
      download('ai-report-' + stamp() + '.json', Report.buildJson(state.text, state.report, state.generatedAt), 'application/json');
    };
    $('#dl-md').onclick = function () {
      download('ai-report-' + stamp() + '.md', Report.buildMarkdown(state.text, state.report, state.generatedAt), 'text/markdown');
    };
    $('#dl-docx').onclick = function () { runDocxExport(this); };
    $('#copy-prompt').onclick = function () {
      copyText(Report.buildClaudePrompt(state.report, true) + '\n\nТекст:\n' + state.text, this);
    };
    $('#hum-safe').onclick = function () { runHumanize('safe'); };
    $('#hum-aggr').onclick = function () { runHumanize('aggressive'); };

    updateCounter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
