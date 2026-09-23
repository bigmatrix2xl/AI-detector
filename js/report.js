/*
 * Рендер отчёта: вердикт, шкала, распределение сегментов, метрики,
 * тепловая полоса, подсветка текста, сегменты, рекомендации.
 * Плюс сборка экспортов: JSON, Markdown, промпт для Claude.
 */
(function (root) {
  'use strict';

  var LABELS = {
    AI:           { title: 'ИИ',              cls: 'critical', icon: '✕', desc: 'выраженные признаки генерации' },
    LIKELY_AI:    { title: 'Похоже на ИИ',    cls: 'serious',  icon: '!', desc: 'заметные признаки генерации' },
    LIKELY_HUMAN: { title: 'Скорее человек',  cls: 'warn',     icon: '~', desc: 'слабые сомнения' },
    HUMAN:        { title: 'Человек',         cls: 'good',     icon: '✓', desc: 'признаков генерации нет' }
  };
  var STATUS = {
    good: { title: 'Хорошо', icon: '✓' },
    warn: { title: 'Внимание', icon: '!' },
    bad:  { title: 'Проблема', icon: '✕' }
  };
  var PRIO = { high: 'Важно', medium: 'Желательно', low: 'Штрих' };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function scoreLabel(score, report) {
    // квантование числа 0..100 в 4 статуса сегментов (для тепла и шкалы)
    if (score >= 72) return 'AI';
    if (score >= 55) return 'LIKELY_AI';
    if (score >= 38) return 'LIKELY_HUMAN';
    return 'HUMAN';
  }

  /* ---------------- распределение сегментов ---------------- */
  function renderDistribution(report) {
    var total = report.segments.length || 1;
    var order = ['AI', 'LIKELY_AI', 'LIKELY_HUMAN', 'HUMAN'];
    var rows = order.map(function (k) {
      var n = report.distribution[k] || 0;
      var pct = Math.round(n / total * 100);
      var L = LABELS[k];
      return '<div class="dist-row">' +
        '<span class="dist-name"><i class="dot ' + L.cls + '"></i>' + L.icon + ' ' + L.title + '</span>' +
        '<span class="dist-track"><span class="dist-fill ' + L.cls + '" style="width:' + pct + '%"></span></span>' +
        '<span class="dist-val">' + n + ' сегм. · ' + pct + '%</span></div>';
    }).join('');
    return el('<div class="dist"><h3>Распределение сегментов <span class="muted">(' + total + ' по ~' +
      report.meta.segmentSize + ' симв.)</span></h3>' + rows + '</div>');
  }

  /* ---------------- метрики ---------------- */
  function renderMetrics(report) {
    var cards = report.metrics.map(function (m) {
      var st = STATUS[m.status];
      return '<details class="metric ' + m.status + '">' +
        '<summary><span class="m-head"><b>' + esc(m.title) + '</b>' +
        '<span class="chip ' + m.status + '">' + st.icon + ' ' + st.title + '</span></span>' +
        '<span class="m-bar"><span class="m-fill" style="width:' + m.signal + '%"></span></span>' +
        '<span class="m-sig">' + m.signal + '/100</span></summary>' +
        '<div class="m-body"><p>' + esc(m.explain) + '</p><p class="muted">' + esc(m.detail) +
        '</p><p class="muted">Вес в итоговой оценке: ' + Math.round(m.weight * 100) + '%, надёжность на этом тексте: ' +
        Math.round(m.reliability * 100) + '%.</p></div></details>';
    }).join('');
    return el('<div class="metrics"><h3>Метрики <span class="muted">(0 — человек, 100 — ИИ; кликните для деталей)</span></h3>' + cards + '</div>');
  }

  /* ---------------- тепловая полоса ---------------- */
  function renderHeat(report) {
    if (!report.heat.length) return el('<div></div>');
    var blocks = report.heat.map(function (h, i) {
      var L = LABELS[h.level || scoreLabel(h.score)];
      var why = (h.reasons || []).filter(function (r) { return r.code !== 'ok'; })
        .map(function (r) { return '• ' + r.title; }).join('\n');
      return '<span class="heat-cell ' + L.cls + '" title="Предложение ' + (i + 1) + ' · ' + h.score +
        '/100 · ' + L.title + (why ? '\n' + why : '') + '\n\n' + esc(h.preview) +
        '" data-start="' + h.start + '"></span>';
    }).join('');
    var legend = ['HUMAN', 'LIKELY_HUMAN', 'LIKELY_AI', 'AI'].map(function (k) {
      return '<span><i class="dot ' + LABELS[k].cls + '"></i>' + LABELS[k].icon + ' ' + LABELS[k].title + '</span>';
    }).join('');
    return el('<div class="heat"><h3>Карта текста по предложениям <span class="muted">(наведите курсор)</span></h3>' +
      '<div class="heat-strip">' + blocks + '</div><div class="heat-legend">' + legend + '</div></div>');
  }

  /* ---------------- находки в едином виде ----------------
   * Один список пометок для всего: подсветки на экране и разметки в DOCX.
   * kind: ai | starter | bur | human; tip — короткая подсказка (title),
   * comment — развёрнутое пояснение для примечания в Word.
   */
  function replHint(h) {
    if (!h.repl || !h.repl.length) return '';
    if (h.repl[0] === '') return ' → лучше удалить';
    return ' → ' + h.repl.filter(Boolean).join(' / ');
  }

  function buildMarks(report, opts) {
    opts = opts || {};
    var marks = [];

    report.hits.forEach(function (h) {
      var fix = (!h.repl || !h.repl.length) ? 'Уберите оборот или скажите то же самое конкретнее.'
        : h.repl[0] === '' ? 'Проще всего удалить: смысл не пострадает.'
        : 'Замените на «' + h.repl.filter(Boolean).join('» / «') + '» — или уберите совсем.';
      marks.push({
        start: h.start, end: h.end, kind: 'ai', cls: 'mk-ai', prio: 0, text: h.match,
        tip: (h.note || 'Штамп ИИ') + replHint(h),
        comment: 'Штамп ИИ: «' + h.match + '».\n' + (h.note ? h.note + '\n' : '') +
          'Что делать: ' + fix + ' Лучше всего — заменить конкретикой: цифрой, примером, деталью из практики.'
      });
    });
    (report.starterHits || []).forEach(function (h) {
      marks.push({
        start: h.start, end: h.end, kind: 'starter', cls: 'mk-starter', prio: 1, text: h.match,
        tip: 'Шаблонное начало предложения — начните с сути: существительного, глагола, цифры или вопроса',
        comment: 'Шаблонное начало предложения: «' + h.match + '».\n' +
          'Так предложения начинает нейросеть, а живой автор — почти никогда.\n' +
          'Что делать: начните сразу с сути — с существительного, глагола, цифры или вопроса.'
      });
    });
    (report.burHits || []).forEach(function (h) {
      marks.push({
        start: h.start, end: h.end, kind: 'bur', cls: 'mk-bur', prio: 2, text: h.match,
        tip: h.note || 'Канцелярит — замените активным глаголом',
        comment: 'Канцелярит: «' + h.match + '».\n' +
          'Что делать: замените активным глаголом — «доставляем» вместо «осуществляется доставка», ' +
          '«отвечаем за» вместо «является ответственным за».'
      });
    });
    if (opts.human !== false) {
      report.humanHits.forEach(function (h) {
        marks.push({
          start: h.start, end: h.end, kind: 'human', cls: 'mk-human', prio: 3, text: h.match,
          tip: 'Живой человеческий маркер — сохраните при редактуре',
          comment: ''
        });
      });
    }

    marks.sort(function (a, b) { return a.start - b.start || a.prio - b.prio; });
    var out = [], pos = 0;
    marks.forEach(function (m) {
      if (m.start < pos) return;   // пересечения отбрасываем: приоритет у более важного типа
      out.push(m);
      pos = m.end;
    });

    /* Пометки на предложениях — для Word.
     * На экране предложение красится фоном через <span>, здесь так нельзя:
     * в Word у фрагмента текста только один цвет заливки. Поэтому предложение
     * режется на куски, свободные от словесных пометок, и красится бледно-серым.
     * Яркие пометки на словах остаются поверх, как и были.
     */
    if (opts.sentences) {
      var frags = [];
      var reps = repeatMap(report);
      (report.heat || []).forEach(function (h) {
        var flagged = h.level === 'AI' || h.level === 'LIKELY_AI';
        var notes = (h.reasons || []).filter(function (r) { return r.editorial; });
        var rp = reps[h.start] || [];
        if (!flagged && !notes.length && !rp.length) return;

        var why = (h.reasons || []).filter(function (r) { return r.code !== 'ok'; });
        var body = (flagged
              ? 'Предложение выглядит машинным (' + h.score + '/100). Что именно сработало:'
              : rp.length ? 'Это предложение пересказывает другое место текста.'
              : 'Заметка редактору по этому предложению:') + '\n' +
          why.map(function (r) { return '— ' + r.title + (r.detail ? ': ' + r.detail : ''); }).join('\n') +
          (rp.length ? '\n\nСмысловой повтор: то же самое сказано в другом месте текста:' +
            rp.map(function (r) {
              return '\n— близость ' + r.score.toFixed(2) +
                     (r.level === 'strong' ? ' (та же мысль): ' : ': ') + '«' + r.text.replace(/\s+/g, ' ') + '»';
            }).join('') + '\nСведите два места в одно или разведите по смыслу.' : '') +
          (flagged ? '\n\nЧто делать: перепишите его своими словами — уберите отглагольные ' +
                     'существительные, добавьте конкретику (число, название, деталь из работы).' : '');

        // куски предложения, не занятые словесными пометками
        var inner = out.filter(function (m) { return m.end > h.start && m.start < h.end; });
        var cur = h.start, first = true;
        inner.forEach(function (m) {
          if (m.start > cur) {
            frags.push({ start: cur, end: Math.min(m.start, h.end), first: first, body: body, flagged: flagged, score: h.score });
            first = false;
          }
          cur = Math.max(cur, m.end);
        });
        if (cur < h.end) { frags.push({ start: cur, end: h.end, first: first, body: body, flagged: flagged, score: h.score }); }
      });

      frags.forEach(function (fr) {
        out.push({
          start: fr.start, end: fr.end, kind: 'sent', cls: 'mk-sent', prio: 4,
          text: '', // не участвует в дедупликации комментариев по фразе
          tip: fr.flagged ? 'Предложение выглядит машинным (' + fr.score + '/100)'
                          : 'Заметка редактору по предложению',
          comment: fr.first ? fr.body : ''
        });
      });
      out.sort(function (a, b) { return a.start - b.start; });
    }

    return out;
  }

  /* ---------------- подсветка текста ---------------- */
  /* Подсветка текста в два слоя.
   * Нижний слой — предложение целиком: заливка по баллу «машинности»
   * (js/sentences.js). Именно это показывают внешние детекторы, и именно
   * этого нам не хватало — читателя отталкивает предложение, а не слово.
   * Верхний слой — прежние пометки на словах: штампы, канцелярит, шаблонные
   * начала, живые маркеры. Они остаются как были и рисуются поверх заливки.
   */
  var SENT_CLS = { AI: 'sl-ai', LIKELY_AI: 'sl-likely', LIKELY_HUMAN: 'sl-mild', HUMAN: '' };

  // \n внутри атрибута title кодируем сущностью: в конце renderHighlighted все
  // переводы строк заменяются на <br>, и внутрь атрибутов это лезть не должно
  function attr(sv) { return esc(sv).replace(/\n/g, '&#10;'); }

  function sentenceTitle(h) {
    var out = 'Предложение: ' + h.score + '/100 · ' + LABELS[h.level].title;
    (h.reasons || []).forEach(function (r) {
      if (r.code === 'ok') return;
      out += '\n\n' + (r.editorial ? '✎ ' : '• ') + r.title + (r.detail ? ': ' + r.detail : '');
    });
    return out;
  }

  /* Смысловые повторы приходят из js/semantic.js и кладутся в report.repeats.
     Держать их отдельно от отчёта смысла нет: они нужны и в подсветке,
     и в JSON, и в Markdown, и в примечаниях Word. */
  function repeatMap(report) {
    var map = {};
    (report.repeats || []).forEach(function (p) {
      [['a', 'b'], ['b', 'a']].forEach(function (pair) {
        var me = p[pair[0]], other = p[pair[1]];
        (map[me.start] = map[me.start] || []).push({
          score: p.score, level: p.level, text: other.text, start: other.start
        });
      });
    });
    return map;
  }

  function repeatTitle(rp) {
    return 'Смысловой повтор: то же самое сказано ещё ' +
      (rp.length === 1 ? 'один раз' : rp.length + ' раза') + '.' +
      rp.map(function (r) {
        return '\n\nблизость ' + r.score.toFixed(2) + (r.level === 'strong' ? ' — та же мысль' : '') +
               '\n«' + r.text.replace(/\s+/g, ' ') + '»';
      }).join('');
  }

  function renderHighlighted(text, report) {
    var marks = buildMarks(report, {});
    var reps = repeatMap(report);
    var counts = { 'mk-ai': 0, 'mk-starter': 0, 'mk-bur': 0, 'mk-human': 0 };
    var sents = (report.heat || []).slice().sort(function (a, b) { return a.start - b.start; });

    // пометки, попадающие в отрезок [from, to)
    var mi = 0;
    function renderRange(from, to) {
      var out = '', pos = from;
      while (mi < marks.length && marks[mi].start < to) {
        var m = marks[mi];
        if (m.end <= from) { mi++; continue; }
        if (m.start >= pos) {
          out += esc(text.slice(pos, m.start));
          var a = Math.max(m.start, from), b = Math.min(m.end, to);
          counts[m.cls]++;
          out += '<mark class="' + m.cls + '" title="' + attr(m.tip) + '">' +
                 esc(text.slice(a, b)) + '</mark>';
          pos = b;
        }
        if (m.end > to) break;
        mi++;
      }
      out += esc(text.slice(pos, to));
      return out;
    }

    var html = '', pos = 0, tinted = 0, notes = 0, repeated = 0;
    var byLevel = { 'sl-ai': 0, 'sl-likely': 0, 'sl-mild': 0 };
    sents.forEach(function (h) {
      if (h.start < pos) return;
      html += renderRange(pos, h.start);
      var ed = (h.reasons || []).filter(function (r) { return r.editorial; });
      var rp = reps[h.start] || [];
      var cls = SENT_CLS[h.level] || '';
      if (cls) { tinted++; byLevel[cls]++; }
      if (ed.length) notes++;
      if (rp.length) repeated++;
      // Заливка есть у любого отмеченного предложения, включая повтор и заметку
      // редактору: значок в конце строки сам по себе не показывает, к чему он.
      var klass = 'sent' + (cls ? ' ' + cls : '') +
                  (rp.length ? ' has-rep' : '') + (ed.length ? ' has-note' : '');
      var noteTip = 'Заметка редактору (на ИИ не указывает):' +
        ed.map(function (r) { return '\n\n✎ ' + r.title + ': ' + r.detail; }).join('');
      var tip = [];
      // у машинных предложений заметки уже внутри sentenceTitle — не дублируем
      if (cls) tip.push(sentenceTitle(h));
      else if (ed.length) tip.push(noteTip);
      if (rp.length) tip.push(repeatTitle(rp));
      // Хвостовые переводы строк выносим за пределы предложения: иначе значки
      // ✎ и 🔁 уезжают на следующую строку и выглядят как мусор.
      var end = h.end;
      while (end > h.start && /\s/.test(text.charAt(end - 1))) end--;
      html += '<span class="' + klass + '" id="sent-' + h.start + '"' +
              (tip.length ? ' title="' + attr(tip.join('\n\n')) + '"' : '') + '>' +
              renderRange(h.start, end) + '</span>';
      // Значки в конце предложения — метка типа находки; подчёркивания по всему
      // тексту сливались в кашу, поэтому от них отказались.
      if (ed.length) {
        html += '<span class="note-flag" title="' + attr(noteTip) + '">✎</span>';
      }
      if (rp.length) {
        html += '<span class="rep-flag" role="button" tabindex="0" data-jump="' +
          rp.map(function (r) { return r.start; }).join(',') + '" title="' +
          attr(repeatTitle(rp) + '\n\nЩелчок — перейти ко второму месту.') + '">↻</span>';
      }
      html += renderRange(end, h.end);
      pos = h.end;
    });
    html += renderRange(pos, text.length);

    var words = counts['mk-ai'] + counts['mk-starter'] + counts['mk-bur'] + counts['mk-human'];
    // Легенда — она же фильтр: щелчок прячет тип подсветки в тексте.
    // У каждого пункта количество и подсказка, иначе непонятно, что с чем связано.
    function chip(key, swatch, label, n, tip) {
      return '<button type="button" class="lg-chip" data-filter="' + key + '" aria-pressed="true" data-tip="' +
        attr(tip + '\n\nЩелчок — спрятать или показать в тексте.') + '">' + swatch +
        '<span class="lg-label">' + label + '</span><span class="lg-n">' + n + '</span></button>';
    }
    var legend = '<div class="hl-legend">' +
      '<span class="lg-head">Предложения</span><div class="lg-chips">' +
      chip('sl-ai', '<i class="sw sl-ai"></i>', 'машинное', byLevel['sl-ai'],
        'Машинное предложение\nНабрало 58 баллов и больше: штампы, канцелярит, шаблоны вроде «не X, а Y». Его стоит переписать.') +
      chip('sl-likely', '<i class="sw sl-likely"></i>', 'похоже на машинное', byLevel['sl-likely'],
        'Похоже на машинное\n38–57 баллов. Есть заметные признаки ИИ — лучше переписать.') +
      chip('sl-mild', '<i class="sw sl-mild"></i>', 'есть сомнения', byLevel['sl-mild'],
        'Есть сомнения\n20–37 баллов. Слабые признаки; править необязательно.') +
      chip('rep', '<span class="rep-flag">↻</span>', 'смысловой повтор', repeated,
        'Смысловой повтор\nПредложение пересказывает другое место текста. На ИИ не указывает — это подсказка редактору: одну из двух формулировок можно убрать.') +
      chip('note', '<span class="note-flag">✎</span>', 'заметка редактору', notes,
        'Заметка редактору\nДлинный перечень или повтор словосочетаний. На ИИ не указывает, в балл не входит.') +
      '</div></div><div class="hl-legend">' +
      '<span class="lg-head">Слова</span><div class="lg-chips">' +
      chip('mk-ai', '<mark class="mk-ai">штамп ИИ</mark>', '', counts['mk-ai'],
        'Штамп ИИ\nФраза из базы типичных оборотов нейросетей. Наведите на неё в тексте — покажем, чем заменить.') +
      chip('mk-starter', '<mark class="mk-starter">шаблонное начало</mark>', '', counts['mk-starter'],
        'Шаблонное начало\nПредложение начинается со связки «Таким образом», «Кроме того», «При этом». Начните с сути.') +
      chip('mk-bur', '<mark class="mk-bur">канцелярит</mark>', '', counts['mk-bur'],
        'Канцелярит\n«Осуществляется», «данный», «является». Замените простым глаголом.') +
      chip('mk-human', '<mark class="mk-human">живой маркер</mark>', '', counts['mk-human'],
        'Живой маркер\n«Скажем», «на практике», «у нас» — признаки живой речи. Их стоит сохранить.') +
      '</div></div>';

    var empty = (words === 0 && tinted === 0)
      ? '<p class="hl-empty">✓ Подсвечивать нечего: ни одно предложение не набрало машинных признаков, ' +
        'штампов и канцелярита из базы тоже нет.</p>'
      : '';
    var head = 'подсвечено ' + tinted + ' ' +
      plural(tinted, 'предложение', 'предложения', 'предложений') +
      ' и ' + words + ' ' + plural(words, 'слово', 'слова', 'слов') +
      (notes ? ' · ' + notes + ' ' + plural(notes, 'заметка', 'заметки', 'заметок') + ' редактору' : '') +
      (repeated ? ' · ' + repeated + ' ' + plural(repeated, 'повтор', 'повтора', 'повторов') : '');

    return el('<div class="hl"><h3>Текст с подсветкой <span class="muted">(' + head + ')</span></h3>' +
      legend + empty + '<div class="hl-text">' + html.replace(/\n/g, '<br>') + '</div>' +
      '<p class="muted hl-hint">Наведите курсор на подсвеченное предложение — покажем, ' +
      'за какие именно признаки оно отмечено, щелчок закрепит подсказку. Щелчок по ↻ перебрасывает ко второму ' +
      'месту, где сказано то же самое.</p></div>');
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  /* ---------------- смысловые повторы ----------------
   * Отдельной кнопки и отдельного блока больше нет: повторы считаются сами
   * при каждой проверке и живут внутри отчёта — в подсветке текста, здесь и
   * во всех выгрузках (JSON, промпт для Claude, Markdown, примечания Word).
   * report.semantic = { state: 'run' | 'done' | 'off' | 'error', msg, secs, backend }
   */
  var REP_ABOUT = 'Предложения, которые говорят одно и то же разными словами. ' +
    'Словарь такое не находит принципиально: общих слов у них может не быть вовсе. ' +
    'Считает маленькая языковая модель прямо в браузере, текст никуда не отправляется. ' +
    'На ИИ повтор не указывает — это подсказка редактору.';

  function renderRepeats(report) {
    var sem = report.semantic || {};
    var pairs = report.repeats || [];
    var body;

    if (sem.state === 'off') {
      body = '<p class="muted">' + esc(REP_ABOUT) + '</p>' +
        '<p class="muted">Поиск выключен' + (sem.why ? ': ' + esc(sem.why) : ' в настройках анализа') + '.</p>';
    } else if (sem.state === 'run') {
      body = '<p class="muted">' + esc(REP_ABOUT) + '</p>' +
        '<p class="sem-run" id="sem-status">' + esc(sem.msg || 'Считаю…') + '</p>';
    } else if (sem.state === 'error') {
      body = '<p class="muted">' + esc(REP_ABOUT) + '</p>' +
        '<p class="sem-err">Посчитать не удалось: ' + esc(sem.msg || 'неизвестная ошибка') +
        '. На остальной отчёт это не влияет.</p>' +
        '<div class="btn-row"><button class="btn" id="sem-retry" type="button">Попробовать ещё раз</button></div>';
    } else if (!pairs.length) {
      body = '<p class="hl-empty">✓ Смысловых повторов нет: ни одно предложение не пересказывает другое.</p>';
    } else {
      var rows = pairs.slice(0, 40).map(function (p) {
        var tag = p.level === 'strong'
          ? '<span class="chip critical">✕ одна и та же мысль</span>'
          : '<span class="chip warn">~ похоже</span>';
        var quote = function (side) {
          return '<blockquote>' + esc(p[side].text.replace(/\s+/g, ' ')) +
            ' <button class="jump" type="button" data-jump="' + p[side].start +
            '">показать в тексте</button></blockquote>';
        };
        return '<div class="rep ' + p.level + '">' +
          '<div class="rep-head">' + tag + '<span class="rep-score">близость ' +
          p.score.toFixed(2) + '</span></div>' + quote('a') + quote('b') + '</div>';
      }).join('');
      body = '<p class="muted">' + esc(REP_ABOUT) + ' Найдено пар: <b>' + pairs.length + '</b>' +
        (pairs.length > 40 ? ' (показаны первые 40)' : '') +
        '. В тексте они помечены значком ↻ и синей подсветкой; в выгрузках — отдельным разделом.</p>' + rows;
    }

    var foot = sem.state === 'done' && sem.secs
      ? '<p class="muted sem-foot">Посчитано за ' + sem.secs + ' с · движок ' +
        (sem.backend === 'wasm-simd' ? 'WebAssembly SIMD' : 'JavaScript') +
        ' · дальше модель уже в памяти, повторы считаются при каждой проверке.</p>'
      : '';

    return el('<div class="reps-card"><h3>Смысловые повторы</h3>' + body + foot + '</div>');
  }

  // прогресс модели пишем прямо в строку статуса, без пересборки всего отчёта
  function setSemanticStatus(msg) {
    var n = document.getElementById('sem-status');
    if (n) n.textContent = msg;
  }

  /* Щелчок по 🔁 или по «показать в тексте» — прокрутка ко второму месту и
     вспышка: иначе непонятно, с чем именно предложение перекликается. */
  function bindJumps(container) {
    container.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-jump]') : null;
      if (!t || !container.contains(t)) return;
      var list = String(t.getAttribute('data-jump')).split(',').filter(Boolean);
      if (!list.length) return;
      var i = (parseInt(t.getAttribute('data-jump-i'), 10) || 0) % list.length;
      t.setAttribute('data-jump-i', i + 1);
      var target = container.querySelector('#sent-' + list[i]);
      if (!target) return;
      Array.prototype.forEach.call(container.querySelectorAll('.sent.flash'), function (n) {
        n.classList.remove('flash');
      });
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // перезапуск анимации: без reflow повторный щелчок по тому же месту молчит
      void target.offsetWidth;
      target.classList.add('flash');
      setTimeout(function () { target.classList.remove('flash'); }, 2200);
    });
  }

  /* ---------------- сегменты ---------------- */
  function renderSegments(report) {
    var items = report.segments.map(function (s) {
      var L = LABELS[s.label];
      var preview = s.text.trim().slice(0, 110).replace(/\s+/g, ' ');
      return '<details class="seg ' + L.cls + '">' +
        '<summary><span class="chip ' + L.cls + '">' + L.icon + ' ' + L.title + '</span>' +
        '<span class="seg-score">' + s.score + '/100</span>' +
        '<span class="seg-prev">' + esc(preview) + '…</span>' +
        '<span class="muted seg-size">' + s.chars + ' симв.</span></summary>' +
        '<div class="seg-body"><ul>' + s.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') +
        '</ul><blockquote>' + esc(s.text.trim()).replace(/\n/g, '<br>') + '</blockquote></div></details>';
    }).join('');
    return el('<div class="segs"><h3>Сегменты текста</h3>' + items + '</div>');
  }

  /* ---------------- рекомендации ---------------- */
  function renderRecs(report) {
    var recs = report.recommendations.map(function (r) {
      return '<div class="rec ' + r.priority + '"><span class="chip ' +
        (r.priority === 'high' ? 'critical' : r.priority === 'medium' ? 'serious' : 'warn') + '">' +
        PRIO[r.priority] + '</span><div><b>' + esc(r.title) + '</b><p>' + esc(r.detail) + '</p></div></div>';
    }).join('');
    var strengths = report.strengths.length
      ? '<div class="strengths"><h4>Что уже хорошо</h4><ul>' +
        report.strengths.map(function (s) { return '<li>✓ ' + esc(s) + '</li>'; }).join('') + '</ul></div>'
      : '';
    return el('<div class="recs"><h3>Что исправить <span class="muted">(по убыванию важности)</span></h3>' +
      (recs || '<p class="muted">Существенных проблем не найдено.</p>') + strengths + '</div>');
  }

  /* ---------------- сборка страницы отчёта ---------------- */
  /* ---------------- итог: балл, шкала словами, решение ----------------
   * Голое число читается плохо, поэтому рядом — шкала из пяти слов,
   * как у Pangram, и решение «можно сдавать / на доработку» по порогу
   * приёмки, как у Главреда. */
  var SCALE = [
    { max: 19, word: 'Человек' }, { max: 39, word: 'Скорее человек' },
    { max: 59, word: 'Неясно' }, { max: 79, word: 'Скорее ИИ' }, { max: 100, word: 'ИИ' }
  ];
  function scaleIndex(score) {
    for (var i = 0; i < SCALE.length; i++) if (score <= SCALE[i].max) return i;
    return SCALE.length - 1;
  }

  function strongRepeats(report) {
    return (report.repeats || []).filter(function (p) { return p.level === 'strong'; }).length;
  }

  // Условия приёмки. threshold — порог балла; остальное — нули.
  function acceptance(report, threshold) {
    var aiSeg = (report.distribution.AI || 0) + (report.distribution.LIKELY_AI || 0);
    var aiSent = (report.heat || []).filter(function (h) { return h.level === 'AI'; }).length;
    var sem = report.semantic || {};
    var checks = [
      { ok: report.overall.aiScore <= threshold, text: 'Балл ' + report.overall.aiScore + ' при пороге ' + threshold },
      { ok: aiSeg === 0, text: aiSeg ? aiSeg + ' ' + plural(aiSeg, 'сегмент', 'сегмента', 'сегментов') + ' похожи на ИИ' : 'Нет сегментов, похожих на ИИ' },
      { ok: aiSent === 0, text: aiSent ? aiSent + ' ' + plural(aiSent, 'машинное предложение', 'машинных предложения', 'машинных предложений') : 'Нет машинных предложений' }
    ];
    if (sem.state === 'done') {
      var st = strongRepeats(report);
      // Повторы на ИИ не указывают — это подсказка редактору, на решение не влияет
      if (st) checks.push({ info: true, text: st + ' ' + plural(st, 'сильный повтор', 'сильных повтора', 'сильных повторов') + ' мысли — на решение не влияет' });
    }
    return { ok: checks.every(function (c) { return c.info || c.ok; }), checks: checks, threshold: threshold };
  }

  function renderSummary(report, opts) {
    var score = report.overall.aiScore, si = scaleIndex(score);
    var scale = SCALE.map(function (x, i) {
      return '<span class="sc-step' + (i === si ? ' on' : '') + '">' + x.word + '</span>';
    }).join('');
    var acc = acceptance(report, opts.threshold);
    var flagged = (report.heat || []).filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; }).length;
    var sem = report.semantic || {};
    // на плитке — только сильные повторы: слабые переклички есть в любом длинном тексте
    var reps = sem.state === 'done' ? String(strongRepeats(report)) : '…';
    var repsAll = sem.state === 'done' ? (report.repeats || []).length : 0;

    var scoreCard = '<div class="score-card lvl-' + si + '">' +
      '<div class="eyebrow">Балл ИИ · ' + esc(report.meta.profileName) + ' профиль</div>' +
      '<div class="score-num">' + score + '<span>из 100</span></div>' +
      '<div class="score-word">' + SCALE[si].word + '</div>' +
      '<div class="sc-scale" role="img" aria-label="Шкала: ' + SCALE[si].word + '">' + scale + '</div>' +
      '<div class="score-meta">' + report.meta.words.toLocaleString('ru-RU') + ' слов · ' +
        report.meta.sentences + ' предл. · уверенность ' + report.overall.confidence + '</div></div>';

    var accCard = '<div class="accept-card ' + (acc.ok ? 'ok' : 'no') + '">' +
      '<div class="eyebrow">Решение</div>' +
      '<div class="accept-word">' + (acc.ok ? 'Можно сдавать' : 'На доработку') + '</div>' +
      '<ul class="accept-list">' + acc.checks.map(function (c) {
        return '<li class="' + (c.info ? 'info' : c.ok ? 'ok' : 'no') + '">' + esc(c.text) + '</li>';
      }).join('') + '</ul>' +
      '<div class="accept-foot">Можно сдавать при балле 25 и ниже. Балл уже учитывает выбранную строгость</div></div>';

    function kpi(label, value, hint, tone, sub) {
      return '<div class="kpi' + (tone ? ' ' + tone : '') + '" title="' + attr(hint) + '"><div class="eyebrow">' + label +
        '</div><div><div class="kpi-num">' + value + '</div>' + (sub ? '<div class="kpi-sub">' + sub + '</div>' : '') + '</div></div>';
    }
    var kpis = '<div class="kpis">' +
      kpi('К правке', flagged, 'Предложения уровня «машинное» и «похоже на машинное» — их стоит переписать.', flagged ? 'warn' : '') +
      kpi('Штампы', report.hits.length, 'Фразы и шаблоны из базы типичных оборотов нейросетей.', report.hits.length > 2 ? 'warn' : '') +
      kpi('Канцелярит', report.burHits.length, '«Осуществляется», «данный», «является» и подобное.', '') +
      kpi('Сильные повторы', reps, 'Пары предложений, где одна мысль сказана дважды почти теми же словами по смыслу. На ИИ не указывают и на решение не влияют — это подсказка редактору.', '',
        repsAll ? 'из ' + repsAll + ' ' + plural(repsAll, 'пары', 'пар', 'пар') + ' перекличек' : '') +
      '</div>';

    return el('<div class="summary">' + scoreCard + accCard + kpis + '</div>');
  }

  /* ---------------- сравнение с прошлой проверкой ----------------
   * prev — снимок прошлой проверки того же документа: балл, счётчики и
   * предложения. Разница по предложениям — через наибольшую общую
   * подпоследовательность: что удалили, что появилось. */
  function snapshot(text, report) {
    return {
      score: report.overall.aiScore,
      flagged: (report.heat || []).filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; }).length,
      hits: report.hits.length,
      bur: report.burHits.length,
      repeats: (report.semantic || {}).state === 'done' ? (report.repeats || []).length : null,
      words: report.meta.words,
      sents: splitForDiff(text)
    };
  }
  function splitForDiff(text) {
    var S = (typeof AIDetector !== 'undefined') ? AIDetector : null;
    var list = S ? S.splitSentences(text).map(function (x) { return x.text; }) : text.split(/(?<=[.!?…])\s+/);
    return list.map(function (t) { return t.replace(/\s+/g, ' ').trim(); }).filter(function (t) { return t.length > 1; });
  }
  function diffSentences(a, b) {
    var n = a.length, m = b.length, i, j;
    var L = []; for (i = 0; i <= n; i++) { L.push(new Uint16Array(m + 1)); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: 'del', s: a[i++] });
      else out.push({ t: 'add', s: b[j++] });
    }
    while (i < n) out.push({ t: 'del', s: a[i++] });
    while (j < m) out.push({ t: 'add', s: b[j++] });
    return out;
  }

  function renderCompare(prev, cur) {
    // Каждая плитка: было → стало и словами, лучше или хуже. Голые «1 → 1 (0)»
    // никто не мог прочитать.
    function card(label, a, b, lowerIsBetter, unit) {
      if (a === null || b === null) return '';
      var d = b - a, tag;
      if (lowerIsBetter === null) {
        tag = d === 0 ? '<span class="cmp-tag same">без изменений</span>'
          : '<span class="cmp-tag same">' + (d > 0 ? '+' : '−') + Math.abs(d) + ' ' + unit + '</span>';
      } else if (d === 0) tag = '<span class="cmp-tag same">без изменений</span>';
      else {
        var better = (d < 0) === lowerIsBetter;
        tag = '<span class="cmp-tag ' + (better ? 'better' : 'worse') + '">' + (better ? 'лучше' : 'хуже') + ' на ' + Math.abs(d) + '</span>';
      }
      return '<div class="cmp-card"><div class="cmp-label">' + label + '</div>' +
        '<div class="cmp-vals"><span class="cmp-a">' + a + '</span><span class="cmp-arrow">→</span><span class="cmp-b">' + b + '</span></div>' +
        tag + '</div>';
    }
    var diff = diffSentences(prev.sents, cur.sents);
    var dels = diff.filter(function (x) { return x.t === 'del'; }).length;
    var adds = diff.length - dels;
    // вставили совсем другой текст — сравнивать нечего
    var common = prev.sents.length - dels;
    if (common < 0.3 * Math.min(prev.sents.length, cur.sents.length)) return null;

    var ds = cur.score - prev.score;
    var headline = ds < 0 ? 'Стало лучше: балл ИИ снизился с ' + prev.score + ' до ' + cur.score + '.'
      : ds > 0 ? 'Стало хуже: балл ИИ вырос с ' + prev.score + ' до ' + cur.score + '.'
      : 'Балл ИИ не изменился — ' + cur.score + '.';
    var what = diff.length
      ? ' В тексте изменено ' + Math.max(dels, adds) + ' ' + plural(Math.max(dels, adds), 'предложение', 'предложения', 'предложений') + '.'
      : ' Текст не менялся.';
    var list = diff.slice(0, 60).map(function (x) {
      return '<li class="' + x.t + '"><span class="cmp-mark">' + (x.t === 'del' ? 'было' : 'стало') + '</span>' + esc(x.s) + '</li>';
    }).join('');
    return el('<div class="block compare"><h3>Сравнение с прошлой проверкой</h3>' +
      '<p class="cmp-head ' + (ds < 0 ? 'better' : ds > 0 ? 'worse' : 'same') + '">' + headline + what + '</p>' +
      '<div class="cmp-grid">' +
      card('Балл ИИ', prev.score, cur.score, true) +
      card('Предложений к правке', prev.flagged, cur.flagged, true) +
      card('Штампы', prev.hits, cur.hits, true) +
      card('Канцелярит', prev.bur, cur.bur, true) +
      card('Смысловые повторы', prev.repeats, cur.repeats, true) +
      card('Слов в тексте', prev.words, cur.words, null, 'сл.') + '</div>' +
      (diff.length ? '<details class="cmp-diff" open><summary>Что изменилось в тексте</summary><ul>' + list + '</ul>' +
        (diff.length > 60 ? '<p class="muted">Показаны первые 60 изменений.</p>' : '') + '</details>' : '') +
      '</div>');
  }

  /* ---------------- SEO-показатели ----------------
   * Нормы сняты с 13 готовых кейсов «Доминиона» и 300 статей живых авторов
   * (LLMTrace): «хорошо» — где лежит большинство живых текстов. На ИИ-балл
   * блок не влияет. */
  var SEO_NORMS = [
    { key: 'water', title: 'Вода', unit: '%', good: 35, bad: 45,
      tip: 'Доля слов без собственного смысла: предлоги, союзы, частицы, пустые усилители («действительно», «достаточно»). У живых текстов обычно 22–38%. У text.ru «вода» считается иначе, поэтому цифры не совпадут.' },
    { key: 'nauseaClassic', title: 'Тошнота классическая', unit: '', good: 5, bad: 7,
      tip: 'Корень из числа повторов самого частого слова. Показывает, не перетягивает ли одно слово весь текст. До 5 — норма, выше 7 — поисковики могут счесть переспамом.' },
    { key: 'nauseaAcademic', title: 'Тошнота академическая', unit: '%', good: 9, bad: 12,
      tip: 'Доля пяти самых частых значимых слов во всём тексте. У живых статей обычно 4–9%, выше 12% — текст «про одно и то же слово».' },
    { key: 'readability', title: 'Читаемость', unit: '', good: 30, bad: 20, higher: true,
      tip: 'Индекс Флеша в адаптации для русского: чем выше, тем легче читать. Ваши готовые кейсы — 35–43, сырой текст нейросети — 14–31. Ниже 20 — тяжёлый текст, стоит резать длинные предложения.' },
    { key: 'avgSentence', title: 'Средняя длина предложения', unit: ' сл.', good: 16, bad: 20,
      tip: 'Слов в среднем предложении. Ваши кейсы — около 12, сырой текст Claude — около 22: длинные предложения — один из заметных признаков нейросети.' },
    { key: 'longShare', title: 'Длинные предложения', unit: '%', good: 10, bad: 20,
      tip: 'Доля предложений длиннее 25 слов. В ваших кейсах — 2–6%, у сырого Claude — 25–46%.' }
  ];

  function renderSeo(text, report) {
    if (typeof Seo === 'undefined') return null;
    var r = Seo.analyze(text);
    if (!r) return null;
    report.seo = r;
    var rows = SEO_NORMS.map(function (m) {
      var v = r[m.key];
      var st = m.higher ? (v >= m.good ? 'good' : v >= m.bad ? 'warn' : 'bad')
                        : (v <= m.good ? 'good' : v <= m.bad ? 'warn' : 'bad');
      return '<div class="seo-row" title="' + attr(m.title + '\n' + m.tip) + '"><span class="seo-name">' + m.title +
        '</span><span class="seo-val ' + st + '">' + v + m.unit + '</span></div>';
    }).join('');
    var kw = r.keywords.slice(0, 8).map(function (k) {
      var hot = k.density >= 3;
      return '<span class="kw' + (hot ? ' hot' : '') + '" title="' + attr(k.word + '\n' + k.count + ' раз, ' + k.density +
        '% текста' + (hot ? '. Выше 3% — похоже на переспам ключа.' : '')) + '">' + esc(k.word) + '<i>' + k.density + '%</i></span>';
    }).join('');
    return el('<div class="seo"><h3>SEO-показатели <span class="muted">(на ИИ-балл не влияют)</span></h3>' +
      '<div class="seo-grid">' + rows + '</div>' +
      '<div class="eyebrow seo-kw-head">Частые слова и плотность</div><div class="kw-list">' + kw + '</div></div>');
  }

  function wrapBlock(node, key) {
    node.classList.add('block', 'b-' + key);
    return node;
  }

  function render(container, text, report, opts) {
    opts = opts || {};
    if (opts.threshold === undefined) opts.threshold = 25;
    container.innerHTML = '';
    container.appendChild(renderSummary(report, opts));
    var cmp = opts.prev ? renderCompare(opts.prev, snapshot(text, report)) : null;
    if (cmp) container.appendChild(wrapBlock(cmp, 'compare'));
    else {
      // без подсказки сравнение никто не находит: оно появляется только
      // после второй проверки того же текста
      var hint = el('<div class="cmp-hint"><span><b>Сравнение версий.</b> Поправьте текст в поле выше и нажмите ' +
        '«Проверить» ещё раз — здесь появится, что стало лучше, а что хуже.</span>' +
        '<button class="pill sm" type="button">Править текст</button></div>');
      hint.querySelector('button').onclick = function () {
        var ta = document.getElementById('input-text');
        if (ta) { ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); ta.focus({ preventScroll: true }); }
      };
      container.appendChild(hint);
    }

    // главный экран: текст с подсветкой крупно слева, разбор — справа
    var main = el('<div class="dash-main"><div class="dash-text"></div><div class="dash-side"></div></div>');
    main.firstChild.appendChild(wrapBlock(renderHighlighted(text, report), 'hl'));
    var side = main.lastChild;
    side.appendChild(wrapBlock(renderRecs(report), 'recs'));
    side.appendChild(wrapBlock(renderMetrics(report), 'metrics'));
    var seo = renderSeo(text, report);
    if (seo) side.appendChild(wrapBlock(seo, 'seo'));
    side.appendChild(wrapBlock(renderHeat(report), 'heat'));
    side.appendChild(wrapBlock(renderDistribution(report), 'dist'));
    container.appendChild(main);

    container.appendChild(wrapBlock(renderSegments(report), 'segs'));
    // повторы на ИИ-балл не влияют — они в самом низу, перед экспортом
    container.appendChild(wrapBlock(renderRepeats(report), 'reps'));

    // обработчики вешаются на сам контейнер, а он переживает повторные проверки
    if (!container._bound) { bindJumps(container); bindTips(container); bindFilters(container); container._bound = true; }
    applyFilters(container);
    makeCollapsible(container);
    // Системная подсказка из title всплывает через полторы секунды, и ускорить
    // её нельзя, поэтому переносим текст в data-tip и показываем свою.
    Array.prototype.forEach.call(container.querySelectorAll('[title]'), function (n) {
      n.setAttribute('data-tip', n.getAttribute('title'));
      n.removeAttribute('title');
    });
  }

  /* Каждый блок отчёта с заголовком сворачивается щелчком по заголовку.
     Свёрнутые блоки помним по классу блока — после новой проверки они
     останутся свёрнутыми. */
  var FOLD_KEY = 'aidet_folded';
  function loadFolded() {
    try { return JSON.parse(localStorage.getItem(FOLD_KEY) || '[]'); } catch (e) { return []; }
  }
  function makeCollapsible(container) {
    var folded = loadFolded();
    Array.prototype.forEach.call(container.querySelectorAll('.block'), function (block) {
      var h = block.firstElementChild;
      if (!h || h.tagName !== 'H3') return;
      var key = (block.className.match(/\bb-([a-z]+)/) || [])[1] || block.className.split(' ')[0];
      block.classList.add('foldable');
      h.setAttribute('role', 'button');
      h.setAttribute('tabindex', '0');
      var set = function (closed) {
        block.classList.toggle('folded', closed);
        h.setAttribute('aria-expanded', closed ? 'false' : 'true');
      };
      set(folded.indexOf(key) !== -1);
      var toggle = function () {
        var closed = !block.classList.contains('folded'), f = loadFolded(), i = f.indexOf(key);
        if (closed && i === -1) f.push(key);
        if (!closed && i !== -1) f.splice(i, 1);
        try { localStorage.setItem(FOLD_KEY, JSON.stringify(f)); } catch (e) {}
        set(closed);
      };
      h.addEventListener('click', toggle);
      h.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  /* Фильтры подсветки: выключенные типы храним в браузере, чтобы выбор
     переживал повторную проверку. */
  var FILTER_KEY = 'aidet_hl_off';
  function loadOff() {
    // Заметки редактору по умолчанию спрятаны: на ИИ они не указывают, а в
    // чистом кейсе их бывает 20–40, и сиреневая заливка забивает весь текст.
    try {
      var v = localStorage.getItem(FILTER_KEY);
      return v === null ? ['note'] : JSON.parse(v);
    } catch (e) { return ['note']; }
  }
  function applyFilters(container) {
    var off = loadOff();
    var box = container.querySelector('.hl-text');
    if (!box) return;
    Array.prototype.forEach.call(container.querySelectorAll('[data-filter]'), function (b) {
      var k = b.getAttribute('data-filter'), hidden = off.indexOf(k) !== -1;
      b.setAttribute('aria-pressed', hidden ? 'false' : 'true');
      box.classList.toggle('off-' + k, hidden);
    });
  }
  function bindFilters(container) {
    container.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-filter]');
      if (!b || !container.contains(b)) return;
      var k = b.getAttribute('data-filter'), off = loadOff(), i = off.indexOf(k);
      if (i === -1) off.push(k); else off.splice(i, 1);
      try { localStorage.setItem(FILTER_KEY, JSON.stringify(off)); } catch (err) {}
      applyFilters(container);
    });
  }

  /* Своя подсказка: при наведении — сразу, щелчок закрепляет её, чтобы
     длинное объяснение можно было дочитать, не держа мышь на месте. */
  function bindTips(container) {
    var tip = document.createElement('div');
    tip.className = 'tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
    var owner = null, pinned = false;

    // Тип подсветки выключен в легенде — подсказки у него тоже нет,
    // иначе спрятанное предложение продолжало отзываться на мышь.
    function hiddenByFilter(n) {
      var box = n.closest && n.closest('.hl-text');
      if (!box) return false;
      if (n.tagName === 'MARK') {
        var mk = (n.className.match(/mk-[a-z]+/) || [])[0];
        return !!mk && box.classList.contains('off-' + mk);
      }
      if (!n.classList.contains('sent')) return false;
      var types = [];
      ['sl-ai', 'sl-likely', 'sl-mild'].forEach(function (c) { if (n.classList.contains(c)) types.push(c); });
      if (n.classList.contains('has-rep')) types.push('rep');
      if (n.classList.contains('has-note')) types.push('note');
      return types.length > 0 && types.every(function (t) { return box.classList.contains('off-' + t); });
    }

    function show(n) {
      if (hiddenByFilter(n)) { tip.hidden = true; owner = null; return; }
      owner = n;
      var lines = n.getAttribute('data-tip').split('\n');
      tip.innerHTML = '<b>' + esc(lines[0]) + '</b>' +
        (lines.length > 1 ? '<div>' + esc(lines.slice(1).join('\n').replace(/^\n+/, '')) + '</div>' : '') +
        '<small>' + (pinned ? 'Esc или щелчок мимо — закрыть' : 'Щелчок — закрепить подсказку') + '</small>';
      tip.hidden = false;
      tip.classList.toggle('pinned', pinned);
      // под строкой, а если внизу не помещается — над ней
      var r = n.getClientRects()[0] || n.getBoundingClientRect();
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var x = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
      var y = r.bottom + 8;
      if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 8);
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    }
    function hide() { tip.hidden = true; owner = null; pinned = false; }

    container.addEventListener('mouseover', function (e) {
      if (pinned) return;
      var n = e.target.closest && e.target.closest('[data-tip]');
      if (n && n !== owner) show(n);
    });
    container.addEventListener('mouseout', function (e) {
      if (pinned || !owner) return;
      var to = e.relatedTarget;
      if (!to || !owner.contains(to)) hide();
    });
    document.addEventListener('click', function (e) {
      var n = e.target.closest && e.target.closest('[data-tip]');
      if (tip.contains(e.target)) return;
      // щелчок по 🔁 — переход к повтору, закреплять тут нечего
      if (n && container.contains(n) && !n.hasAttribute('data-jump') && !n.hasAttribute('data-filter')) {
        if (pinned && owner === n) { hide(); return; }
        pinned = true; show(n);
        return;
      }
      if (pinned) hide();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    window.addEventListener('scroll', function () { if (!pinned) hide(); }, { passive: true });
  }

  /* ---------------- экспорт ---------------- */

  function buildJson(text, report, generatedAt) {
    return JSON.stringify({
      tool: 'ai-detector-local',
      version: (root.DetectorVersion || {}).full || '',
      generated_at: generatedAt,
      how_to_use: 'Загрузите этот файл в Claude или ChatGPT и напишите «перепиши по отчёту». Задание — в поле claude_prompt, исходный текст — в source_text, что именно править — в flagged_sentences и phrase_hits.',
      // задание первым: нейросеть читает файл сверху и сразу понимает, что делать
      claude_prompt: buildClaudePrompt(report, false),
      settings: report.meta,
      overall: report.overall,
      metrics: report.metrics,
      distribution: report.distribution,
      segments: report.segments.map(function (s) {
        return { id: s.id, label: s.label, score: s.score, reasons: s.reasons, text: s.text };
      }),
      phrase_hits: report.hits.map(function (h) {
        return { phrase: h.match, category: h.cat, weight: h.w, start: h.start, end: h.end, why: h.note, replace_with: h.repl };
      }),
      flagged_sentences: (report.heat || [])
        .filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; })
        .map(function (h) {
          return { start: h.start, end: h.end, score: h.score, level: h.level,
                   why: h.reasons.filter(function (r) { return !r.editorial && r.code !== 'ok'; })
                          .map(function (r) { return r.title + (r.detail ? ': ' + r.detail : ''); }),
                   text: h.preview };
        }),
      seo: report.seo || null,
      semantic_repeats: (report.repeats || []).map(function (p) {
        return { score: p.score, level: p.level,
                 a: { start: p.a.start, text: p.a.text },
                 b: { start: p.b.start, text: p.b.text } };
      }),
      editor_notes: (report.heat || [])
        .filter(function (h) { return (h.reasons || []).some(function (r) { return r.editorial; }); })
        .map(function (h) {
          return { start: h.start,
                   note: h.reasons.filter(function (r) { return r.editorial; })
                          .map(function (r) { return r.title + ': ' + r.detail; }),
                   text: h.preview };
        }),
      human_markers: report.humanHits.map(function (h) { return { phrase: h.match, start: h.start }; }),
      bureaucratic_hits: (report.burHits || []).map(function (h) { return { phrase: h.match, start: h.start }; }),
      template_sentence_starts: (report.starterHits || []).map(function (h) { return { phrase: h.match, start: h.start }; }),
      recommendations: report.recommendations,
      strengths: report.strengths,
      source_text: text
    }, null, 2);
  }

  function buildClaudePrompt(report, withPlaceholder) {
    var phraseList = {};
    report.hits.forEach(function (h) { phraseList['«' + h.match + '»'] = 1; });
    var phrases = Object.keys(phraseList).slice(0, 30).join(', ');
    var recs = report.recommendations.map(function (r, i) { return (i + 1) + '. ' + r.title + ': ' + r.detail; }).join('\n');
    // конкретные предложения, которые надо переписать — самая полезная часть задания
    var flagged = (report.heat || [])
      .filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, 25);
    var reps = (report.repeats || []).slice(0, 12);
    var repBlock = reps.length
      ? '\nСмысловые повторы — одна и та же мысль сказана дважды. Сведи каждую пару в одно ' +
        'место или разведи по смыслу:\n' +
        reps.map(function (p, i) {
          return (i + 1) + '. «' + p.a.text.replace(/\s+/g, ' ').trim() + '»\n   ↔ «' +
                 p.b.text.replace(/\s+/g, ' ').trim() + '» (близость ' + p.score.toFixed(2) + ')';
        }).join('\n') + '\n'
      : '';
    var sentBlock = flagged.length
      ? '\nПредложения, которые надо переписать в первую очередь (в скобках — что именно сработало):\n' +
        flagged.map(function (h, i) {
          return (i + 1) + '. «' + h.preview.replace(/\s+/g, ' ').trim() + '» — ' +
            h.reasons.filter(function (r) { return !r.editorial && r.code !== 'ok'; })
              .map(function (r) { return r.title.toLowerCase(); }).join(', ') + '.';
        }).join('\n') + '\n'
      : '';
    return 'Ты — опытный редактор. Перепиши текст так, чтобы он звучал как написанный живым человеком-экспертом, ' +
      'сохранив 100% смысла, все факты, цифры и SEO-ключевые слова (их можно склонять). Объём ±15%.\n\n' +
      'Локальный детектор дал балл ИИ ' + report.overall.aiScore + '/100 («' + report.overall.verdict + '»). Проблемы:\n' + recs + '\n\n' +
      (phrases ? 'Найденные штампы — убери или замени конкретикой: ' + phrases + '.\n' : '') +
      sentBlock + repBlock + '\n' +
      'Требования к результату:\n' +
      '- Рваный живой ритм: чередуй короткие (3–6 слов) и длинные предложения; вариативность длины (CV) выше 0.5.\n' +
      '- Никаких «важно отметить», «в современном мире», «таким образом» и подобных связок в начале предложений.\n' +
      '- Активный залог вместо канцелярита: «доставляем», а не «осуществляется доставка».\n' +
      '- Добавь уместную конкретику: цифры, примеры, детали из текста (не выдумывай факты).\n' +
      '- Сохрани полезную структуру, но не превращай текст в простыню списков.\n' +
      '- Абзацы разного размера, хотя бы один короткий абзац-акцент.\n' +
      (withPlaceholder ? '\nТекст:\n<вставьте текст или приложите JSON-отчёт>' : '\nИсходный текст — в поле source_text этого JSON.');
  }

  function buildMarkdown(text, report, generatedAt) {
    var md = [];
    md.push('# Отчёт: ' + ((root.DetectorVersion || {}).full || 'детектор ИИ') + '\n');
    md.push('- **Дата:** ' + generatedAt);
    md.push('- **Вердикт:** ' + report.overall.verdict);
    md.push('- **Балл ИИ:** ' + report.overall.aiScore + '/100');
    md.push('- **Уверенность:** ' + report.overall.confidence + ' — ' + report.overall.confidenceNote);
    md.push('- **Объём:** ' + report.meta.words + ' слов, ' + report.meta.chars + ' символов, профиль «' + report.meta.profileName + '»\n');
    md.push('## Распределение сегментов\n');
    ['AI', 'LIKELY_AI', 'LIKELY_HUMAN', 'HUMAN'].forEach(function (k) {
      md.push('- ' + LABELS[k].title + ': ' + (report.distribution[k] || 0) + ' из ' + report.segments.length);
    });
    md.push('\n## Метрики\n');
    md.push('| Метрика | Сигнал → к норме | Статус | Детали |');
    md.push('|---|---|---|---|');
    report.metrics.forEach(function (m) {
      var rel = m.relative === undefined ? m.signal : m.relative;
      md.push('| ' + m.title + ' | ' + m.signal + ' → ' + rel + ' | ' + STATUS[m.status].title + ' | ' + m.detail.replace(/\|/g, '/') + ' |');
    });
    var flaggedS = (report.heat || []).filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; });
    if (flaggedS.length) {
      md.push('\n## Предложения, которые надо переписать\n');
      flaggedS.sort(function (a, b) { return b.score - a.score; }).forEach(function (h, i) {
        var why = h.reasons.filter(function (r) { return !r.editorial && r.code !== 'ok'; })
          .map(function (r) { return r.title.toLowerCase(); }).join(', ');
        md.push((i + 1) + '. **' + h.score + '/100** — ' + h.preview.replace(/\s+/g, ' '));
        md.push('   *' + why + '*');
      });
    }

    if (report.repeats && report.repeats.length) {
      md.push('\n## Смысловые повторы\n');
      md.push('Одна и та же мысль сказана дважды разными словами. На ИИ не указывает — ' +
              'это редакторская правка: свести в одно место или развести по смыслу.\n');
      report.repeats.forEach(function (p, i) {
        md.push((i + 1) + '. **близость ' + p.score.toFixed(2) + '**' +
          (p.level === 'strong' ? ' — та же мысль' : ''));
        md.push('   > ' + p.a.text.replace(/\s+/g, ' '));
        md.push('   > ' + p.b.text.replace(/\s+/g, ' '));
      });
    }

    var notesS = (report.heat || []).filter(function (h) {
      return (h.reasons || []).some(function (r) { return r.editorial; });
    });
    if (notesS.length) {
      md.push('\n## Заметки редактору\n');
      md.push('На ИИ не указывают — смотрите глазами.\n');
      notesS.forEach(function (h) {
        var t = h.reasons.filter(function (r) { return r.editorial; })
          .map(function (r) { return r.title.toLowerCase(); }).join(', ');
        md.push('- **' + t + '** — ' + h.preview.replace(/\s+/g, ' '));
      });
    }

    md.push('\n## Что исправить\n');
    report.recommendations.forEach(function (r, i) {
      md.push((i + 1) + '. **[' + PRIO[r.priority] + '] ' + r.title + '.** ' + r.detail);
    });
    if (report.strengths.length) {
      md.push('\n## Что уже хорошо\n');
      report.strengths.forEach(function (s) { md.push('- ' + s); });
    }
    if (report.hits.length) {
      md.push('\n## Найденные штампы\n');
      report.hits.slice(0, 60).forEach(function (h) {
        md.push('- «' + h.match + '» — ' + (h.note || h.cat) +
          (h.repl && h.repl.length ? (h.repl[0] === '' ? ' (лучше удалить)' : ' (замена: ' + h.repl.filter(Boolean).join(' / ') + ')') : ''));
      });
    }
    md.push('\n## Сегменты\n');
    report.segments.forEach(function (s) {
      md.push('### Сегмент ' + s.id + ' — ' + LABELS[s.label].title + ' (' + s.score + '/100)\n');
      md.push('Причины: ' + s.reasons.join('; ') + '\n');
      md.push('> ' + s.text.trim().replace(/\n/g, '\n> ') + '\n');
    });
    return md.join('\n');
  }

  /* ---------------- отчёт для заказчика ----------------
   * Одна самодостаточная HTML-страница: балл, шкала словами, решение,
   * метрики, что исправить и текст с подсветкой. Без скриптов и внешних
   * файлов — открывается где угодно и пересылается одним вложением.
   * Подсветку берём из уже отрисованного отчёта, подсказки — в title. */
  function buildClientHtml(container, report, meta) {
    meta = meta || {};
    var threshold = meta.threshold || 25;
    var score = report.overall.aiScore, si = scaleIndex(score);
    var acc = acceptance(report, threshold);
    var box = container.querySelector('.hl-text');
    var body = box ? box.innerHTML.replace(/ data-tip="/g, ' title="')
      .replace(/<span class="(rep|note)-flag"[^>]*>[^<]*<\/span>/g, '') : '';
    // Разбор словами: подсказки при наведении не работают на печати и в
    // телефоне, поэтому под текстом — список предложений с причинами.
    var flagged = (report.heat || []).filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; });
    var ver = (root.DetectorVersion || {}).full || 'ИИ Детектор Пылова';
    var why = flagged.map(function (h) {
      var rs = (h.reasons || []).filter(function (r) { return !r.editorial && r.code !== 'ok'; });
      return '<li><span class="lv ' + (h.level === 'AI' ? 'ai' : 'lk') + '">' + (h.level === 'AI' ? 'машинное' : 'похоже на машинное') +
        '</span><q>' + esc(h.preview.replace(/\s+/g, ' ')) + (h.preview.length >= 160 ? '…' : '') + '</q>' +
        '<ul>' + rs.map(function (r) { return '<li><b>' + esc(r.title) + '.</b> ' + esc(r.detail || '') + '</li>'; }).join('') + '</ul></li>';
    }).join('');
    var date = new Date(meta.generatedAt || Date.now()).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
    var css = [
      ':root{color-scheme:light}',
      'body{margin:0;background:#eeeff1;color:#111113;font:15px/1.6 -apple-system,"SF Pro Text","Segoe UI",Inter,system-ui,sans-serif}',
      '.w{max-width:960px;margin:0 auto;padding:40px 20px}',
      '.card{background:#fff;border-radius:24px;padding:28px 32px;margin:0 0 16px}',
      '.eb{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8b8e96}',
      'h1{font-size:28px;letter-spacing:-.02em;margin:6px 0 4px}',
      '.top{display:grid;grid-template-columns:1fr 1fr;gap:16px}',
      '.score{background:#111113;color:#fff}.score .eb{color:#9a9ca3}',
      '.num{font-size:64px;font-weight:700;letter-spacing:-.04em;line-height:1}',
      '.word{font-size:20px;font-weight:600;margin-top:6px}',
      '.scale{display:flex;gap:4px;margin-top:16px}.scale span{flex:1;font-size:11px;padding:6px 4px;border-radius:8px;background:rgba(255,255,255,.08);color:#9a9ca3;text-align:center}.scale span.on{background:#fff;color:#111113;font-weight:600}',
      '.acc{font-size:28px;font-weight:700;letter-spacing:-.02em;margin:8px 0}.ok .acc{color:#127a3a}.no .acc{color:#b4232a}',
      'ul{padding-left:18px;margin:8px 0}li{margin:4px 0}.ok ul,.no ul{list-style:none;padding:0}',
      'table{width:100%;border-collapse:collapse;font-size:14px}td{padding:8px 0;border-top:1px solid #eeeff1}td.v{text-align:right;font-variant-numeric:tabular-nums;color:#55575e}',
      '.txt{font-size:15.5px;line-height:1.8}',
      '.sent{border-radius:4px;padding:1px 2px;-webkit-box-decoration-break:clone;box-decoration-break:clone}',
      '.sent.sl-ai{background:#fbd5d3}.sent.sl-likely{background:#fde3cc}.sent.sl-mild{background:#fdf1c4}',
      '.sent.has-rep:not(.sl-ai):not(.sl-likely):not(.sl-mild){background:#dbe8fb}',
      'mark{background:none;color:inherit;border-bottom:2px solid;padding:0}mark.mk-ai{border-color:#d03b3b}mark.mk-starter{border-color:#ec835a}mark.mk-bur{border-color:#e0a100}mark.mk-human{border-color:#1f9d4c}',
      '.lg{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:#55575e;margin:0 0 14px}.lg i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:6px;vertical-align:-1px}',
      '.foot{font-size:12px;color:#8b8e96;text-align:center;margin-top:24px}',
      '.sent[title],mark[title]{cursor:help}',
      '#tip{position:fixed;z-index:9;max-width:380px;background:#111113;color:#fff;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.5;white-space:pre-line;box-shadow:0 10px 30px rgba(0,0,0,.25);display:none;pointer-events:none}',
      '.why{list-style:none;padding:0;margin:0}.why>li{padding:14px 0;border-top:1px solid #eeeff1}.why>li:first-child{border-top:0}',
      '.why q{display:block;margin:6px 0;color:#111113}.why q:before,.why q:after{content:""}.why ul{color:#55575e;font-size:14px;margin:4px 0 0}',
      '.lv{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:999px}.lv.ai{background:#fbd5d3;color:#8c1d1d}.lv.lk{background:#fde3cc;color:#8a3d0c}',
      '@media print{#tip{display:none!important}}',
      '@media(max-width:640px){.top{grid-template-columns:1fr}.card{padding:22px}}',
      '@media print{body{background:#fff}.card{border:1px solid #e6e7ea}}'
    ].join('\n');
    var metrics = report.metrics.map(function (m) {
      return '<tr><td>' + esc(m.title) + '</td><td class="v">' + (m.status === 'good' ? 'в норме' : m.status === 'warn' ? 'внимание' : 'проблема') + '</td></tr>';
    }).join('');
    var recs = report.recommendations.length
      ? '<ul>' + report.recommendations.map(function (r) { return '<li><b>' + esc(r.title) + '.</b> ' + esc(r.detail) + '</li>'; }).join('') + '</ul>'
      : '<p>Существенных замечаний нет.</p>';
    return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Проверка текста на ИИ' + (meta.fileName ? ' — ' + esc(meta.fileName) : '') + '</title><style>' + css + '</style></head><body><div class="w">' +
      '<div class="card"><div class="eb">Отчёт о проверке текста · ' + esc(date) + '</div><h1>' + esc(meta.fileName || 'Текст без названия') + '</h1>' +
      '<div style="color:#55575e">' + report.meta.words.toLocaleString('ru-RU') + ' слов · профиль «' + esc(report.meta.profileName) + '» · порог приёмки ' + threshold + '</div></div>' +
      '<div class="top"><div class="card score"><div class="eb">Балл ИИ</div><div class="num">' + score + '<span style="font-size:.35em;font-weight:600;color:#9a9ca3;letter-spacing:0;margin-left:6px">из 100</span></div><div class="word">' + SCALE[si].word + '</div>' +
      '<div class="scale">' + SCALE.map(function (x, i) { return '<span' + (i === si ? ' class="on"' : '') + '>' + x.word + '</span>'; }).join('') + '</div></div>' +
      '<div class="card ' + (acc.ok ? 'ok' : 'no') + '"><div class="eb">Решение</div><div class="acc">' + (acc.ok ? 'Можно сдавать' : 'На доработку') + '</div><ul>' +
      acc.checks.map(function (c) { return '<li>' + (c.info ? '· ' : c.ok ? '✓ ' : '✕ ') + esc(c.text) + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="card"><div class="eb">Что исправить</div>' + recs + '</div>' +
      '<div class="card"><div class="eb">Метрики</div><table>' + metrics + '</table></div>' +
      '<div class="card"><div class="eb">Текст с подсветкой</div><div class="lg">' +
      '<span><i style="background:#fbd5d3"></i>машинное</span><span><i style="background:#fde3cc"></i>похоже на машинное</span>' +
      '<span><i style="background:#fdf1c4"></i>есть сомнения</span><span><i style="background:#dbe8fb"></i>смысловой повтор</span>' +
      '<span><i style="background:none;border-bottom:2px solid #d03b3b;border-radius:0"></i>штамп</span></div>' +
      '<div class="txt">' + body + '</div>' +
      '<p style="font-size:12.5px;color:#8b8e96;margin:14px 0 0">Наведите курсор на подсвеченное место — появится объяснение. Ниже тот же разбор списком.</p></div>' +
      (why ? '<div class="card"><div class="eb">Что не так в подсвеченных предложениях · ' + flagged.length + '</div><ol class="why">' + why + '</ol></div>' : '') +
      '<div class="foot">Проверено: ' + esc(ver) + '. Ни один детектор не доказывает авторство — это инструмент редактуры.</div>' +
      '</div><div id="tip"></div><script>' +
      // крошечная подсказка без библиотек: наведение показывает title, уход — прячет
      '(function(){var t=document.getElementById("tip"),cur=null;' +
      'document.addEventListener("mouseover",function(e){var n=e.target.closest&&e.target.closest("[title],[data-t]");if(!n){t.style.display="none";cur=null;return}' +
      'if(n.hasAttribute("title")){n.setAttribute("data-t",n.getAttribute("title"));n.removeAttribute("title")}' +
      'if(n===cur)return;cur=n;t.textContent=n.getAttribute("data-t");t.style.display="block";var r=n.getClientRects()[0]||n.getBoundingClientRect();' +
      'var x=Math.min(Math.max(8,r.left),innerWidth-t.offsetWidth-8),y=r.bottom+8;if(y+t.offsetHeight>innerHeight-8)y=Math.max(8,r.top-t.offsetHeight-8);t.style.left=x+"px";t.style.top=y+"px"});' +
      'addEventListener("scroll",function(){t.style.display="none";cur=null},{passive:true})})();' +
      '<\/script></body></html>';
  }

  root.Report = {
    buildClientHtml: buildClientHtml,
    render: render,
    snapshot: snapshot,
    acceptance: acceptance,
    SCALE: SCALE,
    scaleIndex: scaleIndex,
    setSemanticStatus: setSemanticStatus,
    buildMarks: buildMarks,
    buildJson: buildJson,
    buildMarkdown: buildMarkdown,
    buildClaudePrompt: buildClaudePrompt,
    LABELS: LABELS
  };
})(typeof self !== 'undefined' ? self : this);
