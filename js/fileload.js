/*
 * Загрузка файлов: DOCX, PDF, ODT, TXT, MD, HTML, CSV, RTF, JSON.
 * Всё парсится локально в браузере (JSZip + pdf.js из libs/).
 *
 * FileLoader.read(file) -> Promise<{ text, name, kind, warnings: [] }>
 */
(function (root) {
  'use strict';

  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }

  function readAs(file, how) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(new Error('Не удалось прочитать файл «' + file.name + '»')); };
      if (how === 'buffer') fr.readAsArrayBuffer(file);
      else fr.readAsText(file, 'utf-8');
    });
  }

  function decodeXmlEntities(s) {
    return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (_, d) { return String.fromCodePoint(parseInt(d, 10)); });
  }

  /* ---------- DOCX ----------
   * Разбор живёт в docx.js: там же строится карта смещений, по которой
   * потом делается экспорт с пометками в исходный файл. Важно, чтобы текст
   * для анализа и текст для разметки извлекались одним и тем же кодом.
   */
  function parseDocx(buffer) {
    if (typeof DocxExport === 'undefined') return Promise.reject(new Error('Модуль docx.js не загружен'));
    return DocxExport.extract(buffer).then(function (res) { return res.text; });
  }

  /* ---------- ODT ---------- */
  function parseOdt(buffer) {
    if (typeof JSZip === 'undefined') return Promise.reject(new Error('Библиотека JSZip не загружена'));
    return JSZip.loadAsync(buffer).then(function (zip) {
      var doc = zip.file('content.xml');
      if (!doc) throw new Error('Внутри ODT не найден content.xml');
      return doc.async('string');
    }).then(function (xml) {
      var text = xml
        .replace(/<text:tab[^>]*\/>/g, '\t')
        .replace(/<text:line-break[^>]*\/>/g, '\n')
        .replace(/<\/text:p>/g, '\n')
        .replace(/<\/text:h>/g, '\n\n')
        .replace(/<[^>]+>/g, '');
      return decodeXmlEntities(text).replace(/\n{3,}/g, '\n\n').trim();
    });
  }

  /* ---------- PDF ---------- */
  function parsePdf(buffer) {
    if (typeof pdfjsLib === 'undefined') return Promise.reject(new Error('Библиотека pdf.js не загружена (libs/pdf.min.js)'));
    var task = pdfjsLib.getDocument({ data: buffer, isEvalSupported: false, disableFontFace: true });
    return task.promise.then(function (pdf) {
      var pages = [];
      for (var i = 1; i <= pdf.numPages; i++) pages.push(i);
      return pages.reduce(function (chain, pageNo) {
        return chain.then(function (acc) {
          return pdf.getPage(pageNo).then(function (page) {
            return page.getTextContent();
          }).then(function (tc) {
            var out = '', lastY = null;
            tc.items.forEach(function (it) {
              if (!it.str) { return; }
              var y = it.transform ? it.transform[5] : null;
              if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) out += '\n';
              else if (out && !/\s$/.test(out)) out += ' ';
              out += it.str;
              if (it.hasEOL) out += '\n';
              if (y !== null) lastY = y;
            });
            acc.push(out.trim());
            return acc;
          });
        });
      }, Promise.resolve([])).then(function (parts) {
        return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
      });
    });
  }

  /* ---------- HTML ---------- */
  function parseHtml(src) {
    var prepared = src
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|section|article)>/gi, '\n');
    var doc = new DOMParser().parseFromString(prepared, 'text/html');
    return (doc.body ? doc.body.textContent : '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ---------- RTF (грубо, но работает для простых файлов) ---------- */
  function parseRtf(src) {
    var text = src
      .replace(/\\'([0-9a-f]{2})/gi, function (_, h) {
        try { return decodeURIComponent('%' + h); } catch (e) { return ''; }
      })
      .replace(/\\u(-?\d+)\??/g, function (_, code) {
        var n = parseInt(code, 10); if (n < 0) n += 65536;
        return String.fromCharCode(n);
      })
      .replace(/\\par[d]?\b/g, '\n')
      .replace(/\\(tab)\b/g, '\t')
      .replace(/\{\\\*[^{}]*\}/g, '')
      .replace(/\\[a-z]+-?\d* ?/gi, '')
      .replace(/[{}]/g, '');
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ---------- CSV ---------- */
  function parseCsv(src) {
    return src.split(/\n/).map(function (line) {
      return line.replace(/[;,\t]+/g, ' — ').trim();
    }).join('\n').trim();
  }

  var TEXT_EXTS = ['txt', 'md', 'markdown', 'text', 'log'];

  function read(file) {
    var e = ext(file.name);
    var warnings = [];
    var source = null;   // оригинал файла — чтобы вернуть его же с пометками
    var p;
    if (e === 'docx') p = readAs(file, 'buffer').then(function (buf) {
      return parseDocx(buf).then(function (text) {
        source = { kind: 'docx', buffer: buf, text: text };
        return text;
      });
    });
    else if (e === 'odt') p = readAs(file, 'buffer').then(parseOdt);
    else if (e === 'pdf') p = readAs(file, 'buffer').then(parsePdf).then(function (t) {
      if (t.length < 40) warnings.push('Из PDF извлечено очень мало текста — возможно, это скан без текстового слоя.');
      return t;
    });
    else if (e === 'html' || e === 'htm') p = readAs(file, 'text').then(function (src) {
      // из HTML оформление тоже сохраняем: заголовки, списки, жирный
      var rich = typeof DocxExport !== 'undefined' ? DocxExport.richFromHtml(src) : null;
      if (rich && rich.text.trim().length > 40) {
        source = { kind: 'rich', rich: rich, text: rich.text };
        return rich.text;
      }
      return parseHtml(src);
    });
    else if (e === 'rtf') p = readAs(file, 'text').then(parseRtf);
    else if (e === 'csv' || e === 'tsv') p = readAs(file, 'text').then(parseCsv);
    else if (e === 'json') p = readAs(file, 'text').then(function (t) {
      try { var j = JSON.parse(t); return typeof j === 'string' ? j : (j.text || j.source_text || JSON.stringify(j, null, 1).replace(/[{}\[\]",]/g, ' ')); }
      catch (err) { return t; }
    });
    else if (e === 'doc') p = Promise.reject(new Error('Старый формат .doc не поддерживается — пересохраните как .docx'));
    else if (TEXT_EXTS.indexOf(e) !== -1 || (file.type && file.type.indexOf('text/') === 0) || !e) p = readAs(file, 'text');
    else p = Promise.reject(new Error('Формат .' + e + ' не поддерживается. Можно: DOCX, PDF, ODT, TXT, MD, HTML, RTF, CSV, JSON'));

    return p.then(function (text) {
      if (!text || !text.trim()) throw new Error('В файле «' + file.name + '» не найдено текста');
      return { text: text, name: file.name, kind: e || 'txt', warnings: warnings, source: source };
    });
  }

  root.FileLoader = { read: read };
})(typeof self !== 'undefined' ? self : this);
