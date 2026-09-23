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

  var DEFAULTS = { profile: 'strict', lang: 'auto', segmentSize: 900, markdownAware: false, semantic: true, whitelist: '', threshold: 25 };

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
      profile: (document.querySelector('input[name="profile"]:checked') || {}).value || 'strict',
      lang: $('#set-lang').value,
      segmentSize: parseInt($('#set-seg').value, 10) || 900,
      markdownAware: $('#set-md').checked,
      semantic: true,   // смысловые повторы — часть проверки, без выключателя
      whitelist: $('#set-wl').value,
      threshold: THRESHOLD
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
    profileHint();
  }

  /* Порог приёмки один — 25. Строгость двигает не его, а сам балл: строгий
     профиль умножает балл ИИ на 1.14 и прибавляет 3, мягкий — на 0.87 и
     вычитает 3. Поэтому отдельное поле порога не нужно: это та же ручка. */
  var THRESHOLD = 25;
  var PROFILE_HINT = {
    strict: 'Балл завышается, как у самых придирчивых детекторов. «Можно сдавать» — при 25 и ниже. Прошёл здесь — пройдёт и остальные.',
    balanced: 'Средняя строгость: тот же текст получит на 4–10 баллов меньше, чем в «Строго». «Можно сдавать» — при 25 и ниже.',
    soft: 'Для сухих технических текстов: балл занижается. «Можно сдавать» — при 25 и ниже.'
  };
  function profileHint() {
    var r = document.querySelector('input[name="profile"]:checked');
    $('#profile-hint').textContent = PROFILE_HINT[r ? r.value : 'strict'];
  }

  // параметры отрисовки отчёта: порог приёмки и снимок прошлой проверки
  function renderOpts() {
    return { threshold: readSettingsFromUi().threshold, prev: state.prev };
  }

  /* ---------------- тема ---------------- */

  function applyTheme(mode) {
    if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    try { localStorage.setItem('aidet_theme', mode); } catch (e) {}
    $('#theme-btn').textContent = 'Тема: ' + (mode === 'auto' ? 'авто' : mode === 'dark' ? 'тёмная' : 'светлая');
  }

  /* ---------------- ввод ---------------- */

  function setText(text, sourceNote, source, fileName) {
    state.text = text;
    state.source = source || null;
    state.fileName = fileName || '';
    if (sourceNote) state.prev = null;   // новый документ или пример — сравнивать не с чем
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
    if (files.length > 1) { runBatch(Array.prototype.slice.call(files)); return; }
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

  /* ---------------- пакетная проверка ----------------
   * Несколько файлов — сводная таблица: балл, шкала словами, решение по
   * порогу приёмки. Смысловые повторы здесь не считаются, чтобы таблица
   * собиралась быстро; полный разбор — щелчком по строке.
   */
  var batch = [];

  function runBatch(files) {
    semRun++;
    state.report = null;
    $('#results-actions').hidden = true;
    var s = readSettingsFromUi();
    var whitelist = s.whitelist.split(/[\n,;]+/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
    batch = [];
    $('#results').innerHTML = '<div class="panel batch"><p class="sem-run">Читаю файлы: 0 из ' + files.length + '</p></div>';
    $('#results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    var i = 0;
    (function next() {
      if (i >= files.length) { renderBatch(s.threshold); return; }
      var f = files[i++];
      var st = $('#results .sem-run');
      if (st) st.textContent = 'Проверяю «' + f.name + '»: ' + i + ' из ' + files.length;
      FileLoader.read(f).then(function (res) {
        var rep = AIDetector.analyze(res.text, AIDetectorKB, {
          profile: s.profile, lang: s.lang, segmentSize: s.segmentSize, markdownAware: s.markdownAware, whitelist: whitelist
        });
        batch.push({ name: f.name, text: res.text, source: res.source, report: rep });
      }).catch(function (err) {
        batch.push({ name: f.name, error: err && err.message ? err.message : 'не удалось прочитать' });
      }).then(function () { setTimeout(next, 0); });
    })();
  }

  function renderBatch(threshold) {
    var rows = batch.map(function (b, idx) {
      if (b.error) return '<tr><td class="b-name">' + escHtml(b.name) + '</td><td colspan="7" class="muted">' + escHtml(b.error) + '</td></tr>';
      var r = b.report, acc = Report.acceptance(r, threshold), si = Report.scaleIndex(r.overall.aiScore);
      var flagged = r.heat.filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; }).length;
      var aiSeg = (r.distribution.AI || 0) + (r.distribution.LIKELY_AI || 0);
      return '<tr data-open="' + idx + '" tabindex="0">' +
        '<td class="b-name">' + escHtml(b.name) + '</td>' +
        '<td class="num">' + r.meta.words.toLocaleString('ru-RU') + '</td>' +
        '<td class="num"><b>' + r.overall.aiScore + '</b></td>' +
        '<td><span class="lvl-dot lvl-' + si + '"></span>' + Report.SCALE[si].word + '</td>' +
        '<td><span class="tag ' + (acc.ok ? 'ok' : 'no') + '">' + (acc.ok ? 'Можно сдавать' : 'На доработку') + '</span></td>' +
        '<td class="num">' + flagged + '</td>' +
        '<td class="num">' + r.hits.length + '</td>' +
        '<td class="num">' + aiSeg + '</td></tr>';
    }).join('');
    var okN = batch.filter(function (b) { return !b.error && Report.acceptance(b.report, threshold).ok; }).length;
    $('#results').innerHTML = '<div class="panel batch">' +
      '<div class="panel-head"><div><div class="eyebrow">Пакетная проверка · порог ' + threshold + '</div>' +
      '<h2>' + batch.length + ' ' + (batch.length < 5 ? 'файла' : 'файлов') + ' · можно сдавать ' + okN + '</h2></div>' +
      '<button class="pill ghost sm" id="batch-csv" type="button">Скачать таблицу (CSV)</button></div>' +
      '<div class="table-wrap"><table class="btable"><thead><tr><th>Файл</th><th class="num">Слов</th><th class="num">Балл</th>' +
      '<th>Оценка</th><th>Решение</th><th class="num">К правке</th><th class="num">Штампы</th><th class="num">ИИ-сегм.</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<p class="muted">Щелчок по строке — полный разбор файла с подсветкой и смысловыми повторами.</p></div>';
    var open = function (tr) {
      var b = batch[+tr.getAttribute('data-open')];
      state.prev = null;
      setText(b.text, 'Открыт «' + b.name + '» из пакетной проверки', b.source, b.name);
      runCheck();
    };
    Array.prototype.forEach.call(document.querySelectorAll('.btable tr[data-open]'), function (tr) {
      tr.onclick = function () { open(tr); };
      tr.onkeydown = function (e) { if (e.key === 'Enter') open(tr); };
    });
    $('#batch-csv').onclick = function () {
      var head = 'Файл;Слов;Балл;Оценка;Решение;К правке;Штампы;ИИ-сегментов';
      var lines = batch.filter(function (b) { return !b.error; }).map(function (b) {
        var r = b.report, acc = Report.acceptance(r, threshold);
        return ['"' + b.name.replace(/"/g, '""') + '"', r.meta.words, r.overall.aiScore, Report.SCALE[Report.scaleIndex(r.overall.aiScore)].word,
          acc.ok ? 'Можно сдавать' : 'На доработку',
          r.heat.filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; }).length,
          r.hits.length, (r.distribution.AI || 0) + (r.distribution.LIKELY_AI || 0)].join(';');
      });
      // BOM — чтобы Excel открыл кириллицу без плясок с кодировкой
      download('пакетная-проверка-' + stamp() + '.csv', '\ufeff' + [head].concat(lines).join('\n'), 'text/csv');
    };
  }

  /* ---------------- смысловые повторы ----------------
   * Отдельной кнопки нет: повторы — часть проверки. Считаются сразу после
   * основного разбора и попадают в сам отчёт: в подсветку текста, в раздел
   * «Смысловые повторы» и во все выгрузки. Модель (15 МБ) грузится один раз,
   * дальше она в памяти и в кеше браузера.
   */
  var semRun = 0;

  function rerender() {
    // отчёт пересобирается целиком — держим место, на котором стоял читатель
    var y = window.pageYOffset;
    Report.render($('#results'), state.text, state.report, renderOpts());
    window.scrollTo(0, y);
    var retry = $('#sem-retry');
    if (retry) retry.onclick = function () { runSemantic(); };
  }

  function runSemantic() {
    if (!state.report) return;
    var token = ++semRun;
    if (typeof Semantic === 'undefined') {
      state.report.semantic = { state: 'off', why: 'модуль js/semantic.js не загружен' };
      rerender();
      return;
    }
    if (!readSettingsFromUi().semantic) {
      state.report.semantic = { state: 'off' };
      state.report.repeats = [];
      rerender();
      return;
    }
    state.report.semantic = {
      state: 'run',
      msg: Semantic.isReady() ? 'Считаю…' : 'Загружаю модель, около 15 МБ. Это один раз — дальше она в кеше браузера.'
    };
    rerender();

    var t0 = Date.now();
    var sents = AIDetector.splitSentences(state.text);
    Semantic.findRepeats(sents, {}, function (msg) {
      if (token === semRun) Report.setSemanticStatus(msg);
    }).then(function (pairs) {
      if (token !== semRun) return;
      state.report.repeats = pairs;
      state.report.semantic = {
        state: 'done',
        secs: ((Date.now() - t0) / 1000).toFixed(1),
        backend: Semantic.backend()
      };
      rerender();
    }).catch(function (e) {
      if (token !== semRun) return;
      state.report.repeats = [];
      state.report.semantic = { state: 'error', msg: e && e.message ? e.message : String(e) };
      rerender();
      if (window.console) console.error(e);
    });
  }

  /* ---------------- анализ ---------------- */

  function runCheck() {
    var text = $('#input-text').value;
    if (!text.trim()) { note('Вставьте текст или прикрепите файл', 'err'); return; }
    if (text.trim().length < 120) { note('Текст слишком короткий: нужно хотя бы пара абзацев (150+ слов)', 'err'); return; }
    var btn = $('#check-btn');
    btn.disabled = true; btn.textContent = 'Проверяю…';
    setTimeout(function () {
      try {
        var s = readSettingsFromUi();
        var whitelist = s.whitelist.split(/[\n,;]+/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
        // снимок прошлой проверки — для блока «Сравнение»
        if (state.report && state.text && state.text !== text) state.prev = Report.snapshot(state.text, state.report);
        state.text = text;
        state.generatedAt = new Date().toISOString();
        state.report = AIDetector.analyze(text, AIDetectorKB, {
          profile: s.profile, lang: s.lang, segmentSize: s.segmentSize,
          markdownAware: s.markdownAware, whitelist: whitelist
        });
        state.humanized = null;
        state.report.repeats = [];
        // сразу показываем, что повторы считаются, — иначе в отчёте на секунду
        // мелькает «повторов нет», хотя их ещё никто не искал
        state.report.semantic = { state: s.semantic ? 'run' : 'off', msg: 'Готовлю…' };
        Report.render($('#results'), text, state.report, renderOpts());
        $('#results-actions').hidden = false;
        $('#humanize-out').innerHTML = '';
        $('#results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        runSemantic();
      } catch (e) {
        note('Ошибка анализа: ' + e.message, 'err');
        if (window.console) console.error(e);
      }
      btn.disabled = false; btn.textContent = 'Проверить';
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
        sentences: $('#opt-sent').checked,
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

  /* окно «О детекторе»: версия и история изменений из js/version.js */
  function initAbout() {
    var V = window.DetectorVersion;
    if (!V) return;
    $('#brand-ver').textContent = 'v' + V.version;
    $('#about-title').textContent = V.full;
    $('#about-date').textContent = 'Версия от ' + V.date;
    $('#about-changes').innerHTML = V.changes.map(function (c) {
      return '<div class="about-ver"><b>v' + c.v + '</b><span class="muted">' + c.date + '</span><ul>' +
        c.items.map(function (x) { return '<li>' + escHtml(x) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
    var dlg = $('#about');
    $('#about-btn').onclick = function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); };
    $('#about-close').onclick = function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); };
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  function init() {
    initAbout();
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
    $('#clear-btn').onclick = function () {
      semRun++;   // отменяем незаконченный счёт повторов
      state.report = null; state.prev = null;
      setText(''); $('#results').innerHTML = '';
      $('#results-actions').hidden = true;
    };
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
      var base = (state.fileName || '').replace(/\.[a-z0-9]+$/i, '').trim().slice(0, 60) || stamp();
      download('для нейросети — ' + base + '.json', Report.buildJson(state.text, state.report, state.generatedAt), 'application/json');
    };
    $('#dl-md').onclick = function () {
      download('ai-report-' + stamp() + '.md', Report.buildMarkdown(state.text, state.report, state.generatedAt), 'text/markdown');
    };
    $('#dl-docx').onclick = function () { runDocxExport(this); };
    $('#copy-prompt').onclick = function () {
      copyText(Report.buildClaudePrompt(state.report, true) + '\n\nТекст:\n' + state.text, this);
    };
    $('#dl-client').onclick = function () {
      var html = Report.buildClientHtml($('#results'), state.report, {
        fileName: state.fileName, generatedAt: state.generatedAt, threshold: readSettingsFromUi().threshold
      });
      download('отчёт-' + ((state.fileName || '').replace(/\.[a-z0-9]+$/i, '') || stamp()) + '.html', html, 'text/html');
    };
    Array.prototype.forEach.call(document.querySelectorAll('input[name="profile"]'), function (r) {
      r.addEventListener('change', profileHint);
    });

    updateCounter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
