/*
 * Посентенс-анализ — балл «машинности» для каждого предложения.
 *
 * Зачем отдельно от detector.js: словарь ловит слова, а читателя отталкивает
 * предложение целиком. Внешние детекторы (ZeroGPT, Merlin) подсвечивают именно
 * предложения — и это единственное, что они умеют показать. Мы показываем то же,
 * но с объяснением: за каждым баллом стоит список конкретных причин.
 *
 * Всё считается локально и детерминированно, без нейросети.
 *
 * Веса подобраны не на глаз: проверены на 106 предложениях сырой генерации
 * против 1749 предложений вычищенных кейсов. AUC 0.857; при пороге 38 ловится
 * 35% машинных предложений при 0.5% ложных срабатываний на живом тексте.
 *
 * Признаки, идущие в балл (ни один не требует модели), по убыванию силы:
 *   Канцелярит          — 41.5% у генерации против 0.8% у живого текста
 *   Отглагольные сущ.   — 33.0% против 7.5%
 *   Штампы из базы      — 26.4% против 0.7%
 *   Шаблонное начало    — 16.0% против 0.4%
 *   Нет опоры           — 72.6% против 50.3% (слабый: часто и у живого)
 *   Ровность по длине   — 32.1% против 19.9% (совсем слабый)
 *
 * Признаки, НЕ идущие в балл — редакторские заметки (editorial: true):
 *   Перечислительный ряд — 16.0% у генерации против 26.6% у живого текста.
 *     Признак развёрнут в обратную сторону: длинные ряды однородных членов —
 *     это почерк кейса, а не машины. ZeroGPT подсвечивает их как ИИ; мы
 *     проверили и повторять его ошибку не стали.
 *   Повтор по тексту — 0.0% против 5.9%: в длинных кейсах разделы естественно
 *     перекликаются. Автору сказать полезно, к ИИ отношения не имеет.
 *
 * Табличные и списочные строки из повтора и ровности исключаются: повтор внутри
 * таблицы — это структура данных, а не почерк генерации.
 *
 * API:
 *   Sentences.analyze(text, sentences, ctx) -> [{start,end,score,level,reasons,features}]
 *     sentences — из AIDetector.splitSentences(text)
 *     ctx = { hits, burHits, starterHits }  — находки словаря с офсетами
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.Sentences = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function countWords(s) {
    var m = s.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\-']*/g);
    return m ? m.length : 0;
  }
  function normalize(s) {
    return s.toLowerCase().replace(/ё/g, 'е')
      .replace(/[^а-яa-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* -------- таблицы и списки --------
   * Строка считается структурной, если это пункт списка, строка с табуляциями
   * или короткая строка без завершающей точки, стоящая среди подобных.
   * Такие строки не штрафуем за повтор и за ровность длины.
   */
  function structuralRanges(text) {
    var ranges = [], pos = 0;
    var lines = text.split('\n');
    var flags = lines.map(function (ln) {
      var t = ln.trim();
      if (!t) return false;
      if ((ln.match(/\t/g) || []).length >= 2) return true;          // строка таблицы
      if (/^([-–—•*▪●○]|\d{1,2}[.)])\s+/.test(t)) return true;        // пункт списка
      if (t.length <= 60 && countWords(t) <= 8 && !/[.!?…]$/.test(t)) return true; // ячейка/заголовок
      return false;
    });
    // одиночная короткая строка среди прозы — это заголовок, а не таблица:
    // структурной считаем только там, где рядом есть такая же
    for (var i = 0; i < lines.length; i++) {
      var neighbour = (i > 0 && flags[i - 1]) || (i < lines.length - 1 && flags[i + 1]);
      var isStruct = flags[i] && (neighbour || (lines[i].match(/\t/g) || []).length >= 2);
      if (isStruct) ranges.push([pos, pos + lines[i].length]);
      pos += lines[i].length + 1;
    }
    return ranges;
  }

  function inRanges(start, ranges) {
    for (var i = 0; i < ranges.length; i++) {
      if (start >= ranges[i][0] && start < ranges[i][1]) return true;
    }
    return false;
  }

  /* -------- признаки одного предложения -------- */

  // Самая длинная цепочка однородных членов: «a, b, c и d» -> 4
  function longestChain(s) {
    var best = 0;
    s.split(/[.!?…]/).forEach(function (clause) {
      clause.split(/[:—–]/).forEach(function (run) {
        var parts = run.split(/,\s*|\s+и\s+/).filter(function (p) { return p.trim().length > 1; });
        if (parts.length > best) best = parts.length;
      });
    });
    return best;
  }

  function features(s, ctx) {
    var low = s.toLowerCase();
    var words = countWords(s);
    var abstr = (low.match(/[а-яё]{3,}(ени[еяю]|ани[еяю]|аци[июя]|ост[ьию]|ств[оае])(?![а-яё])/g) || []).length;
    return {
      words: words,
      chain: longestChain(s),
      abstr: abstr,
      abstrPer10: words ? abstr / words * 10 : 0,
      digits: (s.match(/\d/g) || []).length,
      quotes: (s.match(/«[^»]{3,}»/g) || []).length,
      latin: (s.match(/[A-Za-z]{2,}/g) || []).length,
      // имя собственное не в начале предложения
      proper: (s.slice(1).match(/[^.!?]\s[А-ЯЁ][а-яё]{2,}/g) || []).length
    };
  }

  /* -------- основной разбор -------- */

  function analyze(text, sentences, ctx) {
    ctx = ctx || {};
    var struct = structuralRanges(text);

    var live = sentences.filter(function (s) { return countWords(s.text) >= 6; });
    if (!live.length) return [];

    var meanLen = live.reduce(function (a, s) { return a + countWords(s.text); }, 0) / live.length;

    // 3-граммы всего документа — для поиска эха (структурные строки не в счёт)
    var tri = {};
    live.forEach(function (s) {
      if (inRanges(s.start, struct)) return;
      var tk = normalize(s.text).split(' ').filter(Boolean);
      for (var i = 0; i + 2 < tk.length; i++) {
        var g = tk[i] + ' ' + tk[i + 1] + ' ' + tk[i + 2];
        tri[g] = (tri[g] || 0) + 1;
      }
    });

    function hitsIn(list, s) {
      if (!list) return [];
      return list.filter(function (h) { return h.start >= s.start && h.start < s.end; });
    }

    return live.map(function (s) {
      var f = features(s.text, ctx);
      var isStruct = inRanges(s.start, struct);
      var reasons = [], score = 0;

      // 1. перечислительный ряд — РЕДАКТОРСКАЯ заметка, не признак ИИ.
      // Проверка на 106 предложениях сырой генерации против 1749 вычищенных
      // показала обратное тому, что мы предполагали: длинные ряды однородных
      // членов встречаются в живых кейсах ЧАЩЕ (26.6%), чем в генерации (16.0%).
      // Внешние детекторы подсвечивают их как «ИИ» — это их ложное срабатывание,
      // и повторять его мы не будем. Автору сказать стоит, в балл не берём.
      if (f.chain >= 5) {
        reasons.push({ code: 'chain', title: 'Длинный перечислительный ряд', editorial: true,
          detail: 'Однородных членов подряд: ' + f.chain + '. На ИИ это не указывает, но ряд ' +
                  'из пяти и больше элементов тяжело читается — подумайте, не разбить ли его.' });
      }

      // 2. отглагольные существительные
      if (f.abstrPer10 >= 1.2) {
        score += clamp((f.abstrPer10 - 1.0) * 22, 0, 30);
        reasons.push({ code: 'abstr', title: 'Отглагольные существительные',
          detail: 'Слов на -ение/-ание/-ация/-ость: ' + f.abstr + ' на ' + f.words +
                  ' слов. Замените их глаголами: «осуществляется доставка» → «доставляем».' });
      }

      // 3. штампы и канцелярит из базы, попавшие в это предложение
      var cl = hitsIn(ctx.hits, s), bu = hitsIn(ctx.burHits, s), st = hitsIn(ctx.starterHits, s);
      if (cl.length) {
        score += clamp(cl.reduce(function (a, h) { return a + (h.w || 1); }, 0) * 11, 0, 42);
        // синтаксические шаблоны («не X, а Y») — отдельной причиной: у них своё объяснение
        var pat = cl.filter(function (h) { return h.cat === 'pattern'; });
        var lex = cl.filter(function (h) { return h.cat !== 'pattern'; });
        if (lex.length) reasons.push({ code: 'cliche', title: 'Штамп из базы',
          detail: lex.map(function (h) { return '«' + h.match + '»'; }).join(', ') });
        pat.forEach(function (h) {
          reasons.push({ code: 'pattern', title: 'Шаблон ИИ: ' + h.phrase, detail: h.note });
        });
      }

      // 3б. два тире и больше в одном предложении. Почерк Claude: 9% его
      // предложений против 1.1–1.4% у живых авторов и в вычищенных кейсах.
      // Одно тире не штрафуем — у людей оно в 10–15% предложений.
      var dashes = (s.text.match(/\s[—–]\s/g) || []).length;
      if (dashes >= 2) {
        score += 16;
        reasons.push({ code: 'dashes', title: 'Тире-пояснения подряд',
          detail: 'Тире в предложении: ' + dashes + '. Цепочка пояснений через тире — почерк Claude; ' +
                  'разверните одно из пояснений в отдельное предложение.' });
      }
      if (bu.length) {
        score += clamp(bu.length * 13, 0, 34);
        reasons.push({ code: 'bur', title: 'Канцелярит',
          detail: bu.map(function (h) { return '«' + h.match + '»'; }).join(', ') });
      }
      if (st.length) {
        score += 20;
        reasons.push({ code: 'starter', title: 'Шаблонное начало',
          detail: '«' + st[0].match + '» — начните с сути: с существительного, глагола или цифры.' });
      }

      // 4. эхо по документу
      var echoShare = 0;
      if (!isStruct) {
        var tk = normalize(s.text).split(' ').filter(Boolean), echo = 0, n = 0;
        for (var i = 0; i + 2 < tk.length; i++) {
          n++;
          if ((tri[tk[i] + ' ' + tk[i + 1] + ' ' + tk[i + 2]] || 0) > 1) echo++;
        }
        echoShare = n ? echo / n : 0;
        // Признаком ИИ не является: на проверке срабатывал только на живых
        // текстах (5.9% против 0.0% у генерации) — в длинных кейсах разделы
        // естественно перекликаются. Оставляем как редакторскую заметку.
        if (echoShare >= 0.3) {
          reasons.push({ code: 'echo', title: 'Повтор по тексту', editorial: true,
            detail: Math.round(echoShare * 100) + '% словосочетаний этого предложения уже ' +
                    'встречались в других местах документа — проверьте, не дублируется ли мысль.' });
        }
      }

      // 5. ни одной опоры: ни числа, ни имени, ни кавычек, ни термина
      var anchors = f.digits + f.quotes + f.latin + f.proper;
      if (!anchors && f.words >= 10) {
        score += 9;
        reasons.push({ code: 'noanchor', title: 'Нет ни одной конкретной опоры',
          detail: 'Ни числа, ни названия, ни цитаты интерфейса. Такое предложение можно ' +
                  'вставить в кейс о любом другом проекте — и никто не заметит.' });
      }

      // 6. ровность по длине — слабый признак, поэтому и вес маленький
      if (!isStruct && meanLen) {
        var dev = Math.abs(f.words - meanLen) / meanLen;
        if (dev < 0.10 && f.words >= 10) {
          score += 3;
          reasons.push({ code: 'flat', title: 'Длина ровно средняя',
            detail: 'Ровно ' + f.words + ' слов при среднем ' + Math.round(meanLen) +
                    '. Сама по себе мелочь, но в связке с остальным — признак ровного машинного ритма.' });
        }
      }

      score = clamp(Math.round(score), 0, 100);
      var level = score >= 58 ? 'AI' : score >= 38 ? 'LIKELY_AI' : score >= 20 ? 'LIKELY_HUMAN' : 'HUMAN';
      if (!reasons.length) {
        reasons.push({ code: 'ok', title: 'Машинных признаков не найдено', detail: '' });
      }
      return {
        start: s.start, end: s.end, score: score, level: level,
        structural: isStruct, reasons: reasons,
        preview: s.text.slice(0, 160),
        features: { chain: f.chain, abstr: f.abstr, words: f.words,
                    anchors: anchors, echo: Math.round(echoShare * 100) }
      };
    });
  }

  return { analyze: analyze, structuralRanges: structuralRanges, longestChain: longestChain };
});
