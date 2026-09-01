/* Самотест экспорта в Word: node test/docxtest.js
 *
 * Проверяем два сценария:
 *  A. Текст без исходного файла — DOCX собирается с нуля.
 *  B. Загружен DOCX — правится оригинал (текст при этом не должен измениться
 *     ни на символ, а подсветка должна лечь ровно на найденные фразы).
 */
'use strict';
global.self = global;

const path = require('path');
const JSZip = require(path.join(__dirname, '..', 'libs', 'jszip.min.js'));
global.JSZip = JSZip;

require(path.join(__dirname, '..', 'js', 'kb.js'));
require(path.join(__dirname, '..', 'js', 'detector.js'));
require(path.join(__dirname, '..', 'js', 'report.js'));
require(path.join(__dirname, '..', 'js', 'docx.js'));

const TEXT = `В современном мире искусственный интеллект играет ключевую роль в развитии бизнеса. Важно отметить, что внедрение инновационных решений открывает новые горизонты для компаний любого масштаба. Давайте разберемся, почему автоматизация является неотъемлемой частью успешной стратегии.

Во-первых, комплексный подход к автоматизации позволяет существенно оптимизировать бизнес-процессы. Во-вторых, передовые технологии обеспечивают широкий спектр возможностей для масштабирования. Кроме того, интуитивно понятный интерфейс современных платформ позволяет сэкономить время и деньги.

Таким образом, цифровая трансформация — это не просто тренд, а необходимость. Стоит отметить, что компании, которые внедряют инновации, получают значительное конкурентное преимущество. Более того, индивидуальный подход к каждому клиенту становится залогом успеха в условиях стремительно развивающегося рынка.

Подводя итог, можно с уверенностью сказать: будущее за технологиями. Не упустите уникальную возможность вывести свой бизнес на новый уровень!`;

let failed = 0;
function check(name, cond, extra) {
  if (cond) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + (extra ? '\n       ' + extra : ''));
}

/* --- мини-проверка правильности вложенности XML --- */
function xmlWellFormed(xml) {
  const stack = [];
  const re = /<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[3].indexOf('?') === 0 || m[2] === 'xml') continue;
    if (m[1]) {
      if (stack.pop() !== m[2]) return 'закрывающий </' + m[2] + '> не на месте (позиция ' + m.index + ')';
    } else if (!m[4]) {
      stack.push(m[2]);
    }
  }
  return stack.length ? 'не закрыты: ' + stack.join(', ') : null;
}

