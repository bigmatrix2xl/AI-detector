/*
 * AI Detector — ядро анализа.
 * Детерминированный статистический движок: одинаковый текст и настройки
 * всегда дают одинаковый результат. Работает локально, без сети.
 *
 * API:
 *   AIDetector.analyze(text, kb, options) -> report
 *   options: {
 *     lang: 'auto'|'ru'|'en',
 *     profile: 'strict'|'balanced'|'soft',
 *     segmentSize: number (симв., по умолчанию 900),
 *     markdownAware: bool,   // структура (списки/заголовки) задумана автором
 *     whitelist: [строки]    // фразы-исключения
 *   }
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.AIDetector = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- утилиты ---------------- */

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // Кусочно-линейное отображение x -> 0..100 по опорным точкам [[x,y],...]
  function scale(x, pts) {
    if (x <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        var a = pts[i - 1], b = pts[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return pts[pts.length - 1][1];
  }

  function mean(arr) {
    if (!arr.length) return 0;
    var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }
  function stdev(arr) {
    if (arr.length < 2) return 0;
    var m = mean(arr), s = 0;
    for (var i = 0; i < arr.length; i++) s += (arr[i] - m) * (arr[i] - m);
    return Math.sqrt(s / (arr.length - 1));
  }
  function cv(arr) { var m = mean(arr); return m ? stdev(arr) / m : 0; }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* ---------------- токенизация ---------------- */

  var ABBR = ['т.д', 'т.п', 'т.е', 'т.к', 'т.н', 'и.о', 'н.э', 'др', 'пр', 'руб',
    'коп', 'тыс', 'млн', 'млрд', 'г', 'гг', 'в', 'вв', 'см', 'рис', 'табл', 'стр',
    'гл', 'им', 'ул', 'просп', 'пер', 'обл', 'кв', 'корп', 'оф', 'тел', 'достав',
    'e.g', 'i.e', 'etc', 'vs', 'mr', 'mrs', 'ms', 'dr', 'st', 'no', 'approx', 'inc', 'ltd'];

  // Разбивка на предложения с офсетами. Бережно к сокращениям и инициалам.
  function splitSentences(text) {
    var out = [];
    var re = /[.!?…]+[»")\]]*[ \t]+|\n+/g;
    var start = 0, m;
    while ((m = re.exec(text)) !== null) {
      var end = m.index + m[0].length;
      var isNewline = m[0].indexOf('\n') !== -1;
      if (!isNewline) {
        // слово перед точкой
        var beforeMatch = /([А-Яа-яЁёA-Za-z][а-яёa-z]*)\.?$/.exec(text.slice(Math.max(0, m.index - 12), m.index));
        var w = beforeMatch ? beforeMatch[1].toLowerCase() : '';
        var isAbbr = (w.length === 1) || ABBR.indexOf(w) !== -1;
        // "т.д." и подобные — точка внутри
        var tail2 = text.slice(Math.max(0, m.index - 4), m.index).toLowerCase();
        if (/[тие]\.[дпекн]$/.test(tail2)) isAbbr = true;
        var next = text[end];
        var nextLower = next && /[а-яёa-z]/.test(next);
        if (isAbbr || nextLower) continue; // не граница
      }
      var chunk = text.slice(start, end);
      if (chunk.trim()) out.push({ text: chunk.trim(), start: start, end: end });
      start = end;
    }
    if (start < text.length && text.slice(start).trim()) {
      out.push({ text: text.slice(start).trim(), start: start, end: text.length });
    }
    return out;
  }

  function countWords(s) {
    var m = s.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\-']*/g);
    return m ? m.length : 0;
  }

  function detectLang(text) {
    var cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
    var lat = (text.match(/[A-Za-z]/g) || []).length;
    if (cyr === 0 && lat === 0) return 'ru';
    return cyr >= lat ? 'ru' : 'en';
  }

  /* -------------- сопоставление фраз с допуском окончаний -------------- */

  var LOOKBEHIND_OK = (function () {
    try { new RegExp('(?<!a)b'); return true; } catch (e) { return false; }
  })();

  // Из "играет ключевую роль" делаем регэксп, терпимый к окончаниям слов.
  function phraseToRegex(p, flexTail) {
    var words = p.split(/\s+/);
    var single = words.length === 1;
    var parts = words.map(function (w) {
      var esc;
      if (/[а-яё]/i.test(w) && w.length >= 5) {
        var cut = w.length >= 7 ? 2 : 1;
        // Для однословных фраз хвост не длиннее отрезанного окончания:
        // иначе «производится» ловит «производителей», «внедрение» — «внедрению» и т.п.
        var tail = single ? cut : cut + (flexTail || 2);
        esc = escapeRe(w.slice(0, w.length - cut)) + '[а-яё]{0,' + tail + '}';
      } else if (/^[a-z]+$/i.test(w) && w.length >= 5) {
        esc = escapeRe(w) + '[a-z]{0,2}';
      } else {
        esc = escapeRe(w);
      }
      return esc;
    });
    var body = parts.join('[\\s,]+');
    var src = LOOKBEHIND_OK
      ? '(?<![А-Яа-яЁёA-Za-z])' + body + '(?![А-Яа-яЁёA-Za-z])'
      : body + '(?![А-Яа-яЁёA-Za-z])';
    return new RegExp(src, 'gi');
  }

  var regexCache = {};
  function cachedRegex(key, p, flexTail) {
    if (!regexCache[key]) regexCache[key] = phraseToRegex(p, flexTail);
    regexCache[key].lastIndex = 0;
    return regexCache[key];
  }

  // Поиск всех вхождений фраз из списка entries [{p,w,cat,repl,note}]
  function findPhraseHits(lowerText, entries, whitelist, kind) {
    var hits = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (whitelist && whitelist.indexOf(e.p) !== -1) continue;
      var re = cachedRegex(kind + '::' + e.p, e.p, 2);
      var m;
      while ((m = re.exec(lowerText)) !== null) {
        hits.push({
          start: m.index, end: m.index + m[0].length,
          match: m[0], phrase: e.p, w: e.w || 1,
          cat: e.cat || kind, repl: e.repl || [], note: e.note || ''
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
    // сортировка + удаление перекрытий (оставляем более весомую/длинную)
    hits.sort(function (a, b) { return a.start - b.start || b.w - a.w || (b.end - b.start) - (a.end - a.start); });
    var res = [];
    for (var j = 0; j < hits.length; j++) {
      var h = hits[j];
      var prev = res[res.length - 1];
      if (prev && h.start < prev.end) {
        if ((h.w > prev.w) || (h.w === prev.w && (h.end - h.start) > (prev.end - prev.start))) res[res.length - 1] = h;
        continue;
      }
      res.push(h);
    }
    return res;
  }

  /* ---------------- анализ строк / структуры ---------------- */

  var MARKETING_EMOJI = '✅🔹🔸👉📌🚀💡⚡🔥✨❗❕✔☑🎯📊📈🧩🛠💪🤝';

  function analyzeLines(text) {
    var lines = text.split('\n');
    var st = { total: 0, bullets: 0, headers: 0, colonHeaders: 0, bold: 0, emoji: 0 };
    st.bold = (text.match(/\*\*[^*\n]{2,80}\*\*/g) || []).length;
    st.emoji = (text.match(new RegExp('[' + MARKETING_EMOJI + ']', 'gu')) || []).length;
    var emojiStart = new RegExp('^[' + MARKETING_EMOJI + ']', 'u');
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (!ln) continue;
      st.total++;
      if (/^([-–—•*▪●○]|\d{1,2}[.)])\s+/.test(ln) || emojiStart.test(ln)) { st.bullets++; continue; }
      if (/^#{1,6}\s/.test(ln)) { st.headers++; continue; }
      if (/^[^.!?…]{3,70}:\s*$/.test(ln)) { st.colonHeaders++; continue; }
      if (ln.length < 64 && countWords(ln) <= 9 && !/[.!?…,:;]$/.test(ln)) st.headers++;
    }
    return st;
  }

  /* ---------------- профили ---------------- */

  var PROFILES = {
    strict:   { mult: 1.14, shift: 3,  seg: [66, 50, 33], name: 'Строгий' },
    balanced: { mult: 1.0,  shift: 0,  seg: [72, 55, 38], name: 'Сбалансированный' },
    soft:     { mult: 0.87, shift: -3, seg: [78, 61, 43], name: 'Мягкий' }
  };

  /* ---------------- метрики ---------------- */

  // Каждая метрика возвращает { signal: 0..100 (больше = более ИИ), reliability: 0..1, value, detail }

  function metricCliches(hits, words) {
    var sumW = 0;
    for (var i = 0; i < hits.length; i++) sumW += hits[i].w;
    var per1000 = words ? (sumW / words) * 1000 : 0;
    return {
      signal: scale(per1000, [[0, 2], [4, 18], [9, 40], [16, 62], [28, 82], [45, 95], [70, 100]]),
      reliability: clamp(words / 150, 0.3, 1),
      value: Math.round(per1000 * 10) / 10,
      detail: hits.length + ' совпадений, взвешенная плотность ' + (Math.round(per1000 * 10) / 10) + ' на 1000 слов'
    };
  }

  function metricRhythm(sentences) {
    var lens = [];
    for (var i = 0; i < sentences.length; i++) {
      var wc = countWords(sentences[i].text);
      if (wc >= 3) lens.push(wc); // пункты списков/заголовки не считаем
    }
    if (lens.length < 5) return { signal: 50, reliability: 0.15, value: 0, detail: 'Слишком мало предложений для оценки ритма' };
    var globalCv = cv(lens);
    // локальная равномерность: средний |разница соседних| / средняя длина
    var diffs = [];
    for (var j = 1; j < lens.length; j++) diffs.push(Math.abs(lens[j] - lens[j - 1]));
    var localVar = mean(diffs) / (mean(lens) || 1);
    var sGlobal = scale(globalCv, [[0.18, 95], [0.28, 78], [0.38, 55], [0.48, 32], [0.58, 16], [0.72, 5]]);
    var sLocal = scale(localVar, [[0.15, 92], [0.3, 70], [0.45, 45], [0.6, 25], [0.8, 8]]);
    return {
      signal: Math.round(sGlobal * 0.6 + sLocal * 0.4),
      reliability: clamp(lens.length / 15, 0.3, 1),
      value: Math.round(globalCv * 100) / 100,
      detail: 'Вариативность длины предложений (CV): ' + (Math.round(globalCv * 100) / 100) +
        '. Средняя длина ' + Math.round(mean(lens)) + ' слов. У живого текста CV обычно 0.45–0.75.'
    };
  }

  function metricStarters(sentences, starters) {
    var eligible = 0, hitCount = 0, firstWords = {}, repeats = 0;
    for (var i = 0; i < sentences.length; i++) {
      var t = sentences[i].text.toLowerCase().replace(/^["«\-–—\d.)\s#*]+/, '');
      if (countWords(t) < 3) continue;
      eligible++;
      for (var j = 0; j < starters.length; j++) {
        var st = starters[j];
        if (t.indexOf(st) === 0) { hitCount++; break; }
      }
      var fw = (t.match(/^[а-яёa-z]+/) || [''])[0];
      if (fw) { firstWords[fw] = (firstWords[fw] || 0) + 1; }
    }
    for (var k in firstWords) { if (firstWords[k] >= 3) repeats += firstWords[k] - 2; }
    if (!eligible) return { signal: 40, reliability: 0.1, value: 0, detail: 'Нет предложений для оценки' };
    var share = hitCount / eligible + (repeats / eligible) * 0.5;
    return {
      signal: scale(share, [[0, 4], [0.06, 18], [0.12, 38], [0.2, 60], [0.3, 80], [0.45, 95]]),
      reliability: clamp(eligible / 10, 0.3, 1),
      value: Math.round(share * 100),
      detail: hitCount + ' из ' + eligible + ' предложений начинаются с шаблонной связки («таким образом», «кроме того»…)'
    };
  }

  function metricBureaucratic(lowerText, words, burList, lang) {
    if (lang !== 'ru') {
      // для английского считаем только из списка en
    }
    var count = 0, found = {};
    for (var i = 0; i < burList.length; i++) {
      var re = cachedRegex('bur::' + burList[i], burList[i], 1);
      var m;
      while ((m = re.exec(lowerText)) !== null) {
        count++; found[burList[i]] = (found[burList[i]] || 0) + 1;
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
    // номинализации: -ение/-ание/-ация/-ость/-ство
    var nom = (lowerText.match(/[а-яё]{3,}(ени[еия]|ани[еия]|аци[еия]|яци[еия]|ост[ьи]|ств[оае])(?![а-яё])/g) || []).length;
    var per100 = words ? ((count * 1.6 + nom * 0.55) / words) * 100 : 0;
    var top = Object.keys(found).sort(function (a, b) { return found[b] - found[a]; }).slice(0, 6);
    return {
      signal: scale(per100, [[0.5, 5], [2, 22], [4, 42], [7, 62], [11, 80], [16, 93]]),
      reliability: clamp(words / 150, 0.3, 1) * (lang === 'ru' ? 1 : 0.7),
      value: Math.round(per100 * 10) / 10,
      detail: 'Плотность канцелярита и отглагольных существительных: ' + (Math.round(per100 * 10) / 10) +
        ' на 100 слов' + (top.length ? '. Частые: ' + top.join(', ') : ''),
      found: top
    };
  }

  function metricStructure(lineStats, chars, markdownAware) {
    if (lineStats.total < 3) return { signal: 30, reliability: 0.2, value: 0, detail: 'Мало строк для оценки структуры' };
    var bulletShare = lineStats.bullets / lineStats.total;
    var headerShare = (lineStats.headers + lineStats.colonHeaders) / lineStats.total;
    var boldPer1000 = (lineStats.bold / Math.max(chars, 1)) * 1000 * 100; // на 100k симв. → нормируем ниже
    var s = scale(bulletShare, [[0, 5], [0.15, 25], [0.3, 50], [0.45, 72], [0.6, 88]]);
    s += scale(headerShare, [[0, 0], [0.1, 8], [0.25, 18], [0.4, 26]]);
    s += Math.min(18, lineStats.bold * 2.2);
    s += Math.min(14, lineStats.emoji * 2.5);
    s = clamp(Math.round(s), 0, 100);
    var capped = markdownAware ? Math.min(s, 38) : s;
    return {
      signal: capped,
      reliability: clamp(lineStats.total / 8, 0.3, 1) * 0.9,
      value: Math.round(bulletShare * 100),
      detail: 'Списки: ' + lineStats.bullets + ' строк, заголовки: ' + (lineStats.headers + lineStats.colonHeaders) +
        ', жирные выделения **…**: ' + lineStats.bold + ', «маркетинговые» эмодзи: ' + lineStats.emoji +
        (markdownAware ? '. Режим «структура задумана» — вклад ограничен.' : '')
    };
  }

  function metricParagraphs(text) {
    var paras = text.split(/\n\s*\n|\n(?=[-–—•*#\d])/).map(function (p) { return p.trim(); }).filter(function (p) { return countWords(p) >= 8; });
    if (paras.length < 4) return { signal: 40, reliability: 0.15, value: 0, detail: 'Мало абзацев для оценки' };
    var lens = paras.map(countWords);
    var c = cv(lens);
    return {
      signal: scale(c, [[0.1, 88], [0.2, 70], [0.3, 50], [0.45, 28], [0.6, 12], [0.8, 4]]),
      reliability: clamp(paras.length / 8, 0.3, 1),
      value: Math.round(c * 100) / 100,
      detail: paras.length + ' абзацев, вариативность объёма (CV): ' + (Math.round(c * 100) / 100) +
        '. Одинаковые по размеру абзацы — типичный почерк генерации.'
    };
  }

  function metricPunctuation(text, chars, sentences) {
    var dashes = (text.match(/\s[—–]\s/g) || []).length;
    var colons = (text.match(/:/g) || []).length;
    var semis = (text.match(/;/g) || []).length;
    var questions = (text.match(/\?/g) || []).length;
    var exclaims = (text.match(/!/g) || []).length;
    var parens = (text.match(/\(/g) || []).length;
    var ellips = (text.match(/…|\.\.\./g) || []).length;
    var per1000 = function (n) { return chars ? (n / chars) * 1000 : 0; };
    var aiSide = scale(per1000(dashes) + per1000(colons) * 0.7 + per1000(semis) * 0.5,
      [[0.5, 10], [2, 30], [4, 55], [6.5, 75], [10, 90]]);
    var humanSide = (questions ? 14 : 0) + (parens ? 12 : 0) + (ellips ? 10 : 0) + (exclaims ? 8 : 0);
    var signal = clamp(Math.round(aiSide - humanSide * 0.7 + (questions + parens + ellips === 0 && chars > 2500 ? 18 : 0)), 0, 100);
    return {
      signal: signal,
      reliability: clamp(chars / 2500, 0.3, 1) * 0.85,
      value: Math.round(per1000(dashes + colons) * 10) / 10,
      detail: 'Тире: ' + dashes + ', двоеточий: ' + colons + ', вопросов: ' + questions +
        ', скобок: ' + parens + ', многоточий: ' + ellips +
        '. ИИ-текст «ровный»: много тире и двоеточий, нет вопросов и скобок-ремарок.'
    };
  }

  var STOP_RU = 'и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между это'.split(' ');

  function metricLexical(lowerText) {
    var tokens = lowerText.match(/[а-яёa-z][а-яёa-z\-]{3,}/g) || [];
    var content = [];
    for (var i = 0; i < tokens.length; i++) {
      if (STOP_RU.indexOf(tokens[i]) === -1) content.push(tokens[i]);
    }
    if (content.length < 120) return { signal: 45, reliability: 0.15, value: 0, detail: 'Мало слов для лексической оценки' };
    // грубая лемма: первые 6 букв
    var stems = {}, uniq = 0;
    for (var j = 0; j < content.length; j++) {
      var st = content[j].slice(0, 6);
      if (!stems[st]) { stems[st] = 0; uniq++; }
      stems[st]++;
    }
    var ratio = uniq / content.length;
    return {
      signal: scale(ratio, [[0.4, 10], [0.52, 22], [0.62, 40], [0.72, 60], [0.82, 78], [0.9, 88]]),
      reliability: clamp(content.length / 400, 0.3, 1) * 0.8,
      value: Math.round(ratio * 100) / 100,
      detail: 'Доля уникальных основ: ' + Math.round(ratio * 100) +
        '%. Люди естественно повторяют ключевые слова; ИИ склонен к «элегантному разнообразию» синонимов.'
    };
  }

  function metricSpecificity(text, lowerText, words, humanHits) {
    var firstPerson = (lowerText.match(/(^|[^а-яё])(я|мне|меня|мной|мой|моя|мои|моего|по-моему)(?![а-яё])/g) || []).length;
    var wePersonal = (lowerText.match(/(у нас|мы у себя|наш опыт|на нашем|в нашей практике|мы попробовали|мы столкнулись)/g) || []).length;
    var years = (text.match(/(^|[^\d])(19|20)\d{2}(?!\d)/g) || []).length;
    var numbersUnits = (text.match(/\d[\d\s.,]*\s?(₽|руб|%|км|кг|мм|см|м²|гб|мб|шт|час|минут|лет|раз|дн)(?![а-яёa-z])/gi) || []).length;
    var urls = (text.match(/https?:\/\/|www\./gi) || []).length;
    var quotes = (text.match(/«[^»]{10,240}»/g) || []).length;
    var digits = (text.match(/\d/g) || []).length;
    var markerScore = humanHits.length;
    var per1000 = function (n) { return words ? (n / words) * 1000 : 0; };
    var score =
      scale(per1000(firstPerson), [[0, 0], [2, 12], [6, 24], [14, 34]]) +
      scale(per1000(markerScore), [[0, 0], [2, 12], [6, 26], [14, 38]]) +
      scale(per1000(numbersUnits + years), [[0, 0], [1.5, 8], [5, 18], [12, 26]]) +
      (wePersonal ? 8 : 0) + (urls ? 4 : 0) + (quotes ? 6 : 0) +
      scale(per1000(digits), [[0, 0], [4, 4], [15, 10], [40, 14]]);
    var humanScore = clamp(Math.round(score), 0, 100);
    return {
      signal: 100 - humanScore,
      reliability: clamp(words / 150, 0.3, 1),
      value: humanScore,
      detail: 'Личные формы: ' + (firstPerson + wePersonal) + ', разговорные маркеры: ' + markerScore +
        ', числа с единицами: ' + numbersUnits + ', годы: ' + years + ', цитаты: ' + quotes +
        '. Конкретика и личный опыт — сильнейший «человеческий» сигнал (и E-E-A-T для SEO).',
      humanScore: humanScore
    };
  }

  /* ---------------- сегментация ---------------- */

  function makeSegments(text, segmentSize) {
    var paras = [];
    var re = /[^\n]+(\n|$)/g, m;
    while ((m = re.exec(text)) !== null) {
      if (m[0].trim()) paras.push({ text: m[0], start: m.index, end: m.index + m[0].length });
    }
    var segments = [], cur = null;
    for (var i = 0; i < paras.length; i++) {
      if (!cur) { cur = { start: paras[i].start, end: paras[i].end }; }
      else { cur.end = paras[i].end; }
      if (cur.end - cur.start >= segmentSize) { segments.push(cur); cur = null; }
    }
    if (cur) {
      // маленький хвост приклеиваем к предыдущему сегменту
      if (segments.length && (cur.end - cur.start) < segmentSize * 0.4) {
        segments[segments.length - 1].end = cur.end;
      } else segments.push(cur);
    }
    return segments.map(function (s, idx) {
      return { id: idx + 1, start: s.start, end: s.end, text: text.slice(s.start, s.end) };
    });
  }

  /* ---------------- основной анализ ---------------- */

  function analyze(text, kb, options) {
    options = options || {};
    var profile = PROFILES[options.profile] || PROFILES.balanced;
    var segmentSize = options.segmentSize || 900;
    var whitelist = (options.whitelist || []).map(function (s) { return String(s).toLowerCase().trim(); });
    var markdownAware = !!options.markdownAware;

    text = String(text || '').replace(/\r\n?/g, '\n');
    var lowerText = text.toLowerCase();
    var chars = text.length;
    var words = countWords(text);
    var lang = (options.lang && options.lang !== 'auto') ? options.lang : detectLang(text);

    var sentences = splitSentences(text);
    var lineStats = analyzeLines(text);

    var phraseList = (kb.phrases && kb.phrases[lang]) || [];
    var otherList = lang === 'ru' ? (kb.phrases.en || []) : (kb.phrases.ru || []);
    var hits = findPhraseHits(lowerText, phraseList, whitelist, 'p')
      .concat(findPhraseHits(lowerText, otherList, whitelist, 'p2'));
    hits.sort(function (a, b) { return a.start - b.start; });

    var humanEntries = ((kb.humanMarkers && kb.humanMarkers[lang]) || []).map(function (p) {
      return { p: p, w: 1, cat: 'human', repl: [], note: 'Живой разговорный маркер' };
    });
    var humanHits = findPhraseHits(lowerText, humanEntries, [], 'h');

    var starters = (kb.starters && kb.starters[lang]) || [];
    var burList = (kb.bureaucratic && kb.bureaucratic[lang]) || [];

    // канцелярит с офсетами — для подсветки в тексте
    var burEntries = burList.map(function (p) {
      return { p: p, w: 1, cat: 'bureaucratic', repl: [], note: 'Канцелярит — замените активным глаголом' };
    });
    var burHits = findPhraseHits(lowerText, burEntries, whitelist, 'burh');

    // шаблонные начала предложений с офсетами — для подсветки
    var startersByLen = starters.slice().sort(function (a, b) { return b.length - a.length; });
    var starterHits = [];
    sentences.forEach(function (s) {
      if (countWords(s.text) < 3) return;
      var raw = text.slice(s.start, s.end);
      var lead = (raw.match(/^[\s"«\-–—\d.)#*]*/) || [''])[0].length;
      var t = raw.slice(lead).toLowerCase();
      for (var i = 0; i < startersByLen.length; i++) {
        var st = startersByLen[i];
        if (t.indexOf(st) === 0 && !/[а-яёa-z]/.test(t.charAt(st.length))) {
          starterHits.push({ start: s.start + lead, end: s.start + lead + st.length, phrase: st, match: raw.slice(lead, lead + st.length) });
          break;
        }
      }
    });

    /* --- метрики --- */
    var mCliche = metricCliches(hits, words);
    var mRhythm = metricRhythm(sentences);
    var mStart = metricStarters(sentences, starters);
    var mBur = metricBureaucratic(lowerText, words, burList, lang);
    var mStruct = metricStructure(lineStats, chars, markdownAware);
    var mPara = metricParagraphs(text);
    var mPunct = metricPunctuation(text, chars, sentences);
    var mLex = metricLexical(lowerText);
    var mSpec = metricSpecificity(text, lowerText, words, humanHits);

    var METRICS = [
      { key: 'cliches',    title: 'Штампы и клише ИИ',        w: 0.24, m: mCliche,
        explain: 'Совпадения с базой типичных фраз нейросетей и SEO-копирайтинга. Самый показательный сигнал.' },
      { key: 'rhythm',     title: 'Ритм предложений',          w: 0.15, m: mRhythm,
        explain: 'ИИ пишет предложениями почти одинаковой длины. Живой текст «дышит»: короткое — длинное — среднее.' },
      { key: 'starters',   title: 'Шаблонные начала',          w: 0.10, m: mStart,
        explain: 'Доля предложений, начинающихся со связок «таким образом», «кроме того», «более того» и т.п.' },
      { key: 'bureaucratic', title: 'Канцелярит и пассив',     w: 0.11, m: mBur,
        explain: '«Является», «осуществляется», отглагольные существительные — стиль, который ИИ обожает.' },
      { key: 'structure',  title: 'Структурные шаблоны',       w: 0.07, m: mStruct,
        explain: 'Списки-простыни, заголовки с двоеточием, жирные выделения, эмодзи-маркеры — почерк генерации.' },
      { key: 'paragraphs', title: 'Однородность абзацев',      w: 0.06, m: mPara,
        explain: 'Абзацы-«кирпичики» одинакового размера — признак генерации по плану.' },
      { key: 'punctuation', title: 'Пунктуационный профиль',   w: 0.07, m: mPunct,
        explain: 'Много тире и двоеточий, ноль вопросов, скобок и многоточий — «ровная» машинная пунктуация.' },
      { key: 'lexical',    title: 'Лексическое разнообразие',  w: 0.08, m: mLex,
        explain: 'Неестественно высокое разнообразие синонимов без повторов — «элегантная вариативность» ИИ.' },
      { key: 'specificity', title: 'Конкретика и опыт',        w: 0.12, m: mSpec,
        explain: 'Личный опыт, цифры, даты, цитаты, разговорные обороты. Чем их меньше — тем «мертвее» текст.' }
    ];

    var wSum = 0, sSum = 0, signals = [];
    METRICS.forEach(function (M) {
      var we = M.w * M.m.reliability;
      wSum += we; sSum += M.m.signal * we;
      signals.push(M.m.signal);
    });
    var raw = wSum ? sSum / wSum : 50;
    var aiScore = clamp(Math.round(raw * profile.mult + profile.shift), 0, 100);

    /* --- вердикт и уверенность --- */
    var verdict, verdictKey;
    if (aiScore >= 80) { verdict = 'Почти наверняка сгенерирован ИИ'; verdictKey = 'ai'; }
    else if (aiScore >= 60) { verdict = 'Вероятно, написан ИИ'; verdictKey = 'likely_ai'; }
    else if (aiScore >= 40) { verdict = 'Смешанный: похоже на ИИ с редактурой (или сухой человеческий стиль)'; verdictKey = 'mixed'; }
    else if (aiScore >= 20) { verdict = 'Скорее всего, написан человеком'; verdictKey = 'likely_human'; }
    else { verdict = 'Текст выглядит написанным человеком'; verdictKey = 'human'; }

    var confidence = words < 120 ? 'низкая' : (words < 400 ? 'средняя' : 'высокая');
    var disagreement = stdev(signals);
    if (disagreement > 33 && confidence === 'высокая') confidence = 'средняя';
    var confidenceNote = words < 120
      ? 'Текст короткий (' + words + ' слов) — любому детектору нужно 150+ слов для надёжной оценки.'
      : (disagreement > 33 ? 'Метрики расходятся между собой: часть текста может быть отредактирована.' : 'Объём текста достаточен для устойчивой оценки.');

    /* --- сегменты --- */
    var segs = makeSegments(text, segmentSize);
    var segments = segs.map(function (sg) {
      var sLower = sg.text.toLowerCase();
      var sWords = countWords(sg.text);
      var sSent = splitSentences(sg.text);
      var sHits = hits.filter(function (h) { return h.start >= sg.start && h.end <= sg.end; });
      var sHuman = humanHits.filter(function (h) { return h.start >= sg.start && h.end <= sg.end; });
      var c1 = metricCliches(sHits, sWords);
      var c2 = metricRhythm(sSent);
      var c3 = metricStarters(sSent, starters);
      var c4 = metricBureaucratic(sLower, sWords, burList, lang);
      var c5 = metricSpecificity(sg.text, sLower, sWords, sHuman);
      var parts = [
        { m: c1, w: 0.32 }, { m: c2, w: 0.16 }, { m: c3, w: 0.14 },
        { m: c4, w: 0.16 }, { m: c5, w: 0.22 }
      ];
      var ws = 0, ss = 0;
      parts.forEach(function (p) { var we = p.w * p.m.reliability; ws += we; ss += p.m.signal * we; });
      var score = clamp(Math.round((ws ? ss / ws : 50) * profile.mult + profile.shift), 0, 100);
      var label = score >= profile.seg[0] ? 'AI' : score >= profile.seg[1] ? 'LIKELY_AI' : score >= profile.seg[2] ? 'LIKELY_HUMAN' : 'HUMAN';
      var reasons = [];
      if (c1.signal >= 45 && sHits.length) reasons.push('Штампы: ' + sHits.slice(0, 4).map(function (h) { return '«' + h.match + '»'; }).join(', '));
      if (c2.signal >= 55 && c2.reliability > 0.2) reasons.push('Монотонный ритм предложений (CV ' + c2.value + ')');
      if (c3.signal >= 50) reasons.push('Шаблонные начала предложений');
      if (c4.signal >= 55) reasons.push('Канцелярит' + (c4.found && c4.found.length ? ': ' + c4.found.slice(0, 3).join(', ') : ''));
      if (c5.humanScore >= 40) reasons.push('Есть конкретика/личные маркеры — человеческий сигнал');
      if (!reasons.length) reasons.push(label === 'HUMAN' || label === 'LIKELY_HUMAN' ? 'Выраженных ИИ-признаков не найдено' : 'Совокупность слабых сигналов');
      return {
        id: sg.id, start: sg.start, end: sg.end, text: sg.text,
        chars: sg.text.length, score: score, label: label, reasons: reasons,
        hits: sHits.map(function (h) { return { phrase: h.match, cat: h.cat, w: h.w }; })
      };
    });

    var dist = { AI: 0, LIKELY_AI: 0, LIKELY_HUMAN: 0, HUMAN: 0 };
    segments.forEach(function (s) { dist[s.label]++; });

    /* --- тепловая карта предложений --- */
    var heat = sentences.filter(function (s) { return countWords(s.text) >= 2; }).map(function (s) {
      var seg = null;
      for (var i = 0; i < segments.length; i++) {
        if (s.start >= segments[i].start && s.start < segments[i].end) { seg = segments[i]; break; }
      }
      var local = seg ? seg.score * 0.55 : 30;
      var inHits = hits.filter(function (h) { return h.start >= s.start && h.start < s.end; });
      inHits.forEach(function (h) { local += h.w * 6; });
      var t = s.text.toLowerCase().replace(/^["«\-–—\d.)\s#*]+/, '');
      for (var j = 0; j < starters.length; j++) { if (t.indexOf(starters[j]) === 0) { local += 12; break; } }
      var inHuman = humanHits.filter(function (h) { return h.start >= s.start && h.start < s.end; });
      local -= inHuman.length * 8;
      return { start: s.start, end: s.end, score: clamp(Math.round(local), 0, 100), preview: s.text.slice(0, 140) };
    });

    /* --- рекомендации и сильные стороны --- */
    var recommendations = [];
    var strengths = [];
    function rec(priority, title, detail) { recommendations.push({ priority: priority, title: title, detail: detail }); }

    if (mCliche.signal >= 35) {
      var topHits = {};
      hits.forEach(function (h) { var k = '«' + h.match + '»'; topHits[k] = (topHits[k] || 0) + 1; });
      var listed = Object.keys(topHits).slice(0, 8).join(', ');
      rec(mCliche.signal >= 60 ? 'high' : 'medium', 'Убрать штампы ИИ',
        'Найдено ' + hits.length + ' совпадений с базой клише: ' + listed +
        '. Каждое либо удалите, либо замените конкретным фактом. Кнопка «Очеловечить» сделает безопасные замены автоматически.');
    } else if (hits.length === 0) strengths.push('Штампов ИИ из базы не найдено — отлично.');
    else strengths.push('Штампов мало (' + hits.length + ') — хороший результат.');

    if (mRhythm.signal >= 45 && mRhythm.reliability > 0.2) {
      rec(mRhythm.signal >= 65 ? 'high' : 'medium', 'Разбить монотонный ритм',
        'Предложения слишком одинаковые по длине (CV ' + mRhythm.value + '). Добавьте короткие предложения-акценты (3–5 слов). И пару длинных, со вставными конструкциями — как в живой речи. Целевой CV — выше 0.5.');
    } else if (mRhythm.reliability > 0.2 && mRhythm.signal < 30) strengths.push('Хороший живой ритм предложений (CV ' + mRhythm.value + ').');

    if (mStart.signal >= 45) {
      rec('medium', 'Переписать начала предложений',
        mStart.detail + '. Начинайте с сути: с существительного, глагола, цифры или вопроса — а не со связки.');
    }
    if (mBur.signal >= 45) {
      rec(mBur.signal >= 65 ? 'high' : 'medium', 'Заменить канцелярит активными глаголами',
        mBur.detail + '. «Осуществляется доставка» → «доставляем». «Является лидером» → «лидирует».');
    } else if (mBur.reliability > 0.3 && mBur.signal < 25) strengths.push('Канцелярита почти нет — текст звучит по-человечески.');

    if (mStruct.signal >= 50) {
      rec('medium', 'Ослабить «генеративную» структуру',
        mStruct.detail + '. Часть списков переведите в связный текст, уберите эмодзи-маркеры и лишние жирные выделения.');
    }
    if (mPara.signal >= 55 && mPara.reliability > 0.2) {
      rec('low', 'Разнообразить размер абзацев',
        mPara.detail + ' Сделайте один абзац из одного предложения — это сразу оживляет полосу текста.');
    }
    if (mPunct.signal >= 50) {
      rec('low', 'Оживить пунктуацию',
        mPunct.detail + ' Добавьте риторический вопрос, ремарку в скобках или многоточие там, где это естественно.');
    }
    if (mLex.signal >= 55 && mLex.reliability > 0.2) {
      rec('low', 'Не бояться повторов ключевых слов',
        mLex.detail + ' Для SEO повтор ключевого запроса в естественных формах — это плюс, а не минус.');
    }
    if (mSpec.humanScore < 35) {
      rec(mSpec.humanScore < 18 ? 'high' : 'medium', 'Добавить конкретику и личный опыт',
        'Самый мощный способ «очеловечить» текст и усилить E-E-A-T: реальные цифры, даты, названия, «мы столкнулись с…», «в нашем случае…», мини-кейс, цитата клиента. Сейчас индекс конкретики всего ' + mSpec.humanScore + '/100.');
    } else if (mSpec.humanScore >= 50) strengths.push('Много конкретики и личных маркеров (индекс ' + mSpec.humanScore + '/100) — сильный человеческий сигнал и плюс для E-E-A-T.');

    var prioOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort(function (a, b) { return prioOrder[a.priority] - prioOrder[b.priority]; });

    return {
      meta: {
        chars: chars, words: words, sentences: sentences.length,
        lang: lang, profile: options.profile || 'balanced', profileName: profile.name,
        segmentSize: segmentSize, markdownAware: markdownAware,
        engine: 'AI-Detector local v1', deterministic: true
      },
      overall: { aiScore: aiScore, humanScore: 100 - aiScore, verdict: verdict, verdictKey: verdictKey, confidence: confidence, confidenceNote: confidenceNote },
      metrics: METRICS.map(function (M) {
        var st = M.m.signal >= 55 ? 'bad' : M.m.signal >= 35 ? 'warn' : 'good';
        return { key: M.key, title: M.title, weight: M.w, signal: Math.round(M.m.signal), reliability: Math.round(M.m.reliability * 100) / 100, status: st, value: M.m.value, detail: M.m.detail, explain: M.explain };
      }),
      segments: segments,
      distribution: dist,
      hits: hits,
      humanHits: humanHits,
      burHits: burHits,
      starterHits: starterHits,
      heat: heat,
      recommendations: recommendations,
      strengths: strengths
    };
  }

  return {
    analyze: analyze,
    splitSentences: splitSentences,
    countWords: countWords,
    detectLang: detectLang,
    PROFILES: PROFILES
  };
});
