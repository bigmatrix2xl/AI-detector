#!/usr/bin/env node
/*
 * Сборка detector.bundle.js — весь детектор одним файлом, без зависимостей
 * и без установки. Нужен там, где нельзя клонировать репозиторий: приложить
 * файл к чату, положить рядом с документом, запустить одной командой.
 *
 * Исходники внутри обёрнуты так, что их UMD-заголовки видят подставной
 * self (ns) и module === undefined, поэтому всё складывается в ns, а не
 * в глобальную область и не в exports.
 *
 * Запуск: node tools/build-bundle.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const head = `/* AI Детектор — сборка одним файлом. Собрано tools/build-bundle.js;
 * править надо исходники в js/, а не этот файл.
 *
 * Командная строка:  node detector.bundle.js файл.docx strict
 * Как модуль в Node: const D = require('./detector.bundle.js');
 *                    D.checkText(текст).summary
 *                    D.checkDocx(буфер).then(r => r.summary)
 * В браузере:        <script src="detector.bundle.js"></script> -> AIDetectorBundle
 *
 * Всё считается на месте: ни сети, ни установки, ни внешних библиотек.
 */
(function (globalRoot, realModule) {
  'use strict';
  var ns = {};
  (function (self, module, window, global, exports, define) {
`;

const tail = `
  })(ns, undefined, ns, ns, undefined, undefined);

`;

const foot = `
  if (realModule && realModule.exports) realModule.exports = API;
  if (globalRoot) globalRoot.AIDetectorBundle = API;
  if (realModule && typeof require === 'function' && require.main === realModule) {
    API.cli(process.argv, require('fs'));
  }
})(typeof globalThis !== 'undefined' ? globalThis : this,
   typeof module === 'object' ? module : null);
`;

const out = head +
  read('libs/jszip.min.js') + '\n' +
  read('js/version.js') + '\n' +
  read('js/kb.js') + '\n' +
  read('js/sentences.js') + '\n' +
  read('js/detector.js') + '\n' +
  tail +
  fs.readFileSync(path.join(__dirname, 'bundle-api.js'), 'utf8') +
  foot;

fs.writeFileSync(path.join(ROOT, 'detector.bundle.js'), out);
console.log('detector.bundle.js: %s КБ', (out.length / 1024).toFixed(0));
