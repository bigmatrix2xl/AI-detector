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

const ENGINE = process.env.AI_DETECTOR_DIR || path.join(__dirname, 'AI-detector');
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
      if (/<w:i\/>|<w:i\s/.test(r)) italic++;
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

if (asJson) {
  console.log(JSON.stringify({ file: path.basename(file), profile, result: r, text }, null, 1));
  process.exit(0);
}

const bar = n => '█'.repeat(Math.round(n / 5)).padEnd(20, '·');

console.log(`\nФайл: ${path.basename(file)}   профиль: ${profile}`);
console.log(`Слов в публикуемом тексте: ${det.countWords(text)}\n`);
console.log(`AI-сигнал: ${r.overall.aiScore}/100 — ${r.overall.verdict}`);
console.log(`Уверенность: ${r.overall.confidence}\n`);

console.log('МЕТРИКИ');
for (const m of r.metrics) {
  const mark = m.status === 'bad' ? '✗' : m.status === 'warn' ? '~' : '✓';
  console.log(`  ${mark} ${String(m.signal).padStart(3)}  ${bar(m.signal)}  ${m.title}`);
  if (m.detail) console.log(`         ${m.detail}`);
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
console.log('');
