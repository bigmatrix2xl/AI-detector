/*
 * Экспорт DOCX с пометками для копирайтера.
 *
 * Идея: мы ничего не исправляем сами — мы отдаём копирайтеру его же файл,
 * в котором подсвечены проблемные места и на полях висят комментарии Word
 * («что не так» и «как переписать»). В конце — короткий отчёт.
 *
 * Две стратегии:
 *  1. Исходник — DOCX: правим ОРИГИНАЛЬНЫЙ word/document.xml внутри того же
 *     файла. Оформление сохраняется полностью: стили, шрифты, картинки,
 *     таблицы, колонтитулы — мы лишь разрезаем нужные текстовые прогоны и
 *     добавляем им подсветку + якоря комментариев.
 *  2. Исходник — не DOCX (набранный текст, PDF, HTML, Markdown, вставка из
 *     Word через буфер): собираем DOCX с нуля, восстанавливая структуру
 *     (заголовки, списки, жирный шрифт).
 *
 * Публичное API:
 *   DocxExport.extract(buffer)      -> Promise<{ text, map, xml }>   (его же зовёт fileload)
 *   DocxExport.richFromHtml(html)   -> { text, paragraphs } | null
 *   DocxExport.richFromPlain(text)  -> { text, paragraphs }
 *   DocxExport.build(opts)          -> Promise<{ blob, stats }>
 *
 * Всё локально: JSZip из libs/, ни одного сетевого запроса.
 */
