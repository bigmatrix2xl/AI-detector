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
  var PREDICATE_LIKE = /^[а-яё]+(ет|ит|ут|ют|ат|ят|ся|л|ла|ло|ли|ен|ён|жен|жна|жно|жны|на|но|ны)(?![а-яё])/i;

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
      var phraseIsVerbal = VERB_LIKE.test(h.phrase);
      var safeVariants = variants.filter(function (v) {
        if (ENDS_WITH_PREP.test(v)) return false;
        if (phraseIsVerbal && !PREDICATE_LIKE.test(v)) return false;
        return true;
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

      /* Нельзя править автоматически — в ручной список */
      skipped.push({
        phrase: surface,
        why: h.note || 'Штамп ИИ',
        hint: variants.length
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
