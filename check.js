#!/usr/bin/env node
/*
  check.js — прогон текста кейса/статьи через движок AI-детектора.

  node check.js файл.docx            строгий профиль (по умолчанию)
  node check.js файл.docx balanced   другой профиль
  node check.js файл.docx strict json > отчёт.json

  Из .docx берётся только публикуемый текст. Служебное отбрасывается:
  абзацы целиком курсивом (служебные строки, alt, пометки дизайнеру, анкоры),
  а также строки, начинающиеся с alt:/Дизайнеру:/Анкор/Title/Description/URL.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Движок ищем сначала рядом со скриптом (check.js лежит в корне репозитория),
// потом в подпапке AI-detector, потом по переменной окружения.
function findEngine() {
  const tries = [
    process.env.AI_DETECTOR_DIR,
    __dirname,
    path.join(__dirname, 'AI-detector'),
    path.join(process.cwd(), 'AI-detector'),
    process.cwd()
  ].filter(Boolean);
  for (const dir of tries) {
    if (fs.existsSync(path.join(dir, 'js', 'kb.js'))) return dir;
  }
  console.error('Не нашёл движок детектора (js/kb.js). Положите check.js в корень\n' +
                'репозитория AI-detector или задайте AI_DETECTOR_DIR=/путь/к/AI-detector');
  process.exit(1);
}

const ENGINE = findEngine();
const kb = require(path.join(ENGINE, 'js', 'kb.js'));
const det = require(path.join(ENGINE, 'js', 'detector.js'));

const SERVICE_RE = /^(alt:|Дизайнеру:|Анкор|Ссылка|Схема-пример|Запасные|Title|Description|URL|Лид —|Цветовая легенда|Перед прогоном|—\s)/i;

function fromDocx(file) {
  // Разбираем document.xml напрямую: нужен признак курсива, pandoc его теряет.
  const tmp = fs.mkdtempSync('/tmp/docx-');
  execFileSync('unzip', ['-oq', file, 'word/document.xml', '-d', tmp]);
  const xml = fs.readFileSync(path.join(tmp, 'word/document.xml'), 'utf8');
  const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const out = [];

  for (const p of paras) {
    const runs = p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || [];
    let text = '';
    let total = 0;
    let italic = 0;

    for (const r of runs) {
      const t = (r.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
        .map(x => x.replace(/<[^>]+>/g, ''))
        .join('');
      if (!t.trim()) continue;
      text += t;
      total++;
      // <w:i w:val="0"/> — это явно выключенный курсив, а не курсив: Word и
      // генераторы документов пишут его в обычный текст, и раньше такие абзацы
      // целиком улетали в служебные.
      if (/<w:i\/>|<w:i\s(?![^>]*w:val="(?:0|false|off)")/.test(r)) italic++;
    }

    text = text
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .trim();

    if (!text) continue;
    if (total && italic === total) continue;   // абзац целиком курсивом = служебный
    if (SERVICE_RE.test(text)) continue;
    out.push(text);
  }
  return out.join('\n\n');
}

const file = process.argv[2];
const profile = process.argv[3] || 'strict';
const asJson = process.argv[4] === 'json';

if (!file) {
  console.log('Использование: node check.js файл.docx [strict|balanced|soft] [json]');
  process.exit(1);
}

const text = file.toLowerCase().endsWith('.docx')
  ? fromDocx(file)
  : fs.readFileSync(file, 'utf8');

const r = det.analyze(text, kb, { profile });

/* Смысловые повторы — те же, что в браузере: модель rubert-tiny2 лежит в
   model/ и грузится за полсекунды. Нет файла модели — раздел пропускаем. */
function semanticRepeats(text) {
  const MODEL = path.join(ENGINE, 'model', 'rubert-tiny2.js');
  if (!fs.existsSync(MODEL)) return Promise.resolve(null);
  global.self = global;
  require(MODEL);
  require(path.join(ENGINE, 'js', 'wordpiece.js'));
  require(path.join(ENGINE, 'js', 'bert.js'));
  const Semantic = require(path.join(ENGINE, 'js', 'semantic.js'));
  return Semantic.findRepeats(det.splitSentences(text)).catch(() => null);
}

semanticRepeats(text).then(reps => { r.semantic_repeats = reps; main(); });

