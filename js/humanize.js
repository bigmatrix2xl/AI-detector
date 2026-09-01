/*
 * Очеловечивание v1 — детерминированные правки по базе знаний, без нейросети.
 * Принцип «не навреди»: правим только там, где грамматика гарантированно
 * не ломается. Остальные находки уходят в список ручной доработки.
 *
 * Безопасные операции:
 *  1. Удаление вводных конструкций в начале предложения:
 *     «Важно отметить, что внедрение…» → «Внедрение…»
 *     «Таким образом, цифровая…» → «Цифровая…»
 *  2. Удаление связок, обособленных запятыми, в середине предложения:
 *     «…процессы, кроме того, дают…» → «…процессы дают…»
 *  3. Замена фразы, стоящей в словарной форме, на вариант из базы
 *     (без склонения замену делать нельзя — пропускаем и отдаём в чек-лист).
 *  4. Снятие пустого эпитета с сохранением существительного:
 *     «комплексного подхода» → «подхода», «инновационных решений» → «решений».
 *     Работает в любой словоформе — падеж существительного не трогается,
 *     поэтому именно это правило и делает основную работу на реальных текстах,
 *     где штампы почти никогда не стоят в словарной форме.
 *
 * Чего словарь не умеет принципиально: перестроить фразу вокруг глагола
 * («играет ключевую роль» → «важен» требует согласования с подлежащим,
 * → «определяет» требует дополнения). Такое уходит в ручной список.
 *
 * Humanizer.apply(text, report, options) -> { text, changes, skipped, checklist, stats }
 *   options: { mode: 'safe' | 'aggressive' }
 *     safe       — только уверенные штампы (вес >= 3)
 *     aggressive — всё найденное в базе (вес >= 2)
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.Humanizer = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isUpper(ch) { return !!ch && ch !== ch.toLowerCase(); }

  function matchCase(sample, repl) {
    if (!repl) return repl;
    if (isUpper(sample[0])) return repl[0].toUpperCase() + repl.slice(1);
    return repl;
  }

  // Совпадает ли найденная форма со словарной (с точностью до регистра/ё)
  function isBaseForm(surface, phrase) {
    var norm = function (s) { return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim(); };
    return norm(surface) === norm(phrase);
  }

  var DELETABLE_CATS = { transition: 1, filler: 1, cliche: 1, aiphrase: 1 };

  // Замена, оканчивающаяся предлогом, меняет падеж следующего слова — руками
  var ENDS_WITH_PREP = /(^|\s)(в|во|на|к|ко|с|со|из|за|для|при|о|об|обо|по|у|от|до|над|под|про|через)$/i;
  // Предыдущее слово похоже на прилагательное — оно согласовано со старой фразой
  var ADJ_TAIL = /(ый|ий|ой|ая|яя|ое|ее|ые|ие|ого|его|ому|ему|ым|им|ых|их|ою|ею|ей)\s+$/i;
  // После удаления вводной не должно оставаться «Почему…» без вопроса
  // (\b с кириллицей не работает — используем явную границу)
  var QUESTION_WORD = /^(почему|зачем|как|когда|где|откуда|куда|кто|что|какой|какая|какие|каким)(?![а-яё])/i;
  // Если штамп начинается с глагола-сказуемого, замена тоже должна быть глагольной,
  // иначе предложение остаётся без сказуемого («…является частью…» → «…часть…»)
  var VERB_LIKE = /^[а-яё]+(ет|ит|ут|ют|ат|ят|ся|л|ла|ло|ли)(?![а-яё])/i;

  /* Если штамп начинается с глагола-сказуемого, замена обязана быть глаголом
   * ровно в той же форме: лицо, число и род должны совпасть. Иначе выходит
   * «что играет ключевую роль» → «что важен» — короткое прилагательное
   * согласуется с подлежащим, которого мы не знаем. */
  function firstWord(s) {
    var m = /[А-Яа-яЁёA-Za-z][А-Яа-яЁёA-Za-z-]*/.exec(s || '');
    return m ? m[0].toLowerCase() : '';
  }
  function verbForm(w) {
    w = String(w).replace(/(ся|сь)$/i, '');
    if (/(ла)$/i.test(w)) return 'past-f';
    if (/(ло)$/i.test(w)) return 'past-n';
    if (/(ли)$/i.test(w)) return 'past-pl';
    if (/(ет|ёт|ит)$/i.test(w)) return 'sg3';
    if (/(ут|ют|ат|ят)$/i.test(w)) return 'pl3';
    if (/л$/i.test(w)) return 'past-m';
    return null;
  }

  /* --- Убрать пустой эпитет ---------------------------------------------
   * Главный рабочий приём на реальных текстах: в «комплексного подхода»,
   * «инновационных решений», «интуитивно понятного интерфейса» штамп — это
   * прилагательное, а существительное несёт смысл. Выбрасываем только
   * определения: существительное остаётся в своём падеже, и согласование
   * сломать физически невозможно — падеж, род и число не трогаются.
   * Поэтому правило работает в любой словоформе, в отличие от замены.
   */
  var ADJ_END = /(ый|ий|ой|ая|яя|ое|ее|ые|ие|ого|его|ому|ему|ым|им|ых|их|ую|юю|ою|ею)$/i;
  var ADV_END = /(о|е|и)$/i;
  // категории, где прилагательное — это вода, а не смысл
  var EPITHET_CATS = { buzzword: 1, hype: 1, cliche: 1, filler: 1 };

  function words(s) {
    var out = [], re = /[А-Яа-яЁёA-Za-z][А-Яа-яЁёA-Za-z-]*/g, m;
    while ((m = re.exec(s)) !== null) out.push({ w: m[0], start: m.index, end: m.index + m[0].length });
    return out;
  }

  // Сколько ведущих слов можно снести, оставив существительное нетронутым.
  // Возвращает индекс начала существительного или -1, если правило неприменимо.
  function epithetCut(surface) {
    var ws = words(surface);
    if (ws.length < 2) return -1;
    var head = ws[ws.length - 1];              // в русском определяемое слово стоит последним
    if (head.w.length < 4) return -1;
    for (var i = 0; i < ws.length - 1; i++) {
      var w = ws[i].w;
      if (ADJ_END.test(w) && w.length >= 5) continue;
      // наречие («интуитивно понятный») сносим только вместе с прилагательным следом
      var next = ws[i + 1] && ws[i + 1].w;
      if (ADV_END.test(w) && w.length >= 6 && next && ADJ_END.test(next) && next.length >= 5) continue;
      return -1;                                // впереди не определение — не трогаем
    }
    return head.start;
  }

  function apply(text, report, options) {
    options = options || {};
    var minW = options.mode === 'aggressive' ? 2 : 3;
    var hits = (report.hits || []).filter(function (h) { return h.w >= minW; });
    hits.sort(function (a, b) { return b.start - a.start; }); // с конца, чтобы офсеты не поехали

    var out = text;
    var changes = [];
    var skipped = [];
    var replCounters = {};

    hits.forEach(function (h) {
      var surface = out.slice(h.start, h.end);
      var beforeCtx = out.slice(Math.max(0, h.start - 8), h.start);
      var afterText = out.slice(h.end);
      var sentStart = h.start === 0 || /(^|[.!?…]["»)]*\s+|\n\s*)$/.test(beforeCtx);
      var wantsDelete = h.repl && h.repl[0] === '';
      var variants = (h.repl || []).filter(function (r) { return r !== ''; });

      /* 1. Вводная конструкция в начале предложения: «Фраза, что …» / «Фраза, …» */
      if (sentStart && DELETABLE_CATS[h.cat]) {
        var mChto = /^,?\s+что\s+/.exec(afterText);
        var mComma = /^\s*,\s*/.exec(afterText);
        var mColon = /^\s*[:—–]\s*/.exec(afterText);
        var cut = null;
        if (mChto) cut = mChto[0].length;
        else if (wantsDelete && (mComma || mColon)) cut = (mComma || mColon)[0].length;
        if (cut !== null && !QUESTION_WORD.test(afterText.slice(cut))) {
          var rest = afterText.slice(cut).replace(/^[а-яёa-z]/, function (c) { return c.toUpperCase(); });
          out = out.slice(0, h.start) + rest;
          changes.push({ at: h.start, before: surface + afterText.slice(0, cut), after: '', reason: h.note || 'Вводный штамп — удалён', cat: h.cat });
          return;
        }
      }

      /* 2. Связка в середине предложения, обособленная запятыми */
      if (!sentStart && wantsDelete && (h.cat === 'transition' || h.cat === 'filler')) {
        var mAfter = /^\s*,\s*/.exec(afterText);
        if (/,\s*$/.test(beforeCtx) && mAfter) {
          out = out.slice(0, h.start) + afterText.slice(mAfter[0].length);
          // убираем дублирующую запятую перед фразой
          out = out.slice(0, h.start).replace(/,\s*$/, ' ') + out.slice(h.start);
          changes.push({ at: h.start, before: ', ' + surface + ',', after: '', reason: h.note || 'Связка-филлер — удалена', cat: h.cat });
          return;
        }
      }

      /* 3. Замена словарной формы на вариант из базы (без риска сломать согласование) */
      // Глагольные штампы автозаменой не трогаем совсем: «играет ключевую роль»
      // → «важен» требует согласования с подлежащим, → «определяет» требует
      // дополнения. Ни того, ни другого словарь не знает — это в ручной список.
      var phraseIsVerbal = VERB_LIKE.test(h.phrase);
      var safeVariants = phraseIsVerbal ? [] : variants.filter(function (v) {
        return !ENDS_WITH_PREP.test(v);
      });
      if (safeVariants.length && isBaseForm(surface, h.phrase) && !ADJ_TAIL.test(beforeCtx)) {
        variants = safeVariants;
        var idx = (replCounters[h.phrase] || 0) % variants.length;
        replCounters[h.phrase] = (replCounters[h.phrase] || 0) + 1;
        var replacement = matchCase(surface, variants[idx]);
        out = out.slice(0, h.start) + replacement + out.slice(h.end);
        changes.push({ at: h.start, before: surface, after: replacement, reason: h.note || 'Замена штампа', cat: h.cat });
        return;
      }

      /* 4. Снять пустой эпитет, оставив существительное в его падеже */
      if (EPITHET_CATS[h.cat]) {
        var cut = epithetCut(surface);
        if (cut > 0) {
          var head = surface.slice(cut);
          if (sentStart) head = head.charAt(0).toUpperCase() + head.slice(1);
          out = out.slice(0, h.start) + head + out.slice(h.end);
          changes.push({
            at: h.start, before: surface, after: head,
            reason: 'Пустой эпитет убран, существительное осталось как было', cat: h.cat
          });
          return;
        }
      }

      /* Нельзя править автоматически — в ручной список */
      skipped.push({
        phrase: surface,
        why: h.note || 'Штамп ИИ',
        hint: phraseIsVerbal && variants.length
          ? 'Перестройте фразу: ' + variants.join(' / ') + ' (глагол требует согласования и дополнения — машинально менять нельзя)'
          : variants.length
            ? 'Замените по смыслу: ' + variants.join(' / ') + ' (согласуйте падеж)'
            : 'Уберите или переформулируйте конкретикой'
      });
    });

    // косметика после правок
    out = out
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/,\s*,/g, ',')
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/([.!?…]) {2,}/g, '$1 ');

    // чек-лист ручной доработки: сначала пропущенные штампы, затем рекомендации отчёта
    var checklist = [];
    if (skipped.length) {
      var uniq = {};
      skipped.forEach(function (s) { if (!uniq[s.phrase.toLowerCase()]) uniq[s.phrase.toLowerCase()] = s; });
      var list = Object.keys(uniq).map(function (k) { return uniq[k]; });
      checklist.push({
        priority: 'high',
        title: 'Доправить штампы, которые нельзя менять автоматически (' + list.length + ')',
        detail: list.slice(0, 12).map(function (s) { return '«' + s.phrase + '» — ' + s.hint; }).join('; ')
      });
    }
    (report.recommendations || []).forEach(function (r) {
      checklist.push({ priority: r.priority, title: r.title, detail: r.detail });
    });
    checklist.push({
      priority: 'low', title: 'Перечитать вслух',
      detail: 'Финальный тест: прочитайте текст вслух. Всё, обо что спотыкается язык, «споткнёт» и читателя, и детектор.'
    });

    changes.sort(function (a, b) { return a.at - b.at; });

    return {
      text: out,
      changes: changes,
      skipped: skipped,
      checklist: checklist,
      stats: { replaced: changes.length, skipped: skipped.length, mode: options.mode || 'safe', charsBefore: text.length, charsAfter: out.length }
    };
  }

  return { apply: apply };
});
