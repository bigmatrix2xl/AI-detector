/* Обёртка сборки: то, ради чего всё склеивается в один файл.
   Внутри доступны ns.JSZip, ns.AIDetectorKB, ns.AIDetector, ns.Sentences. */

var JSZip = ns.JSZip, KB = ns.AIDetectorKB, DET = ns.AIDetector;

// Служебные строки документов «Доминиона» — их в проверку не берём
var SERVICE_RE = /^(alt:|Дизайнеру:|Анкор|Ссылка|Схема-пример|Запасные|Title|Description|URL|Лид —|Цветовая легенда|Перед прогоном|надзаголовок:|—\s)/i;

function unescapeXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/* Достаёт из document.xml только публикуемый текст.
   Абзац, все прогоны которого набраны курсивом, считается служебным —
   так размечены надзаголовки, alt, пометки дизайнеру и анкоры. */
function textFromDocumentXml(xml) {
  var paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  var out = [];
  for (var i = 0; i < paras.length; i++) {
    var runs = paras[i].match(/<w:r[ >][\s\S]*?<\/w:r>/g) || [];
    var text = '', total = 0, italic = 0;
    for (var j = 0; j < runs.length; j++) {
      var t = (runs[j].match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
        .map(function (x) { return x.replace(/<[^>]+>/g, ''); }).join('');
      if (!t.trim()) continue;
      text += t; total++;
      if (/<w:i\/>|<w:i\s/.test(runs[j])) italic++;
    }
    text = unescapeXml(text).trim();
    if (!text) continue;
    if (total && italic === total) continue;
    if (SERVICE_RE.test(text)) continue;
    out.push(text);
  }
  return out.join('\n\n');
}

function extractDocx(data) {
  return JSZip.loadAsync(data)
    .then(function (zip) {
      var f = zip.file('word/document.xml');
      if (!f) throw new Error('это не .docx: внутри нет word/document.xml');
      return f.async('string');
    })
    .then(textFromDocumentXml);
}

function pad(s, n) { s = String(s); return s.length >= n ? s : s + new Array(n - s.length + 1).join(' '); }
function lpad(s, n) { s = String(s); return s.length >= n ? s : new Array(n - s.length + 1).join(' ') + s; }

function summary(r, title) {
  var L = [];
  L.push('');
  if (title) L.push('Файл: ' + title);
  L.push('Слов в публикуемом тексте: ' + r.meta.words + '   профиль: ' + r.meta.profileName);
  L.push('');
  L.push('AI-сигнал: ' + r.overall.aiScore + '/100 — ' + r.overall.verdict);
  L.push('Уверенность: ' + r.overall.confidence);
  L.push('');
  L.push('МЕТРИКИ  (сырой сигнал → относительно нормы делового текста)');
  r.metrics.forEach(function (m) {
    var mark = m.status === 'bad' ? '✗' : m.status === 'warn' ? '~' : '✓';
    var rel = m.relative === undefined ? m.signal : m.relative;
    L.push('  ' + mark + ' ' + lpad(m.signal, 3) + ' → ' + lpad(rel, 3) + '  ' + m.title +
      (m.neutral === undefined ? '' : '   норма ~' + m.neutral));
  });

  var flagged = (r.heat || []).filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; });
  L.push('');
  if (flagged.length) {
    L.push('ПРЕДЛОЖЕНИЯ, КОТОРЫЕ НАДО ПЕРЕПИСАТЬ (' + flagged.length + ')');
    flagged.sort(function (a, b) { return b.score - a.score; }).slice(0, 30).forEach(function (h, i) {
      var why = h.reasons.filter(function (x) { return !x.editorial && x.code !== 'ok'; })
        .map(function (x) { return x.title.toLowerCase(); });
      L.push('  ' + lpad(i + 1, 2) + '. [' + lpad(h.score, 2) + '/100] ' + h.preview.replace(/\s+/g, ' ').slice(0, 96));
      L.push('      ' + why.join(', '));
    });
  } else {
    L.push('ПРЕДЛОЖЕНИЯ: машинных предложений не найдено.');
  }

  var notes = (r.heat || []).filter(function (h) {
    return (h.reasons || []).some(function (x) { return x.editorial; });
  });
  if (notes.length) {
    L.push('');
    L.push('ЗАМЕТКИ РЕДАКТОРУ (' + notes.length + ') — на ИИ не указывают');
    notes.slice(0, 10).forEach(function (h) {
      var t = h.reasons.filter(function (x) { return x.editorial; })
        .map(function (x) { return x.title.toLowerCase(); }).join(', ');
      L.push('  • ' + t + ': ' + h.preview.replace(/\s+/g, ' ').slice(0, 88));
    });
  }

  L.push('');
  L.push('СЕГМЕНТЫ: ' + Object.keys(r.distribution).map(function (k) {
    return k + ' ' + r.distribution[k];
  }).join(', '));

  if (r.hits.length) {
    var uniq = {};
    r.hits.forEach(function (h) { uniq['«' + h.match + '»'] = 1; });
    L.push('ШТАМПЫ (' + r.hits.length + '): ' + Object.keys(uniq).slice(0, 20).join(', '));
  } else {
    L.push('ШТАМПЫ: не найдено.');
  }

  if (r.recommendations.length) {
    L.push('');
    L.push('ЧТО ИСПРАВИТЬ');
    r.recommendations.forEach(function (x, i) { L.push('  ' + (i + 1) + '. ' + x.title + ': ' + x.detail); });
  }
  L.push('');
  return L.join('\n');
}

function checkText(text, profile, opts) {
  opts = opts || {};
  var r = DET.analyze(text, KB, {
    profile: profile || 'strict',
    lang: opts.lang || 'ru',
    markdownAware: !!opts.markdownAware,
    whitelist: opts.whitelist || []
  });
  return { report: r, summary: summary(r, opts.title), text: text };
}

function checkDocx(data, profile, opts) {
  return extractDocx(data).then(function (text) {
    return checkText(text, profile, opts);
  });
}

var API = {
  checkText: checkText,
  checkDocx: checkDocx,
  extractDocx: extractDocx,
  summary: summary,
  analyze: function (text, o) { return DET.analyze(text, KB, o || { profile: 'strict', lang: 'ru' }); },
  kb: KB,
  version: KB.version
};

/* Запуск из командной строки: node detector.bundle.js файл.docx strict [json] */
API.cli = function (argv, fsMod) {
  var file = argv[2], profile = argv[3] || 'strict', asJson = argv[4] === 'json';
  if (!file) {
    console.log('Использование: node detector.bundle.js файл.docx [strict|balanced|soft] [json]');
    return;
  }
  var data = fsMod.readFileSync(file);
  var done = function (res) {
    if (asJson) console.log(JSON.stringify({ file: file, profile: profile, result: res.report, text: res.text }, null, 1));
    else console.log(res.summary);
  };
  if (/\.docx$/i.test(file)) {
    checkDocx(data, profile, { title: file }).then(done, function (e) {
      console.error('Ошибка: ' + e.message); process.exitCode = 1;
    });
  } else {
    done(checkText(data.toString('utf8'), profile, { title: file }));
  }
};
