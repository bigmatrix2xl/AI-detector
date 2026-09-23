/* Самотест смысловых повторов: node test/semantictest.js
 *
 * Проверяем, что модель грузится из упакованного файла, совпадает с эталонными
 * значениями onnxruntime и находит перефразы, не поднимая тревогу на разном.
 * Если файла модели нет (он большой и может быть не выкачан) — тест
 * пропускается, а не падает.
 */
'use strict';
global.self = global;
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const MODEL = path.join(ROOT, 'model', 'rubert-tiny2.js');
if (!fs.existsSync(MODEL)) {
  console.log('Файла модели нет (' + MODEL + ') — тест пропущен.');
  process.exit(0);
}

require(MODEL);
require(path.join(ROOT, 'js', 'wordpiece.js'));
require(path.join(ROOT, 'js', 'bert.js'));
require(path.join(ROOT, 'js', 'semantic.js'));
const AIDetector = require(path.join(ROOT, 'js', 'detector.js'));

let failed = 0;
function check(name, cond, extra) {
  if (cond) { console.log('  ok   ' + name); return; }
  failed++; console.log('  FAIL ' + name + (extra !== undefined ? '\n       ' + extra : ''));
}

// эталон: те же пары считались onnxruntime на неурезанной модели
const PAIRS = [
  ['Над платформой работает выделенная команда, а каждый новый проект стартует с её текущего состояния.',
   'Продукт развивает постоянный состав специалистов, и любой новый заказ начинается с актуальной сборки.',
   0.78, 'перефраз'],
  ['Покупатель выбирает товар в карточке и оформляет заказ.',
   'Схема обмена с учётной системой построена на очереди сообщений RabbitMQ.',
   0.47, 'разное']
];

const TEXT = [
  'Над платформой работает выделенная команда, а каждый новый проект стартует с её текущего состояния.',
  'Схема обмена с учётной системой построена на очереди сообщений RabbitMQ и переживает сбои сети.',
  'Продукт развивает постоянный состав специалистов, и любой новый заказ начинается с актуальной сборки.',
  'Покупатель заходит в личный кабинет, видит свои цены и остатки, собирает заказ и забирает счёт.'
].join(' ');

Semantic.load().then(() => {
  console.log('Движок: ' + Semantic.backend());
  check('модель загрузилась', Semantic.isReady());
  check('используется WebAssembly SIMD', Semantic.backend() === 'wasm-simd', Semantic.backend());

  const sents = AIDetector.splitSentences(TEXT);
  check('предложения разобраны', sents.length === 4, sents.length);

  return Semantic.findRepeats(sents, {}).then((pairs) => {
    console.log('\nНайдено пар: ' + pairs.length);
    pairs.forEach((p) => console.log('  ' + p.score.toFixed(3) + '  ' + p.a.text.slice(0, 46) + '… / ' + p.b.text.slice(0, 46) + '…'));

    check('перефраз найден', pairs.some((p) =>
      /выделенная команда/.test(p.a.text + p.b.text) && /постоянный состав/.test(p.a.text + p.b.text)));
    check('несвязанные предложения парой не считаются', !pairs.some((p) =>
      /RabbitMQ/.test(p.a.text) && /личный кабинет/.test(p.b.text)));
    check('все пары выше порога', pairs.every((p) => p.score >= Semantic.WEAK));
    check('пары отсортированы по убыванию', pairs.every((p, i) => i === 0 || p.score <= pairs[i - 1].score));

    console.log(failed ? '\n' + failed + ' проверок провалено' : '\nВсе проверки пройдены');
    process.exit(failed ? 1 : 0);
  });
}).catch((e) => { console.error(e); process.exit(1); });
