/*
 * Смысловые повторы — предложения, которые говорят одно и то же разными
 * словами. Словарь такое не поймает в принципе: общих слов у них может не быть
 * вовсе. Ловим через эмбеддинги rubert-tiny2 (js/bert.js): косинус между
 * векторами двух предложений и есть мера смысловой близости.
 *
 * Пороги подобраны на 13 готовых кейсах и статьях (1491 предложение) и
 * проверены глазами по выборке из полосы, а не взяты на глаз:
 *   >= 0.84 — почти наверняка одна и та же мысль, сказанная дважды
 *   >= 0.76 — стоит посмотреть, в среднем 16 пар на кейс; сюда попадают
 *             настоящие повторы вроде «Там, где правильный ответ был
 *             неочевиден, мы собирали два варианта и показывали их рядом» /
 *             «Там, где ответ зависел от привычки трейдера, мы показывали
 *             два варианта»
 *   < 0.76  — уже просто общая тема внутри одного текста, это норма
 *
 * Модель (15 МБ) грузится только по требованию — на обычную проверку она не
 * влияет, и без неё весь остальной инструмент работает как раньше.
 *
 * API:
 *   Semantic.isReady()
 *   Semantic.load(onProgress) -> Promise
 *   Semantic.findRepeats(sentences, opts, onProgress) -> Promise<[pair]>
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.Semantic = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODEL_URL = 'model/rubert-tiny2.js';
  var MIN_WORDS = 8;          // короткие фразы дают ложное сходство
  var STRONG = 0.84, WEAK = 0.76;

  var model = null, tok = null, loading = null;

  function getBert() {
    if (typeof Bert !== 'undefined') return Bert;
    if (typeof self !== 'undefined' && self.Bert) return self.Bert;
    if (typeof require === 'function') { try { return require('./bert.js'); } catch (e) {} }
    return null;
  }
  function getWordPiece() {
    if (typeof WordPiece !== 'undefined') return WordPiece;
    if (typeof self !== 'undefined' && self.WordPiece) return self.WordPiece;
    if (typeof require === 'function') { try { return require('./wordpiece.js'); } catch (e) {} }
    return null;
  }

  function isReady() { return !!model; }

  function b64ToBytes(b64) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function build() {
    var B = getBert(), W = getWordPiece();
    if (!B || !W) throw new Error('нет js/bert.js или js/wordpiece.js');
    var g = (typeof self !== 'undefined') ? self : root;
    if (!g.RUBERT_B64 || !g.RUBERT_META) throw new Error('файл модели не загрузился');
    model = B.load(b64ToBytes(g.RUBERT_B64), g.RUBERT_META);
    tok = W.create(g.RUBERT_META.vocab);
    // строку в 15 МБ держать в памяти незачем — веса уже разложены
    try { g.RUBERT_B64 = null; } catch (e) {}
    return model;
  }

  function load(onProgress) {
    if (model) return Promise.resolve(model);
    if (loading) return loading;
    var g = (typeof self !== 'undefined') ? self : root;

    loading = new Promise(function (resolve, reject) {
      if (g.RUBERT_B64) { resolve(); return; }
      if (typeof document === 'undefined') { reject(new Error('модель грузится только в браузере')); return; }
      if (onProgress) onProgress('Загружаю модель, около 15 МБ. Это один раз — дальше она в кеше браузера.');
      var s = document.createElement('script');
      s.src = MODEL_URL;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('не нашёл ' + MODEL_URL)); };
      document.head.appendChild(s);
    }).then(function () {
      if (onProgress) onProgress('Готовлю модель…');
      return build();
    });
    loading.catch(function () { loading = null; });
    return loading;
  }

  // Разбиваем работу на куски и отдаём управление браузеру между ними,
  // иначе страница замирает на время счёта.
  function idle() {
    if (typeof requestAnimationFrame === 'function') {
      return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); });
    }
    return Promise.resolve();
  }

  function findRepeats(sentences, opts, onProgress) {
    opts = opts || {};
    var weak = opts.weak || WEAK, strong = opts.strong || STRONG;
    var minWords = opts.minWords || MIN_WORDS;

    return load(onProgress).then(function () {
      var live = sentences.filter(function (s) {
        return (s.text.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\-']*/g) || []).length >= minWords;
      });
      if (live.length < 2) return [];

      var ids = live.map(function (s) { return tok.encode(s.text, 256).ids; });
      var vecs = [], i = 0;
      var CHUNK = 24;

      function step() {
        if (i >= ids.length) return Promise.resolve();
        var part = ids.slice(i, i + CHUNK);
        var out = model.embedAll(part);
        for (var k = 0; k < out.length; k++) vecs.push(out[k]);
        i += CHUNK;
        if (onProgress) onProgress('Считаю предложения: ' + Math.min(i, ids.length) + ' из ' + ids.length);
        return idle().then(step);
      }

      return step().then(function () {
        var B = getBert(), pairs = [];
        for (var a = 0; a < vecs.length; a++) {
          for (var b = a + 1; b < vecs.length; b++) {
            var sc = B.cosine(vecs[a], vecs[b]);
            if (sc >= weak) {
              pairs.push({
                score: Math.round(sc * 1000) / 1000,
                level: sc >= strong ? 'strong' : 'weak',
                a: { start: live[a].start, end: live[a].end, text: live[a].text },
                b: { start: live[b].start, end: live[b].end, text: live[b].text }
              });
            }
          }
        }
        pairs.sort(function (x, y) { return y.score - x.score; });
        return pairs;
      });
    });
  }

  return {
    isReady: isReady, load: load, findRepeats: findRepeats,
    STRONG: STRONG, WEAK: WEAK, MODEL_URL: MODEL_URL,
    backend: function () { return model ? model.backend : null; }
  };
});
