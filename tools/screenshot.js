#!/usr/bin/env node
/*
  Проверка интерфейса глазами: открывает index.html в безголовом Chrome,
  вставляет текст, жмёт «Проверить», ждёт смысловые повторы и снимает
  скриншоты отчёта в светлой и тёмной теме.

  node tools/screenshot.js текст.txt [папка-для-снимков]

  Нужен Google Chrome в /Applications и Node 22+ (встроенный WebSocket).
*/
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const textFile = process.argv[2];
const outDir = process.argv[3] || '.';
if (!textFile) { console.log('node tools/screenshot.js текст.txt [папка]'); process.exit(1); }
const TEXT = fs.readFileSync(textFile, 'utf8');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// маленький статический сервер: fetch на file:// браузер блокирует
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);

(async () => {
  const port = server.address().port;
  const profile = fs.mkdtempSync('/tmp/aidet-chrome-');
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--window-size=1600,1000', '--no-first-run', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise(r => chrome.stderr.on('data', d => {
    const m = String(d).match(/ws:\/\/\S+/); if (m) r(m[0]);
  }));
  const targets = await (await fetch(wsUrl.replace('ws://', 'http://').replace(/\/devtools.*/, '/json'))).json();
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const wait = {};
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.result.value;

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +(process.env.W || 1600), height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
  await sleep(1500);
  await evaluate(`(function(){var t=document.querySelector('#input-text');t.value=${JSON.stringify(TEXT)};t.dispatchEvent(new Event('input'));document.querySelector('#check-btn').click();})()`);
  // ждём, пока досчитаются смысловые повторы
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    if (await evaluate(`!document.querySelector('#sem-status')`)) break;
  }
  await sleep(500);
  for (const theme of ['light', 'dark']) {
    await evaluate(`document.documentElement.setAttribute('data-theme','${theme}')`);
    for (const [name, sel] of [['hl', '.b-hl'], ['report', 'body']]) {
      const box = await evaluate(`(function(){var n=document.querySelector('${sel}');if(!n)return null;n.scrollIntoView();var r=n.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:Math.min(r.height,${name === 'hl' ? 1000 : 4200})};})()`);
      if (!box) continue;
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
        clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 } });
      const f = path.join(outDir, `${name}-${theme}.png`);
      fs.writeFileSync(f, Buffer.from(shot.result.data, 'base64'));
      console.log(f);
    }
  }
  ws.close(); chrome.kill(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