(function (root) {
  'use strict';

  var DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
           'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  var REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  // Цвета подсветки Word (w:highlight) под типы находок
  var HIGHLIGHT = { ai: 'red', starter: 'cyan', bur: 'yellow', human: 'green' };
  var COMMENT_LIMIT = 300;      // предохранитель: Word тяжело открывает тысячи примечаний
  var SAME_PHRASE_LIMIT = 3;    // одну и ту же фразу комментируем первые N раз, дальше только подсветка

  var BAD_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

  function escXml(s) {
    return String(s).replace(BAD_CHARS, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ==================================================================
   *  1. Разбор DOCX с картой смещений
   *  Текст извлекается так же, как раньше, но для каждого символа
   *  дополнительно запоминается, откуда в XML он пришёл.
   * ================================================================== */

  function mapDocument(xml) {
    var chars = [], pos = [], posEnd = [], chunkOf = [], chunks = [];

    function push(ch, from, to, ci) {
      chars.push(ch); pos.push(from); posEnd.push(to); chunkOf.push(ci);
    }

    var NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

    // Раскодирование сущностей с сохранением исходных координат
    function pushDecoded(raw, base, ci) {
      var re = /&(?:#x([0-9a-fA-F]+)|#(\d+)|(amp|lt|gt|quot|apos));/g;
      var i = 0, m;
      while ((m = re.exec(raw)) !== null) {
        for (; i < m.index; i++) push(raw.charAt(i), base + i, base + i + 1, ci);
        var val = m[3] ? NAMED[m[3]] : String.fromCodePoint(parseInt(m[1] || m[2], m[1] ? 16 : 10));
        for (var k = 0; k < val.length; k++) {
          push(val.charAt(k), base + m.index, base + m.index + m[0].length, ci);
        }
        i = m.index + m[0].length;
        re.lastIndex = i;
      }
      for (; i < raw.length; i++) push(raw.charAt(i), base + i, base + i + 1, ci);
    }

    var re = /<w:t(?:\s[^>]*)?\/>|<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br(?:\s[^>]*)?\/?>|<\/w:p>|<w:instrText(?:\s[^>]*)?>[\s\S]*?<\/w:instrText>|<w:delText(?:\s[^>]*)?>[\s\S]*?<\/w:delText>/g;
    var m;
    while ((m = re.exec(xml)) !== null) {
      var tag = m[0];
      if (m[1] !== undefined) {
        var openLen = tag.length - m[1].length - 6; // 6 = длина '</w:t>'
        var chunk = {
          tagStart: m.index,
          contentStart: m.index + openLen,
          contentEnd: m.index + openLen + m[1].length,
          rPr: null
        };
        chunks.push(chunk);
        pushDecoded(m[1], chunk.contentStart, chunks.length - 1);
      } else if (tag === '<w:tab/>') {
        push('\t', -1, -1, -1);
      } else if (tag.indexOf('<w:br') === 0) {
        push('\n', -1, -1, -1);
      } else if (tag === '</w:p>') {
        push('\n', -1, -1, -1);
      }
      // <w:t/>, instrText, delText — пропускаем молча
    }

    return normalize(chars, pos, posEnd, chunkOf, chunks);
  }

  // Та же нормализация, что была в fileload (3+ переводов строки, trim),
  // но с сохранением карты смещений.
  function normalize(chars, pos, posEnd, chunkOf, chunks) {
    var keep = [], run = 0;
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      if (c === '\r') continue;
      if (c === '\n') { run++; if (run > 2) continue; } else { run = 0; }
      keep.push(i);
    }
    var a = 0, b = keep.length;
    while (a < b && /\s/.test(chars[keep[a]])) a++;
    while (b > a && /\s/.test(chars[keep[b - 1]])) b--;

    var text = '', mPos = [], mEnd = [], mChunk = [];
    for (var j = a; j < b; j++) {
      var k = keep[j];
      text += chars[k]; mPos.push(pos[k]); mEnd.push(posEnd[k]); mChunk.push(chunkOf[k]);
    }
    return { text: text, map: { pos: mPos, posEnd: mEnd, chunkOf: mChunk, chunks: chunks } };
  }

  function extract(buffer) {
    if (typeof JSZip === 'undefined') return Promise.reject(new Error('Библиотека JSZip не загружена (libs/jszip.min.js)'));
    return JSZip.loadAsync(buffer).then(function (zip) {
      var doc = zip.file('word/document.xml');
      if (!doc) throw new Error('Внутри DOCX не найден word/document.xml — файл повреждён?');
      return doc.async('string');
    }).then(function (xml) {
      var res = mapDocument(xml);
      res.xml = xml;
      return res;
    });
  }

  /* ==================================================================
   *  2. Комментарии Word: тексты и раздача id
   * ================================================================== */

  function prepareComments(marks, opts) {
    var comments = [], seen = {}, id = 0;
    marks.forEach(function (mk) { mk.cid = null; });
    if (!opts.comments) return comments;
    marks.forEach(function (mk) {
      var body = mk.comment || mk.tip || '';
      if (!body || mk.kind === 'human') return;
      var key = mk.kind + '::' + String(mk.text || '').toLowerCase();
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] > SAME_PHRASE_LIMIT) return;
      if (comments.length >= COMMENT_LIMIT) return;
      mk.cid = id++;
      comments.push({ id: mk.cid, body: body });
    });
    return comments;
  }

  function commentsXml(comments, startId, existingXml) {
    var date = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    var items = comments.map(function (c) {
      var paras = String(c.body).split('\n').map(function (ln) {
        return '<w:p><w:r><w:t xml:space="preserve">' + escXml(ln) + '</w:t></w:r></w:p>';
      }).join('');
      return '<w:comment w:id="' + (startId + c.id) + '" w:author="AI-детектор" w:initials="AI" w:date="' +
        date + '">' + paras + '</w:comment>';
    }).join('');
    if (existingXml && existingXml.indexOf('</w:comments>') !== -1) {
      return existingXml.replace('</w:comments>', items + '</w:comments>');
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<w:comments ' + NS + '>' + items + '</w:comments>';
  }

  function maxCommentId(xml) {
    var max = -1, re = /<w:comment\s[^>]*w:id="(\d+)"/g, m;
    while ((m = re.exec(xml || '')) !== null) max = Math.max(max, parseInt(m[1], 10));
    return max;
  }

  function anchorStart(mark, base) {
    return (mark.cid === null || mark.cid === undefined) ? ''
      : '<w:commentRangeStart w:id="' + (base + mark.cid) + '"/>';
  }
  function anchorEnd(mark, base) {
    return (mark.cid === null || mark.cid === undefined) ? ''
      : '<w:commentRangeEnd w:id="' + (base + mark.cid) + '"/>' +
        '<w:r><w:commentReference w:id="' + (base + mark.cid) + '"/></w:r>';
  }

  /* ==================================================================
   *  3. Стратегия 1 — разметка оригинального DOCX
   * ================================================================== */

  function runPropsFor(xml, chunk) {
    if (chunk.rPr !== null) return chunk.rPr;
    var rs = Math.max(xml.lastIndexOf('<w:r>', chunk.tagStart), xml.lastIndexOf('<w:r ', chunk.tagStart));
    var props = '';
    if (rs >= 0) {
      var gt = xml.indexOf('>', rs);
      if (gt > 0 && gt < chunk.tagStart && xml.slice(gt + 1, gt + 8) === '<w:rPr>') {
        var e = xml.indexOf('</w:rPr>', gt);
        if (e > 0 && e < chunk.tagStart) props = xml.slice(gt + 1, e + 8);
      }
    }
    chunk.rPr = props;
    return props;
  }

  // По схеме CT_RPr порядок элементов фиксирован: w:highlight идёт после
  // w:sz/w:color, но до w:u, w:lang и прочих. Word к порядку снисходителен,
  // строгие валидаторы — нет, поэтому вставляем в правильное место.
  var AFTER_HIGHLIGHT = /<w:(u|effect|bdr|shd|fitText|vertAlign|rtl|cs|em|lang|eastAsianLayout|specVanish|oMath)[ />]/;

  function withHighlight(rPr, color) {
    var tag = '<w:highlight w:val="' + color + '"/>';
    var clean = (rPr || '').replace(/<w:highlight[^>]*\/>/g, '');
    if (!clean) return '<w:rPr>' + tag + '</w:rPr>';
    var m = AFTER_HIGHLIGHT.exec(clean);
    if (m) return clean.slice(0, m.index) + tag + clean.slice(m.index);
    return clean.replace('</w:rPr>', tag + '</w:rPr>');
  }

  // содержимое здесь — уже готовый XML-текст из оригинала, повторно не экранируем
  function rawRun(rPr, rawXmlText) {
    if (!rawXmlText) return '';
    return '<w:r>' + rPr + '<w:t xml:space="preserve">' + rawXmlText + '</w:t></w:r>';
  }

  // Раскладываем пометки по кускам w:t: одна пометка может разорваться
  // на несколько прогонов (Word режет текст произвольно) и даже на абзацы.
  function segmentsByChunk(marks, map) {
    var byChunk = {};
    marks.forEach(function (mk) {
      var i = mk.start, parts = [];
      while (i < mk.end) {
        var c = map.chunkOf[i];
        if (c === undefined || c < 0) { i++; continue; }
        var j = i;
        while (j + 1 < mk.end && map.chunkOf[j + 1] === c && map.pos[j + 1] === map.posEnd[j]) j++;
        parts.push({ chunk: c, xs: map.pos[i], xe: map.posEnd[j] });
        i = j + 1;
      }
      parts.forEach(function (p, idx) {
        (byChunk[p.chunk] || (byChunk[p.chunk] = [])).push({
          xs: p.xs, xe: p.xe, mark: mk,
          first: idx === 0, last: idx === parts.length - 1
        });
      });
    });
    return byChunk;
  }

  function annotateOriginal(zip, xml, map, marks, base, blocks) {
    var byChunk = segmentsByChunk(marks, map);
    // идём с конца, чтобы смещения ранее найденных кусков не поехали
    var indices = Object.keys(byChunk).map(Number).sort(function (a, b) { return b - a; });

    indices.forEach(function (ci) {
      var chunk = map.chunks[ci];
      var segs = byChunk[ci].sort(function (a, b) { return a.xs - b.xs; });
      var rPr = runPropsFor(xml, chunk);
      var out = '<w:t xml:space="preserve">';
      var cursor = chunk.contentStart, first = true;

      segs.forEach(function (seg) {
        if (seg.xs < cursor) return; // перекрытие — пропускаем
        var plain = xml.slice(cursor, seg.xs);
        if (first) { out += plain + '</w:t></w:r>'; first = false; }
        else out += rawRun(rPr, plain);
        if (seg.first) out += anchorStart(seg.mark, base);
        out += rawRun(withHighlight(rPr, HIGHLIGHT[seg.mark.kind] || 'yellow'), xml.slice(seg.xs, seg.xe));
        if (seg.last) out += anchorEnd(seg.mark, base);
        cursor = seg.xe;
      });
      if (first) return;
      // хвост уходит в новый прогон: оригинальные </w:t></w:r> закроют его
      out += '<w:r>' + rPr + '<w:t xml:space="preserve">' + xml.slice(cursor, chunk.contentEnd);
      xml = xml.slice(0, chunk.tagStart) + out + xml.slice(chunk.contentEnd);
    });

    if (blocks.head) {
      var bodyOpen = xml.indexOf('<w:body>');
      if (bodyOpen >= 0) xml = xml.slice(0, bodyOpen + 8) + blocks.head + xml.slice(bodyOpen + 8);
    }
    if (blocks.tail) {
      var sect = xml.lastIndexOf('<w:sectPr');
      var at = sect > 0 ? sect : xml.lastIndexOf('</w:body>');
      if (at > 0) xml = xml.slice(0, at) + blocks.tail + xml.slice(at);
    }
    zip.file('word/document.xml', xml);
  }

  function ensureCommentsPart(zip, comments, existing, startId) {
    if (!comments.length) return;
    zip.file('word/comments.xml', commentsXml(comments, startId, existing.comments));

    var rels = existing.rels || ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
    if (rels.indexOf('Target="comments.xml"') === -1) {
      rels = rels.replace('</Relationships>',
        '<Relationship Id="rIdAidetComments" Type="' + REL_NS + '/comments" Target="comments.xml"/></Relationships>');
    }
    zip.file('word/_rels/document.xml.rels', rels);

    var ct = existing.contentTypes;
    if (ct && ct.indexOf('/word/comments.xml') === -1) {
      zip.file('[Content_Types].xml', ct.replace('</Types>',
        '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>'));
    }
  }

  /* ==================================================================
   *  4. Стратегия 2 — сборка DOCX с нуля
   * ================================================================== */

  function fmtProps(fmt, color) {
    var p = '';
    // порядок элементов внутри w:rPr задан схемой CT_RPr, не переставлять
    if (fmt && fmt.b) p += '<w:b/>';
    if (fmt && fmt.i) p += '<w:i/>';
    if (fmt && fmt.color) p += '<w:color w:val="' + fmt.color + '"/>';
    if (fmt && fmt.sz) p += '<w:sz w:val="' + fmt.sz + '"/><w:szCs w:val="' + fmt.sz + '"/>';
    if (color) p += '<w:highlight w:val="' + color + '"/>';
    if (fmt && fmt.u) p += '<w:u w:val="single"/>';
    return p ? '<w:rPr>' + p + '</w:rPr>' : '';
  }

  function textRun(s, fmt, color) {
    if (!s) return '';
    return '<w:r>' + fmtProps(fmt, color) + '<w:t xml:space="preserve">' + escXml(s) + '</w:t></w:r>';
  }

  // Кусок текста [from,to) с наложенными пометками
  function emitSpan(text, from, to, fmt, marks, base) {
    var out = '', i = from;
    for (var k = 0; k < marks.length; k++) {
      var mk = marks[k];
      if (mk.end <= from) continue;
      if (mk.start >= to) break;
      var s = Math.max(mk.start, from), e = Math.min(mk.end, to);
      if (s > i) out += textRun(text.slice(i, s), fmt);
      if (mk.start >= from) out += anchorStart(mk, base);
      out += textRun(text.slice(s, e), fmt, HIGHLIGHT[mk.kind] || 'yellow');
      if (mk.end <= to) out += anchorEnd(mk, base);
      i = e;
    }
    if (i < to) out += textRun(text.slice(i, to), fmt);
    return out;
  }

  var PARA_STYLE = { h1: 'Heading1', h2: 'Heading2', h3: 'Heading3', quote: 'Quote' };

  function richParaXml(p, text, marks, base) {
    var pPr = '';
    if (PARA_STYLE[p.kind]) pPr += '<w:pStyle w:val="' + PARA_STYLE[p.kind] + '"/>';
    if (p.kind === 'li') pPr += '<w:ind w:left="720" w:hanging="360"/>';
    var body = p.kind === 'li' ? textRun('•\t', null) : '';
    p.runs.forEach(function (r) {
      if (r.lit !== undefined) body += textRun(r.lit, r);
      else body += emitSpan(text, r.start, r.end, r, marks, base);
    });
    return '<w:p>' + (pPr ? '<w:pPr>' + pPr + '</w:pPr>' : '') + body + '</w:p>';
  }

  function stylesXml() {
    function heading(id, name, sz, outline) {
      return '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/>' +
        '<w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="' + outline + '"/>' +
        '<w:spacing w:before="240" w:after="120"/></w:pPr>' +
        '<w:rPr><w:b/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr></w:style>';
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<w:styles ' + NS + '>' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>' +
      '<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ru-RU"/>' +
      '</w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>' +
      '</w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      heading('Heading1', 'heading 1', 36, 0) +
      heading('Heading2', 'heading 2', 30, 1) +
      heading('Heading3', 'heading 3', 26, 2) +
      '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>' +
      '</w:styles>';
  }

  function buildFromRich(rich, marks, base, blocks) {
    if (typeof JSZip === 'undefined') throw new Error('Библиотека JSZip не загружена');
    var body = rich.paragraphs.map(function (p) { return richParaXml(p, rich.text, marks, base); }).join('');
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<w:document ' + NS + '><w:body>' + (blocks.head || '') + body + (blocks.tail || '') +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>' +
      '</w:sectPr></w:body></w:document>';

    var zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' +
      '</Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="' + REL_NS + '/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="' + REL_NS + '/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="' + REL_NS + '/comments" Target="comments.xml"/>' +
      '</Relationships>');
    zip.file('word/styles.xml', stylesXml());
    zip.file('word/document.xml', doc);
    return zip;
  }

  /* ==================================================================
   *  5. Восстановление структуры: из HTML (буфер обмена) и из текста
   * ================================================================== */

  var BLOCK_TAGS = /^(P|DIV|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE|TR|TD|TH|SECTION|ARTICLE|HEADER|FOOTER|FIGCAPTION|DD|DT|ADDRESS)$/;
  var KIND_BY_TAG = { H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h3', H5: 'h3', H6: 'h3', LI: 'li', BLOCKQUOTE: 'quote' };

  function trimPieces(pieces) {
    if (pieces.length) pieces[0].s = pieces[0].s.replace(/^\s+/, '');
    if (pieces.length) {
      var last = pieces[pieces.length - 1];
      last.s = last.s.replace(/\s+$/, '');
    }
    return pieces.filter(function (p) { return p.s.length; });
  }

  function richFromHtml(html) {
    if (typeof DOMParser === 'undefined') return null;
    var doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch (e) { return null; }
    if (!doc || !doc.body) return null;
    Array.prototype.slice.call(doc.body.querySelectorAll('script,style,noscript')).forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    return richFromDom(doc.body);
  }

  function richFromDom(body) {
    var paras = [], cur = null;

    function open(kind) {
      if (cur) { cur.pieces = trimPieces(cur.pieces); if (cur.pieces.length) paras.push(cur); }
      cur = { kind: kind || 'p', pieces: [] };
    }
    function add(s, fmt) {
      if (!s) return;
      if (!cur) open('p');
      cur.pieces.push({ s: s, fmt: fmt });
    }
    function walk(node, fmt) {
      if (node.nodeType === 3) { add(String(node.nodeValue).replace(/\s+/g, ' '), fmt); return; }
      if (node.nodeType !== 1) return;
      var tag = node.tagName;
      if (tag === 'BR') { open(cur ? cur.kind : 'p'); return; }
      var b = fmt.b, it = fmt.i, u = fmt.u;
      if (/^(B|STRONG|H[1-6])$/.test(tag)) b = true;
      else if (/^(I|EM)$/.test(tag)) it = true;
      else if (/^(U|INS)$/.test(tag)) u = true;
      var style = node.getAttribute && node.getAttribute('style');
      if (style) {
        // Google Docs заворачивает всю вставку в <b style="font-weight:normal">,
        // поэтому явный стиль всегда важнее тега
        if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) b = true;
        else if (/font-weight\s*:\s*(normal|[1-5]00)/i.test(style)) b = false;
        if (/font-style\s*:\s*italic/i.test(style)) it = true;
        else if (/font-style\s*:\s*normal/i.test(style)) it = false;
      }
      var f = (b === fmt.b && it === fmt.i && u === fmt.u) ? fmt : { b: b, i: it, u: u };
      var block = BLOCK_TAGS.test(tag);
      if (block) open(KIND_BY_TAG[tag] || 'p');
      for (var c = node.firstChild; c; c = c.nextSibling) walk(c, f);
      if (block) open('p');
    }

    for (var c = body.firstChild; c; c = c.nextSibling) walk(c, {});
    if (cur) { cur.pieces = trimPieces(cur.pieces); if (cur.pieces.length) paras.push(cur); }
    if (!paras.length) return null;

    var text = '', out = [];
    paras.forEach(function (p) {
      if (out.length) text += '\n';
      var runs = [];
      p.pieces.forEach(function (piece) {
        var start = text.length;
        text += piece.s;
        runs.push({ start: start, end: text.length, b: piece.fmt.b, i: piece.fmt.i, u: piece.fmt.u });
      });
      out.push({ kind: p.kind, runs: runs });
    });
    if (!text.trim()) return null;
    return { text: text, paragraphs: out };
  }

  // Из голого текста: заголовки (#), списки (-, *, 1.), цитаты (>), жирный (**…**).
  function richFromPlain(text) {
    var paras = [], offset = 0;
    text.split('\n').forEach(function (line) {
      var start = offset;
      offset += line.length + 1;
      if (!line.trim()) return;

      var kind = 'p', from = start, to = start + line.length;
      var mH = /^(#{1,6})\s+/.exec(line);
      var mL = /^\s*(?:[-*•—]|\d{1,3}[.)])\s+/.exec(line);
      var mQ = /^\s*>\s+/.exec(line);
      if (mH) { kind = mH[1].length === 1 ? 'h1' : mH[1].length === 2 ? 'h2' : 'h3'; from = start + mH[0].length; }
      else if (mL) { kind = 'li'; from = start + mL[0].length; }
      else if (mQ) { kind = 'quote'; from = start + mQ[0].length; }

      var runs = [], cursor = from;
      var body = text.slice(from, to);
      var re = /\*\*([^*\n]+)\*\*/g, m;
      while ((m = re.exec(body)) !== null) {
        var abs = from + m.index;
        if (abs > cursor) runs.push({ start: cursor, end: abs });
        runs.push({ start: abs + 2, end: abs + 2 + m[1].length, b: true });
        cursor = abs + m[0].length;
      }
      if (cursor < to) runs.push({ start: cursor, end: to });
      paras.push({ kind: kind, runs: runs });
    });
    if (!paras.length) paras.push({ kind: 'p', runs: [{ start: 0, end: text.length }] });
    return { text: text, paragraphs: paras };
  }

  /* ==================================================================
   *  6. Шапка-легенда и отчёт в конце документа
   * ================================================================== */

  function blockPara(runs, opts) {
    opts = opts || {};
    var pPr = '<w:spacing w:before="' + (opts.before || 0) + '" w:after="' + (opts.after || 80) + '"/>';
    if (opts.indent) pPr += '<w:ind w:left="' + opts.indent + '"/>';
    if (opts.pageBreak) pPr = '<w:pageBreakBefore/>' + pPr;
    if (opts.border) pPr += '<w:pBdr><w:top w:val="single" w:sz="6" w:space="4" w:color="999999"/>' +
      '<w:bottom w:val="single" w:sz="6" w:space="4" w:color="999999"/></w:pBdr>';
    return '<w:p><w:pPr>' + pPr + '</w:pPr>' + runs + '</w:p>';
  }

  function line(s, fmt, opts) { return blockPara(textRun(s, fmt), opts); }

  var LEGEND_ROWS = [
    ['ai', 'штамп ИИ', 'заменить или удалить: сухая формула вместо конкретики'],
    ['starter', 'шаблонное начало', 'переписать: начните с сути — существительного, глагола, цифры или вопроса'],
    ['bur', 'канцелярит', 'оживить активным глаголом: «доставляем» вместо «осуществляется доставка»'],
    ['human', 'живой маркер', 'НЕ трогать: это как раз то, что делает текст человеческим']
  ];

  function legendBlock(counts, report, options) {
    var x = '';
    x += blockPara(textRun('Документ размечен AI-детектором — правки для копирайтера', { b: true, sz: 26 }),
      { after: 60, border: true });
    x += line('Вердикт: ' + report.overall.verdict + ' · AI-сигнал ' + report.overall.aiScore +
      '/100 · человечность ' + report.overall.humanScore + '%.', { i: true }, { after: 140 });
    x += blockPara(textRun('Как читать пометки:', { b: true }), { after: 60 });
    LEGEND_ROWS.forEach(function (r) {
      if (r[0] === 'human' && !options.human) return;
      x += blockPara(
        textRun(' ' + r[1] + ' ', null, HIGHLIGHT[r[0]]) +
        textRun('  — ' + r[2] + '. Найдено: ' + (counts[r[0]] || 0) + '.', null),
        { after: 40, indent: 360 });
    });
    if (options.comments) {
      x += line('Пояснение к каждой находке — в примечании на полях: вкладка «Рецензирование» → «Показать примечания».',
        { i: true }, { before: 140, after: 60 });
    }
    x += line('Текст ниже не изменён — правки за автором. Итоговый отчёт со списком задач — в конце документа.',
      { i: true }, { after: 240 });
    return x;
  }

  function reportBlock(report, opts) {
    var PRIO = { high: 'Важно', medium: 'Желательно', low: 'Штрих' };
    var x = '';
    x += blockPara(textRun('Отчёт AI-детектора', { b: true, sz: 32 }), { pageBreak: true, after: 140 });
    x += line('Вердикт: ' + report.overall.verdict, { b: true });
    x += line('AI-сигнал: ' + report.overall.aiScore + '/100, человечность ' + report.overall.humanScore +
      '%. Уверенность оценки: ' + report.overall.confidence + '.');
    x += line('Объём: ' + report.meta.words + ' слов, ' + report.meta.chars + ' символов. Профиль: ' + report.meta.profileName + '.');
    x += line('Дата проверки: ' + new Date(opts.generatedAt || Date.now()).toLocaleString('ru-RU') + '.',
      { i: true }, { after: 200 });

    x += blockPara(textRun('Что исправить', { b: true, sz: 28 }), { before: 200, after: 100 });
    if (report.recommendations.length) {
      report.recommendations.forEach(function (r, i) {
        x += blockPara(
          textRun((i + 1) + '. [' + (PRIO[r.priority] || '') + '] ' + r.title + '. ', { b: true }) +
          textRun(r.detail, null), { after: 80 });
      });
    } else {
      x += line('Существенных проблем не найдено.');
    }

    if (report.hits.length) {
      x += blockPara(textRun('Найденные штампы и замены', { b: true, sz: 28 }), { before: 200, after: 100 });
      report.hits.slice(0, 80).forEach(function (h) {
        var repl = h.repl && h.repl.length
          ? (h.repl[0] === '' ? ' — лучше просто удалить' : ' — замена: ' + h.repl.filter(Boolean).join(' / '))
          : '';
        x += blockPara(textRun('• «' + h.match + '»', { b: true }) +
          textRun((h.note ? ' — ' + h.note : '') + repl, null), { after: 40, indent: 360 });
      });
      if (report.hits.length > 80) {
        x += line('…и ещё ' + (report.hits.length - 80) + ' — все подсвечены прямо в тексте.', { i: true }, { indent: 360 });
      }
    }

    if (report.strengths.length) {
      x += blockPara(textRun('Что уже хорошо', { b: true, sz: 28 }), { before: 200, after: 100 });
      report.strengths.forEach(function (s) {
        x += blockPara(textRun('• ' + s, null), { after: 40, indent: 360 });
      });
    }

    x += line('Отчёт сформирован локальным AI-детектором. Ни один детектор не является доказательством авторства — ' +
      'используйте пометки как рабочий инструмент редактуры.', { i: true, sz: 20 }, { before: 240 });
    return x;
  }

  /* ==================================================================
   *  7. Точка входа
   * ================================================================== */

  function countKinds(marks) {
    var c = { ai: 0, starter: 0, bur: 0, human: 0 };
    marks.forEach(function (m) { if (c[m.kind] !== undefined) c[m.kind]++; });
    return c;
  }

  function blocksFor(report, counts, options, opts) {
    return {
      head: options.legend === false ? '' : legendBlock(counts, report, options),
      tail: options.appendix ? reportBlock(report, opts) : ''
    };
  }

  function finish(zip, stats) {
    return zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME, compression: 'DEFLATE' })
      .then(function (blob) { return { blob: blob, stats: stats }; });
  }

  function buildGenerated(opts, options, marks, counts, mode) {
    var src = opts.source;
    var rich = (src && src.kind === 'rich' && src.rich && src.rich.text === opts.text)
      ? src.rich : richFromPlain(opts.text);
    var comments = prepareComments(marks, options);
    var zip = buildFromRich(rich, marks, 0, blocksFor(opts.report, counts, options, opts));
    zip.file('word/comments.xml', commentsXml(comments, 0, null));
    return finish(zip, { mode: mode, marks: marks.length, comments: comments.length, counts: counts });
  }

  /*
   * opts = {
   *   text, report, generatedAt,
   *   source: { kind:'docx', buffer, text } | { kind:'rich', rich } | null,
   *   options: { comments:true, human:true, appendix:true }
   * }
   */
  function build(opts) {
    var options = { comments: true, human: true, appendix: true, legend: true };
    Object.keys(opts.options || {}).forEach(function (k) { options[k] = opts.options[k]; });

    var marks = root.Report.buildMarks(opts.report, { human: options.human });
    var counts = countKinds(marks);
    var src = opts.source;
    var canUseOriginal = src && src.kind === 'docx' && src.buffer && src.text === opts.text;
    if (!canUseOriginal) return buildGenerated(opts, options, marks, counts, 'generated');

    return extract(src.buffer).then(function (parsed) {
      if (parsed.text !== opts.text) throw new Error('текст в поле отличается от исходного файла');
      return JSZip.loadAsync(src.buffer).then(function (zip) {
        var names = ['word/comments.xml', 'word/_rels/document.xml.rels', '[Content_Types].xml'];
        return Promise.all(names.map(function (f) {
          return zip.file(f) ? zip.file(f).async('string') : Promise.resolve(null);
        })).then(function (parts) {
          var existing = { comments: parts[0], rels: parts[1], contentTypes: parts[2] };
          var base = maxCommentId(existing.comments) + 1;
          var comments = prepareComments(marks, options);
          annotateOriginal(zip, parsed.xml, parsed.map, marks, base,
            blocksFor(opts.report, counts, options, opts));
          ensureCommentsPart(zip, comments, existing, base);
          return finish(zip, { mode: 'original', marks: marks.length, comments: comments.length, counts: counts });
        });
      });
    }).catch(function (err) {
      if (root.console) root.console.warn('Разметка оригинального DOCX не удалась, собираю файл заново:', err);
      return buildGenerated(opts, options, marks, counts, 'rebuilt');
    });
  }

  root.DocxExport = {
    extract: extract,
    build: build,
    richFromHtml: richFromHtml,
    richFromDom: richFromDom,
    richFromPlain: richFromPlain,
    HIGHLIGHT: HIGHLIGHT
  };
})(typeof self !== 'undefined' ? self : this);
