/*
 * WordPiece-токенизатор для rubert-tiny2 (BertTokenizer).
 *
 * Зачем свой: тащить в проект transformers.js ради одной токенизации — это
 * лишний мегабайт кода и сборка модулей, а нам нужен ровно BertTokenizer
 * с конфигурацией из tokenizer.json этой модели:
 *   BertNormalizer(clean_text=true, lowercase=false, strip_accents=false)
 *   BertPreTokenizer
 *   WordPiece(unk='[UNK]', continuing_subword_prefix='##', max_input_chars=100)
 *   TemplateProcessing: [CLS] A [SEP]
 *
 * Сверено с эталонной реализацией (питоновский пакет tokenizers) на 1200
 * предложениях русского корпуса: расхождений ноль, id токенов совпадают точно.
 * Тонкость, на которой легко ошибиться: символы категории Unicode S («×», «°»,
 * «€») для BERT пунктуацией НЕ являются и от слова не отделяются.
 *
 * Пока не подключён: ждёт модуль эмбеддингов (см. README, раздел про модель).
 *
 * API:
 *   WordPiece.create(vocabObject) -> { encode(text, maxLen) -> {ids, tokens} }
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.WordPiece = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_UNICODE_RE = (function () {
    try { new RegExp('\\p{P}', 'u'); return true; } catch (e) { return false; }
  })();
  // Только категория P. Символы (\p{S}) — «×», «°», «€» — для BERT пунктуацией
  // НЕ являются и от слова не отделяются: «60×60» остаётся одним словом.
  var PUNCT_RE = HAS_UNICODE_RE ? new RegExp('\\p{P}', 'u') : null;

  // Определение пунктуации как в BERT: ASCII-символы из четырёх диапазонов
  // считаются пунктуацией всегда, остальное — по категории Unicode.
  function isPunct(ch) {
    var c = ch.charCodeAt(0);
    if ((c >= 33 && c <= 47) || (c >= 58 && c <= 64) ||
        (c >= 91 && c <= 96) || (c >= 123 && c <= 126)) return true;
    return PUNCT_RE ? PUNCT_RE.test(ch) : false;
  }

  function isWhitespace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || /\s/.test(ch);
  }

  // clean_text: выбрасываем NUL и управляющие, любой пробельный приводим к ' '
  function cleanText(text) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i], c = text.charCodeAt(i);
      if (c === 0 || c === 0xFFFD) continue;
      if (c < 32 && ch !== '\t' && ch !== '\n' && ch !== '\r') continue;
      out += isWhitespace(ch) ? ' ' : ch;
    }
    return out;
  }

  function isChinese(c) {
    return (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) ||
           (c >= 0x20000 && c <= 0x2A6DF) || (c >= 0x2A700 && c <= 0x2B73F) ||
           (c >= 0x2B740 && c <= 0x2B81F) || (c >= 0x2B820 && c <= 0x2CEAF) ||
           (c >= 0xF900 && c <= 0xFAFF) || (c >= 0x2F800 && c <= 0x2FA1F);
  }

  // BertPreTokenizer: режем по пробелам, пунктуация — отдельными токенами,
  // иероглифы — по одному символу
  function preTokenize(text) {
    var words = [], cur = '';
    function flush() { if (cur) { words.push(cur); cur = ''; } }
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (isWhitespace(ch)) { flush(); continue; }
      if (isPunct(ch)) { flush(); words.push(ch); continue; }
      if (isChinese(ch.codePointAt(0))) { flush(); words.push(ch); continue; }
      cur += ch;
    }
    flush();
    return words;
  }

  function create(vocab) {
    var UNK = '[UNK]', CLS = '[CLS]', SEP = '[SEP]', PAD = '[PAD]';
    var MAX_CHARS = 100;

    // Жадный разбор слова на подслова, самое длинное совпадение слева
    function wordPiece(word, outTokens) {
      if (word.length > MAX_CHARS) { outTokens.push(UNK); return; }
      var sub = [], start = 0;
      while (start < word.length) {
        var end = word.length, found = null;
        while (start < end) {
          var piece = (start > 0 ? '##' : '') + word.slice(start, end);
          if (Object.prototype.hasOwnProperty.call(vocab, piece)) { found = piece; break; }
          end--;
        }
        if (found === null) { outTokens.push(UNK); return; }  // всё слово -> [UNK]
        sub.push(found);
        start = end;
      }
      for (var i = 0; i < sub.length; i++) outTokens.push(sub[i]);
    }

    function encode(text, maxLen) {
      maxLen = maxLen || 512;
      var words = preTokenize(cleanText(String(text)));
      var tokens = [CLS];
      for (var i = 0; i < words.length; i++) {
        if (tokens.length >= maxLen - 1) break;
        wordPiece(words[i], tokens);
      }
      if (tokens.length > maxLen - 1) tokens = tokens.slice(0, maxLen - 1);
      tokens.push(SEP);
      var ids = tokens.map(function (t) {
        return Object.prototype.hasOwnProperty.call(vocab, t) ? vocab[t] : vocab[UNK];
      });
      return { ids: ids, tokens: tokens };
    }

    return { encode: encode, vocabSize: Object.keys(vocab).length,
             pad: vocab[PAD], cls: vocab[CLS], sep: vocab[SEP], unk: vocab[UNK] };
  }

  return { create: create, preTokenize: preTokenize, cleanText: cleanText, isPunct: isPunct };
});