function main() {
if (asJson) {
  // без process.exit: в трубу stdout пишется асинхронно, и выход обрезал бы JSON
  console.log(JSON.stringify({ file: path.basename(file), profile, result: r, text }, null, 1));
  return;
}

const bar = n => '█'.repeat(Math.round(n / 5)).padEnd(20, '·');

const VER = require(path.join(ENGINE, 'js', 'version.js'));
console.log(`\n${VER.full}`);
console.log(`Файл: ${path.basename(file)}   профиль: ${profile}`);
console.log(`Слов в публикуемом тексте: ${det.countWords(text)}\n`);
console.log(`Балл ИИ: ${r.overall.aiScore}/100 — ${r.overall.verdict}`);
console.log(`Уверенность: ${r.overall.confidence}\n`);

console.log('МЕТРИКИ  (сырой сигнал → относительно нормы делового текста)');
for (const m of r.metrics) {
  const mark = m.status === 'bad' ? '✗' : m.status === 'warn' ? '~' : '✓';
  const rel = m.relative === undefined ? m.signal : m.relative;
  const norm = m.neutral === undefined ? '' : `  норма ~${m.neutral}`;
  console.log(`  ${mark} ${String(m.signal).padStart(3)} → ${String(rel).padStart(3)}  ${bar(rel)}  ${m.title}${norm}`);
  if (m.detail) console.log(`         ${m.detail}`);
}

/* Предложения — главное, по чему правится текст: детектор называет
   конкретную фразу и причину, а не только метрику по всему документу. */
const flagged = (r.heat || []).filter(h => h.level === 'AI' || h.level === 'LIKELY_AI');
if (flagged.length) {
  console.log(`\nПРЕДЛОЖЕНИЯ, КОТОРЫЕ НАДО ПЕРЕПИСАТЬ (${flagged.length})`);
  flagged.sort((a, b) => b.score - a.score).slice(0, 30).forEach((h, i) => {
    const why = h.reasons.filter(x => !x.editorial && x.code !== 'ok').map(x => x.title.toLowerCase());
    console.log(`  ${String(i + 1).padStart(2)}. [${String(h.score).padStart(2)}/100] ${h.preview.replace(/\s+/g, ' ').slice(0, 96)}`);
    console.log(`      ${why.join(', ')}`);
  });
} else {
  console.log('\nПРЕДЛОЖЕНИЯ: машинных предложений не найдено.');
}

const notes = (r.heat || []).filter(h => (h.reasons || []).some(x => x.editorial));
if (notes.length) {
  console.log(`\nЗАМЕТКИ РЕДАКТОРУ (${notes.length}) — на ИИ не указывают, но стоит посмотреть`);
  notes.slice(0, 10).forEach(h => {
    const t = h.reasons.filter(x => x.editorial).map(x => x.title.toLowerCase()).join(', ');
    console.log(`  • ${t}: ${h.preview.replace(/\s+/g, ' ').slice(0, 88)}`);
  });
}

console.log('\nСЕГМЕНТЫ');
for (const [k, v] of Object.entries(r.distribution)) console.log(`  ${k}: ${v}`);

if (r.hits.length) {
  console.log(`\nШТАМПЫ (${r.hits.length})`);
  for (const h of r.hits.slice(0, 25)) {
    console.log(`  «${h.phrase}»${h.replacement ? '  →  ' + h.replacement : ''}`);
  }
}
if (r.starterHits.length) {
  console.log(`\nШАБЛОННЫЕ НАЧАЛА (${r.starterHits.length})`);
  console.log('  ' + [...new Set(r.starterHits.map(h => h.phrase))].join(', '));
}
if (r.burHits.length) {
  console.log(`\nКАНЦЕЛЯРИТ (${r.burHits.length})`);
  console.log('  ' + [...new Set(r.burHits.map(h => h.phrase))].join(', '));
}
if (r.humanHits.length) {
  console.log(`\nЖИВЫЕ МАРКЕРЫ (${r.humanHits.length})`);
  console.log('  ' + [...new Set(r.humanHits.map(h => h.phrase))].join(', '));
}
if (r.recommendations.length) {
  console.log('\nРЕКОМЕНДАЦИИ');
  r.recommendations.forEach((x, i) => {
    console.log(`  ${i + 1}. [${x.priority || '-'}] ${x.title || x}`);
    if (x.detail) console.log(`     ${x.detail}`);
  });
}
if (r.strengths.length) {
  console.log('\nСИЛЬНЫЕ СТОРОНЫ');
  r.strengths.forEach(x => console.log(`  + ${x.title || x.text || x}`));
}
const reps = r.semantic_repeats;
if (reps === null) {
  console.log('\nСМЫСЛОВЫЕ ПОВТОРЫ: не проверялись — нет файла модели model/rubert-tiny2.js');
} else if (!reps.length) {
  console.log('\nСМЫСЛОВЫЕ ПОВТОРЫ: не найдено.');
} else {
  console.log(`\nСМЫСЛОВЫЕ ПОВТОРЫ (${reps.length}) — одна мысль сказана дважды; на ИИ не указывает, но текст раздувает`);
  const cut = t => t.replace(/\s+/g, ' ').slice(0, 90);
  reps.slice(0, 12).forEach((p, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. [${p.level === 'strong' ? 'почти одно и то же' : 'стоит посмотреть'}, ${p.score}]`);
    console.log(`      «${cut(p.a.text)}»`);
    console.log(`      «${cut(p.b.text)}»`);
  });
}
console.log('');
}
