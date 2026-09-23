/*
 * SEO-показатели текста: вода, тошнота, читаемость, частотные слова.
 *
 * Те же величины, что считают text.ru, Advego и «Тургенев», но в понятных
 * определениях и с нормами, снятыми с живых текстов, а не взятыми на глаз:
 * 13 готовых кейсов «Доминиона» и 300 статей живых авторов из корпуса
 * LLMTrace (см. README, раздел «SEO-показатели»).
 *
 * На ИИ-балл ничего отсюда не влияет — это отдельный взгляд редактора.
 *
 * API: Seo.analyze(text) -> { words, water, nauseaClassic, nauseaAcademic,
 *        readability, avgSentence, longShare, keywords: [{word, count, density}] }
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.Seo = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Служебные слова и пустые связки — то, что не несёт смысла само по себе.
  var WATER = ('а без более бы был была были было быть в вам вас весь во вот все всего всех вы да для до его ее её если есть еще ещё же за и из или им их к как ко когда кто ли либо мне может мы на над надо наш не него нее неё нет ни них но ну о об однако он она они оно от очень по под при про раз с со так также такой там те тем то того тоже той только том ты у уж уже хотя чего чей чем что чтобы чье чья эта эти это этот этого этой этом я ' +
    'действительно просто именно вообще буквально практически фактически определенно определённо абсолютно весьма довольно достаточно крайне вполне как-то какой-то некий некоторый различные различных всевозможные ' +
    'является являются являться осуществляется осуществлять данный данная данное данные данного').split(' ');
  var WATER_SET = {};
  WATER.forEach(function (w) { if (w) WATER_SET[w] = 1; });

  // Для частотных слов отбрасываем ещё и местоимения, «который», наречия
  // времени — это не ключи. На «воду» этот список не влияет: её нормы сняты
  // с корпуса по списку выше.
  var STOP = {};
  WATER.concat(('который которая которое которые которого которой которому которым которых которую ' +
    'свой своя свое своё свои своего своей своих себя сам сама сами самый самая самое самые ' +
    'раньше теперь сейчас потом тогда здесь можно нужно будет будут было стало стал стала ' +
    'каждый каждая каждое каждые другой другая другие один одна одно одни два две три').split(' '))
    .forEach(function (w) { if (w) STOP[w] = 1; });

  function words(text) {
    return (text.toLowerCase().replace(/ё/g, 'е').match(/[а-яa-z][а-яa-z\-]*/g) || []);
  }
  function syllables(w) { return (w.match(/[аеиоуыэюяё]/g) || []).length || 1; }
  // грубая основа: слово без окончания — «карточка», «карточки», «карточек» сходятся
  function stem(w) { return w.length > 6 ? w.slice(0, w.length - 2) : w.length > 4 ? w.slice(0, w.length - 1) : w; }

  function analyze(text) {
    var ws = words(text);
    var n = ws.length;
    if (n < 30) return null;

    var water = 0;
    for (var i = 0; i < n; i++) if (WATER_SET[ws[i]]) water++;

    // частоты по основам; показываем самую частую словоформу основы
    var freq = {}, forms = {};
    ws.forEach(function (w) {
      if (STOP[w] || w.length < 4) return;
      var s = stem(w);
      freq[s] = (freq[s] || 0) + 1;
      forms[s] = forms[s] || {};
      forms[s][w] = (forms[s][w] || 0) + 1;
    });
    var stems = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; });
    var top = stems.slice(0, 10).map(function (s) {
      var f = forms[s], best = Object.keys(f).sort(function (a, b) { return f[b] - f[a]; })[0];
      return { word: best, count: freq[s], density: Math.round(freq[s] / n * 1000) / 10 };
    });
    var max = stems.length ? freq[stems[0]] : 0;
    // академическая тошнота — доля пяти самых частых значимых слов в тексте
    var top5 = stems.slice(0, 5).reduce(function (a, s) { return a + freq[s]; }, 0);

    // предложения и читаемость (формула Флеша, адаптация Оборневой для русского)
    var sents = text.split(/(?<=[.!?…])\s+|\n+/).map(function (x) { return x.trim(); })
      .filter(function (x) { return words(x).length >= 3; });
    var sl = sents.map(function (x) { return words(x).length; });
    var avgSent = sl.length ? sl.reduce(function (a, b) { return a + b; }, 0) / sl.length : 0;
    var syl = ws.reduce(function (a, w) { return a + syllables(w); }, 0) / n;
    var flesch = 206.835 - 1.3 * avgSent - 60.1 * syl;
    var longShare = sl.length ? sl.filter(function (x) { return x > 25; }).length / sl.length : 0;

    return {
      words: n,
      water: Math.round(water / n * 1000) / 10,
      nauseaClassic: Math.round(Math.sqrt(max) * 10) / 10,
      nauseaAcademic: Math.round(top5 / n * 1000) / 10,
      readability: Math.round(Math.max(0, Math.min(100, flesch))),
      avgSentence: Math.round(avgSent * 10) / 10,
      longShare: Math.round(longShare * 1000) / 10,
      keywords: top
    };
  }

  return { analyze: analyze };
});
