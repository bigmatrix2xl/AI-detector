#!/usr/bin/env node
/*
 * Упаковка rubert-tiny2 в файл, который не стыдно положить в репозиторий.
 *
 * Исходные веса — 109 МБ float32, из них 105 МБ занимает таблица эмбеддингов
 * на 83 828 токенов. Делаем две вещи:
 *
 *  1. Режем словарь. Оставляем служебные токены, все подслова (##…) и все
 *     одиночные символы. Этого достаточно, чтобы ЛЮБОЕ русское слово
 *     разложилось без [UNK] — проверено, все буквы есть и как начало слова,
 *     и как продолжение. Сверх того добавляем частые целые слова: с ними
 *     эмбеддинг ближе к исходному, потому что слово не дробится.
 *
 *  2. Квантуем в int8 с отдельным множителем на строку. Расхождение с float32
 *     на косинусах — в третьем знаке.
 *
 * Запуск:
 *   node tools/pack-model.js <weights.f32.bin> <manifest.json> <vocab.json> [частотный.txt] <выходная папка>
 *
 * На выходе: model.bin (веса) и model.json (раскладка + урезанный словарь).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('нужно: <weights.bin> <manifest.json> <vocab.json> [freq.txt] <outdir>');
  process.exit(1);
}
const outDir = args[args.length - 1];
const [binPath, manPath, vocabPath] = args;
const freqPath = args.length >= 5 ? args[3] : null;

const src = new Float32Array(fs.readFileSync(binPath).buffer);
const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

const H = 312, MAXPOS = 512;

/* ---------- 1. какие токены оставляем ---------- */
const keep = new Set();
['[PAD]', '[UNK]', '[CLS]', '[SEP]', '[MASK]'].forEach((t) => keep.add(t));
for (const t of Object.keys(vocab)) {
  if (t.startsWith('##')) { keep.add(t); continue; }          // подслова — все
  if ([...t].length === 1) { keep.add(t); continue; }         // одиночные символы — все
}
if (freqPath && fs.existsSync(freqPath)) {
  const extra = fs.readFileSync(freqPath, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  for (const t of extra) if (t in vocab) keep.add(t);
}

// стабильный порядок: по исходному id, чтобы упаковка была воспроизводимой
const kept = [...keep].filter((t) => t in vocab).sort((a, b) => vocab[a] - vocab[b]);
const newVocab = {};
kept.forEach((t, i) => { newVocab[t] = i; });
// [UNK] обязан существовать: на него уходит всё, чего не нашлось
if (!('[UNK]' in newVocab)) throw new Error('в словаре нет [UNK]');

console.log('словарь: ' + Object.keys(vocab).length + ' → ' + kept.length + ' токенов');

/* ---------- 2. упаковка ---------- */
const TRANSPOSE_SKIP = {};       // транспонирование делает bert.js при загрузке
const out = { dim: H, layers: 3, maxPos: MAXPOS, tensors: {}, vocab: newVocab };
const chunks = [];
let offset = 0;

function pushInt8(name, floats, rows, cols) {
  const q = new Int8Array(rows * cols);
  const scales = new Float32Array(rows);
  for (let r = 0; r < rows; r++) {
    let mx = 0;
    for (let c = 0; c < cols; c++) { const v = Math.abs(floats[r * cols + c]); if (v > mx) mx = v; }
    const s = mx / 127 || 1e-8;
    scales[r] = s;
    const inv = 1 / s;
    for (let c = 0; c < cols; c++) {
      let v = Math.round(floats[r * cols + c] * inv);
      q[r * cols + c] = v > 127 ? 127 : v < -127 ? -127 : v;
    }
  }
  out.tensors[name] = { shape: [rows, cols], dtype: 'int8', offset: offset, scales: offset + q.length };
  chunks.push(Buffer.from(q.buffer, q.byteOffset, q.length));
  chunks.push(Buffer.from(scales.buffer, scales.byteOffset, scales.byteLength));
  offset += q.length + scales.byteLength;
}

function pushF32(name, floats) {
  const f = Float32Array.from(floats);
  // выравнивание на 4 байта уже есть, но держим кратность 16 для v128
  while (offset % 16) { chunks.push(Buffer.alloc(1)); offset++; }
  out.tensors[name] = { shape: [f.length], dtype: 'f32', offset: offset };
  chunks.push(Buffer.from(f.buffer, f.byteOffset, f.byteLength));
  offset += f.byteLength;
}

function slice(name) {
  const m = man[name];
  return src.subarray(m.offset / 4, m.offset / 4 + m.count);
}

// таблица эмбеддингов — только оставленные строки
const we = slice('embeddings.word');
const pruned = new Float32Array(kept.length * H);
kept.forEach((t, i) => {
  const from = vocab[t] * H;
  for (let d = 0; d < H; d++) pruned[i * H + d] = we[from + d];
});
pushInt8('embeddings.word', pruned, kept.length, H);

const pe = slice('embeddings.pos');
pushInt8('embeddings.pos', pe.subarray(0, MAXPOS * H), MAXPOS, H);
pushF32('embeddings.type', slice('embeddings.type'));
pushF32('embeddings.ln.w', slice('embeddings.ln.w'));
pushF32('embeddings.ln.b', slice('embeddings.ln.b'));

for (let L = 0; L < 3; L++) {
  for (const nm of ['q', 'k', 'v', 'ao', 'fi', 'fo']) {
    const key = `l${L}.${nm}.w`, sh = man[key].shape;
    pushInt8(key, slice(key), sh[0], sh[1]);
    pushF32(`l${L}.${nm}.b`, slice(`l${L}.${nm}.b`));
  }
  for (const nm of ['ln1', 'ln2']) {
    pushF32(`l${L}.${nm}.w`, slice(`l${L}.${nm}.w`));
    pushF32(`l${L}.${nm}.b`, slice(`l${L}.${nm}.b`));
  }
}

fs.mkdirSync(outDir, { recursive: true });
const blob = Buffer.concat(chunks);
fs.writeFileSync(path.join(outDir, 'model.bin'), blob);
fs.writeFileSync(path.join(outDir, 'model.json'), JSON.stringify(out));
console.log('model.bin:  %s МБ', (blob.length / 1048576).toFixed(2));
console.log('model.json: %s МБ (раскладка + словарь)',
  (fs.statSync(path.join(outDir, 'model.json')).size / 1048576).toFixed(2));