function unesc(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

// тексты всех прогонов с подсветкой, в порядке документа
function highlightedRuns(xml) {
  const out = [];
  const re = /<w:r><w:rPr>(?:(?!<\/w:rPr>).)*<w:highlight w:val="([a-z]+)"\/>(?:(?!<\/w:rPr>).)*<\/w:rPr><w:t[^>]*>((?:(?!<\/w:t>)[\s\S])*)<\/w:t><\/w:r>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push({ color: m[1], text: unesc(m[2]) });
  return out;
}

// где именно размеченный текст разошёлся с исходным
function firstDiff(haystack, needle) {
  const i = Math.max(0, haystack.indexOf(needle.slice(0, 30)));
  const got = haystack.slice(i);
  for (let k = 0; k < needle.length; k++) {
    if (got[k] !== needle[k]) {
      return 'на символе ' + k + ':\n       ожидали ' + JSON.stringify(needle.slice(k, k + 60)) +
        '\n       получили ' + JSON.stringify(got.slice(k, k + 60));
    }
  }
  return 'текст обрезан';
}

async function zipOf(blob) {
  const buf = Buffer.from(await blob.arrayBuffer());
  return { buf: buf, zip: await JSZip.loadAsync(buf) };
}
const readFile = (zip, name) => (zip.file(name) ? zip.file(name).async('string') : Promise.resolve(null));

async function main() {
  const report = AIDetector.analyze(TEXT, AIDetectorKB, { profile: 'balanced' });
  const marks = Report.buildMarks(report, {});
  console.log('Найдено пометок: ' + marks.length);
  check('пометки вообще есть', marks.length > 5);
  check('пометки не пересекаются и отсортированы',
    marks.every((m, i) => i === 0 || m.start >= marks[i - 1].end));

  /* ---------- A. сборка с нуля ---------- */
  console.log('\nA. DOCX собирается с нуля (исходного файла не было)');
  const genRes = await DocxExport.build({ text: TEXT, report: report, source: null, generatedAt: new Date().toISOString() });
  const gen = await zipOf(genRes.blob);
  check('режим = generated', genRes.stats.mode === 'generated', 'режим: ' + genRes.stats.mode);

  const genDoc = await readFile(gen.zip, 'word/document.xml');
  const genComments = await readFile(gen.zip, 'word/comments.xml');
  check('есть [Content_Types].xml', !!(await readFile(gen.zip, '[Content_Types].xml')));
  check('есть _rels/.rels', !!(await readFile(gen.zip, '_rels/.rels')));
  check('есть word/styles.xml', !!(await readFile(gen.zip, 'word/styles.xml')));
  check('document.xml — корректный XML', !xmlWellFormed(genDoc), xmlWellFormed(genDoc));
  check('comments.xml — корректный XML', !xmlWellFormed(genComments), xmlWellFormed(genComments));

  // из подсветок исключаем образцы цветов в шапке-легенде
  const genHl = highlightedRuns(genDoc).filter((h) => TEXT.indexOf(h.text) !== -1);
  check('подсвечено столько же фрагментов, сколько пометок', genHl.length === marks.length,
    genHl.length + ' против ' + marks.length);
  const genTexts = genHl.map((h) => h.text);
  const missed = marks.filter((m) => genTexts.indexOf(TEXT.slice(m.start, m.end)) === -1);
  check('каждая находка подсвечена своим текстом', missed.length === 0,
    missed.slice(0, 3).map((m) => '«' + TEXT.slice(m.start, m.end) + '»').join(', '));

  const ids = (genDoc.match(/<w:commentRangeStart w:id="(\d+)"\/>/g) || []).length;
  const ends = (genDoc.match(/<w:commentRangeEnd w:id="(\d+)"\/>/g) || []).length;
  const bodies = (genComments.match(/<w:comment /g) || []).length;
  check('у каждого начала примечания есть конец', ids === ends, ids + ' / ' + ends);
  check('число примечаний совпадает с якорями', bodies === ids && bodies === genRes.stats.comments,
    bodies + ' / ' + ids + ' / ' + genRes.stats.comments);

  /* ---------- B. правка оригинального DOCX ---------- */
  console.log('\nB. Загружен DOCX — правим оригинал');
  // чистый docx без пометок как «файл пользователя»
  const cleanRes = await DocxExport.build({
    text: TEXT, report: report, source: null,
    options: { comments: false, human: false, appendix: false, legend: false }
  });
  const clean = await zipOf(cleanRes.blob);

  const parsed = await DocxExport.extract(clean.buf);
  check('текст из DOCX извлекается', parsed.text.length > 500);
  check('карта смещений покрывает текст', parsed.map.pos.length === parsed.text.length);

  const rep2 = AIDetector.analyze(parsed.text, AIDetectorKB, { profile: 'balanced' });
  const marks2 = Report.buildMarks(rep2, {});
  const annRes = await DocxExport.build({
    text: parsed.text, report: rep2,
    source: { kind: 'docx', buffer: clean.buf, text: parsed.text },
    generatedAt: new Date().toISOString()
  });
  check('режим = original (правим исходный файл)', annRes.stats.mode === 'original', 'режим: ' + annRes.stats.mode);

  const ann = await zipOf(annRes.blob);
  const annDoc = await readFile(ann.zip, 'word/document.xml');
  check('размеченный document.xml — корректный XML', !xmlWellFormed(annDoc), xmlWellFormed(annDoc));

  // ГЛАВНЫЙ ИНВАРИАНТ: разметка не меняет сам текст
  const back = await DocxExport.extract(ann.buf);
  const at = back.text.indexOf(parsed.text);
  check('текст документа не изменился ни на символ', at !== -1,
    at === -1 ? firstDiff(back.text, parsed.text) : '');

  const annHl = highlightedRuns(annDoc).filter((h) => parsed.text.indexOf(h.text) !== -1);
  const missed2 = marks2.filter((m) => annHl.map((h) => h.text).indexOf(parsed.text.slice(m.start, m.end)) === -1);
  check('подсветка легла на найденные фразы', missed2.length === 0,
    missed2.slice(0, 3).map((m) => '«' + parsed.text.slice(m.start, m.end) + '»').join(', '));

  const annRels = await readFile(ann.zip, 'word/_rels/document.xml.rels');
  const annCt = await readFile(ann.zip, '[Content_Types].xml');
  check('связь с comments.xml прописана', /Target="comments\.xml"/.test(annRels));
  check('тип содержимого comments.xml прописан', annCt.indexOf('/word/comments.xml') !== -1);
  check('примечания не задвоились', (annRels.match(/Target="comments\.xml"/g) || []).length === 1);

  /* ---------- C. живые маркеры ---------- */
  console.log('\nC. Живой текст: зелёная подсветка без примечаний');
  const HUMAN = 'Мы внедряли CRM три месяца вместо обещанных двух недель. Расскажу, где мы облажались.\n\n' +
    'Первая ошибка — понадеялись на «коробку». Вендор клялся, что интеграция с 1С заведётся за день. ' +
    'Ага, конечно. В итоге наш бухгалтер Лена неделю вручную сверяла счета, а я по вечерам читал форумы. ' +
    'Нашли костыль: выгрузка через CSV раз в час. Некрасиво? Да. Работает? Уже полгода.\n\n' +
    'Кстати, продажи не упали. Помогла банальная вещь: убрали 14 обязательных полей, оставили 4.';
  const repH = AIDetector.analyze(HUMAN, AIDetectorKB, { profile: 'balanced' });
  const marksH = Report.buildMarks(repH, {});
  const resH = await DocxExport.build({ text: HUMAN, report: repH, source: null });
  const docH = await readFile((await zipOf(resH.blob)).zip, 'word/document.xml');
  const hlH = highlightedRuns(docH).filter((h) => HUMAN.indexOf(h.text) !== -1);
  check('живые маркеры подсвечены зелёным', hlH.some((h) => h.color === 'green'),
    'цвета: ' + hlH.map((h) => h.color).join(','));
  check('примечаний не больше, чем проблемных находок',
    resH.stats.comments <= marksH.filter((m) => m.kind !== 'human').length,
    resH.stats.comments + ' примечаний на ' + marksH.filter((m) => m.kind !== 'human').length + ' находок');
  check('к живым маркерам примечаний нет',
    (docH.match(/<w:commentRangeStart/g) || []).length === resH.stats.comments);

  /* ---------- D. структура из текста ---------- */
  console.log('\nD. Восстановление структуры из текста');
  const rich = DocxExport.richFromPlain('# Заголовок\n\nАбзац с **жирным** словом.\n- пункт один\n- пункт два');
  check('заголовок распознан', rich.paragraphs[0].kind === 'h1');
  check('список распознан', rich.paragraphs.filter((p) => p.kind === 'li').length === 2);
  check('жирный распознан', rich.paragraphs[1].runs.some((r) => r.b));
  check('смещения указывают на исходный текст',
    rich.text.slice(rich.paragraphs[0].runs[0].start, rich.paragraphs[0].runs[0].end) === 'Заголовок');

  /* ---------- E. вставка из Word / Google Docs (HTML из буфера) ---------- */
  console.log('\nE. Разбор HTML из буфера обмена');
  const t = (v) => ({ nodeType: 3, nodeValue: v });
  const e = (tag, attrs, kids) => {
    const n = { nodeType: 1, tagName: tag, _a: attrs || {} };
    n.getAttribute = (k) => (k in n._a ? n._a[k] : null);
    (kids || []).forEach((k, i) => { k.nextSibling = (kids[i + 1] || null); });
    n.firstChild = (kids || [])[0] || null;
    return n;
  };
  // так вставку заворачивает Google Docs: внешний <b> с font-weight:normal
  const body = e('BODY', {}, [
    e('B', { style: 'font-weight:normal' }, [
      e('P', {}, [t('Обычный '), e('SPAN', { style: 'font-weight:700' }, [t('жирный')]), t(' текст')]),
      e('H2', {}, [t('Подзаголовок')]),
      e('UL', {}, [e('LI', {}, [t('пункт списка')])])
    ])
  ]);
  const richH = DocxExport.richFromDom(body);
  check('текст собран верно', richH.text === 'Обычный жирный текст\nПодзаголовок\nпункт списка',
    JSON.stringify(richH.text));
  check('обёртка Google Docs не сделала всё жирным',
    richH.paragraphs[0].runs.filter((r) => r.b).length === 1 &&
    richH.text.slice(richH.paragraphs[0].runs.find((r) => r.b).start,
                     richH.paragraphs[0].runs.find((r) => r.b).end) === 'жирный');
  check('заголовок и список распознаны',
    richH.paragraphs[1].kind === 'h2' && richH.paragraphs[2].kind === 'li',
    richH.paragraphs.map((p) => p.kind).join(','));

  console.log(failed ? '\n' + failed + ' проверок провалено' : '\nВсе проверки пройдены');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
