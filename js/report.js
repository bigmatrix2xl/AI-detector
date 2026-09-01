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

  /* ---------------- шкала-донат ---------------- */
  function renderGauge(report) {
    var score = report.overall.aiScore;
    var lbl = LABELS[scoreLabel(score)];
    var R = 62, C = 2 * Math.PI * R;
    var filled = C * score / 100;
    return el(
      '<div class="gauge-wrap">' +
      '<svg class="gauge" viewBox="0 0 160 160" role="img" aria-label="AI-сигнал ' + score + ' из 100">' +
      '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="var(--track)" stroke-width="13"/>' +
      '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="var(--st-' + lbl.cls + ')" stroke-width="13" ' +
      'stroke-linecap="round" stroke-dasharray="' + filled.toFixed(1) + ' ' + C.toFixed(1) + '" ' +
      'transform="rotate(-90 80 80)"/>' +
      '<text x="80" y="76" text-anchor="middle" class="gauge-num">' + score + '%</text>' +
      '<text x="80" y="98" text-anchor="middle" class="gauge-cap">AI-сигнал</text>' +
      '</svg>' +
      '<div class="gauge-side">' +
      '<div class="hh-bar" role="img" aria-label="Человек ' + report.overall.humanScore + '%, ИИ ' + score + '%">' +
      '<div class="hh-human" style="width:' + report.overall.humanScore + '%"></div>' +
      '</div>' +
      '<div class="hh-legend"><span><i class="dot good"></i>Человек ' + report.overall.humanScore + '%</span>' +
      '<span><i class="dot critical"></i>ИИ ' + score + '%</span></div>' +
      '<p class="conf">Уверенность оценки: <b>' + report.overall.confidence + '</b>. ' + esc(report.overall.confidenceNote) + '</p>' +
      '</div></div>'
    );
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
      var L = LABELS[scoreLabel(h.score)];
      return '<span class="heat-cell ' + L.cls + '" title="Предложение ' + (i + 1) + ' · ' + h.score +
        '/100 · ' + L.title + '\n' + esc(h.preview) + '" data-start="' + h.start + '"></span>';
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
    return out;
  }

  /* ---------------- подсветка текста ---------------- */
  function renderHighlighted(text, report) {
    var marks = buildMarks(report, {});
    var counts = { 'mk-ai': 0, 'mk-starter': 0, 'mk-bur': 0, 'mk-human': 0 };
    var html = '', pos = 0;
    marks.forEach(function (m) {
      counts[m.cls]++;
      html += esc(text.slice(pos, m.start));
      html += '<mark class="' + m.cls + '" title="' + esc(m.tip) + '">' + esc(text.slice(m.start, m.end)) + '</mark>';
      pos = m.end;
    });
    html += esc(text.slice(pos));
    var total = counts['mk-ai'] + counts['mk-starter'] + counts['mk-bur'] + counts['mk-human'];
    var legend = '<div class="hl-legend">' +
      '<span><mark class="mk-ai">штамп ИИ</mark> — заменить/удалить (' + counts['mk-ai'] + ')</span>' +
      '<span><mark class="mk-starter">шаблонное начало</mark> — переписать (' + counts['mk-starter'] + ')</span>' +
      '<span><mark class="mk-bur">канцелярит</mark> — оживить глаголом (' + counts['mk-bur'] + ')</span>' +
      '<span><mark class="mk-human">живой маркер</mark> — сохранить (' + counts['mk-human'] + ')</span></div>';
    var empty = total === 0
      ? '<p class="hl-empty">✓ Подсвечивать нечего: штампов, канцелярита и шаблонных связок из базы в тексте не найдено.</p>'
      : '';
    return el('<div class="hl"><h3>Текст с подсветкой <span class="muted">(' + total + ' отметок)</span></h3>' +
      legend + empty + '<div class="hl-text">' + html.replace(/\n/g, '<br>') + '</div></div>');
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
  function render(container, text, report) {
    container.innerHTML = '';
    var lbl = LABELS[scoreLabel(report.overall.aiScore)];
    var banner = el('<div class="verdict ' + lbl.cls + '"><div class="verdict-icon">' + lbl.icon + '</div>' +
      '<div><h2>' + esc(report.overall.verdict) + '</h2>' +
      '<p>' + report.meta.words + ' слов · ' + report.meta.chars + ' симв. · ' + report.meta.sentences +
      ' предл. · язык: ' + (report.meta.lang === 'ru' ? 'русский' : 'английский') +
      ' · профиль: ' + esc(report.meta.profileName) + '</p></div></div>');
    container.appendChild(banner);
    container.appendChild(renderGauge(report));
    container.appendChild(renderDistribution(report));
    container.appendChild(renderHeat(report));
    container.appendChild(renderMetrics(report));
    container.appendChild(renderRecs(report));
    container.appendChild(renderHighlighted(text, report));
    container.appendChild(renderSegments(report));
  }

  /* ---------------- экспорт ---------------- */

  function buildJson(text, report, generatedAt) {
    return JSON.stringify({
      tool: 'ai-detector-local',
      version: '1.0.0',
      generated_at: generatedAt,
      how_to_use: 'Передайте этот JSON ассистенту (Claude) с просьбой переписать source_text, устранив issues и сохранив смысл, факты и SEO-ключи. Готовая инструкция — в поле claude_prompt.',
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
      human_markers: report.humanHits.map(function (h) { return { phrase: h.match, start: h.start }; }),
      bureaucratic_hits: (report.burHits || []).map(function (h) { return { phrase: h.match, start: h.start }; }),
      template_sentence_starts: (report.starterHits || []).map(function (h) { return { phrase: h.match, start: h.start }; }),
      recommendations: report.recommendations,
      strengths: report.strengths,
      claude_prompt: buildClaudePrompt(report, false),
      source_text: text
    }, null, 2);
  }

  function buildClaudePrompt(report, withPlaceholder) {
    var phraseList = {};
    report.hits.forEach(function (h) { phraseList['«' + h.match + '»'] = 1; });
    var phrases = Object.keys(phraseList).slice(0, 30).join(', ');
    var recs = report.recommendations.map(function (r, i) { return (i + 1) + '. ' + r.title + ': ' + r.detail; }).join('\n');
    return 'Ты — опытный редактор. Перепиши текст так, чтобы он звучал как написанный живым человеком-экспертом, ' +
      'сохранив 100% смысла, все факты, цифры и SEO-ключевые слова (их можно склонять). Объём ±15%.\n\n' +
      'Локальный детектор дал AI-сигнал ' + report.overall.aiScore + '/100 («' + report.overall.verdict + '»). Проблемы:\n' + recs + '\n\n' +
      (phrases ? 'Найденные штампы — убери или замени конкретикой: ' + phrases + '.\n\n' : '') +
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
    md.push('# Отчёт AI-детектора\n');
    md.push('- **Дата:** ' + generatedAt);
    md.push('- **Вердикт:** ' + report.overall.verdict);
    md.push('- **AI-сигнал:** ' + report.overall.aiScore + '/100 (человечность ' + report.overall.humanScore + '%)');
    md.push('- **Уверенность:** ' + report.overall.confidence + ' — ' + report.overall.confidenceNote);
    md.push('- **Объём:** ' + report.meta.words + ' слов, ' + report.meta.chars + ' символов, профиль «' + report.meta.profileName + '»\n');
    md.push('## Распределение сегментов\n');
    ['AI', 'LIKELY_AI', 'LIKELY_HUMAN', 'HUMAN'].forEach(function (k) {
      md.push('- ' + LABELS[k].title + ': ' + (report.distribution[k] || 0) + ' из ' + report.segments.length);
    });
    md.push('\n## Метрики\n');
    md.push('| Метрика | Сигнал | Статус | Детали |');
    md.push('|---|---|---|---|');
    report.metrics.forEach(function (m) {
      md.push('| ' + m.title + ' | ' + m.signal + '/100 | ' + STATUS[m.status].title + ' | ' + m.detail.replace(/\|/g, '/') + ' |');
    });
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

  root.Report = {
    render: render,
    buildMarks: buildMarks,
    buildJson: buildJson,
    buildMarkdown: buildMarkdown,
    buildClaudePrompt: buildClaudePrompt,
    LABELS: LABELS
  };
})(typeof self !== 'undefined' ? self : this);
