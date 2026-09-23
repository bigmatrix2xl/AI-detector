/*
 * Инференс rubert-tiny2 на чистом JavaScript + крошечный WebAssembly.
 *
 * Ни onnxruntime, ни WebGPU, ни сборки: обычный скрипт, который работает
 * в браузере (в том числе при открытии index.html двойным кликом), в Node
 * и офлайн. WebAssembly встроен сюда же строкой base64 — отдельный .wasm-файл
 * не грузится, поэтому протокол file:// ничего не ломает.
 *
 * Почему так можно: модель крошечная — три слоя, 312 измерений, 12 голов,
 * внутренний слой 600. Весь трансформер 2.3 млн параметров.
 *
 * Считаем усреднённый по токенам эмбеддинг предложения: 312 чисел,
 * нормированных. Косинус между ними — мера смысловой близости: перефраз
 * одной мысли даёт около 0.77, несвязанные предложения — около 0.44.
 * Совпадает с onnxruntime до третьего знака.
 *
 * Быстрая часть — умножение матриц: 801 байт WebAssembly с f32x4. Если SIMD
 * недоступен, тот же расчёт идёт на JS, только медленнее.
 *
 * API:
 *   Bert.load(weightsBuffer, manifest) -> model
 *   model.embedAll([ids, ...], onProgress) -> [Float32Array(312), ...]
 *   model.embed(ids) -> Float32Array(312)
 *   Bert.cosine(a, b)
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.Bert = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var H = 312, HEADS = 12, HD = H / HEADS, FF = 600, LAYERS = 3, EPS = 1e-12;
  var MAX_BATCH_TOKENS = 1024;   // сколько токенов считаем за один проход

  // matmul.wat, собран wabt: y[T,N] = x[T,M] @ wT[N,M]^T + b[N] на f32x4
  var WASM_B64 =
    'AGFzbQEAAAABCwFgB39/f39/f38AAwIBAAUGAQEBgIAEBxECA21lbQIAB21hdG11bFQAAArqBQHnBQMPfwV7AX0gAkECdCEKIARB' +
    'AnQhC0EAIQcCQANAIAdBBGogAUoNASAAIAcgCmxqIQwgDCAKaiENIA0gCmohDiAOIApqIQ8gBiAHIAtsaiEQIBAgC2ohESARIAtq' +
    'IRIgEiALaiETQQAhCCADIRQCQANAIAggBE4NAf0MAAAAAAAAAAAAAAAAAAAAACEW/QwAAAAAAAAAAAAAAAAAAAAAIRf9DAAAAAAA' +
    'AAAAAAAAAAAAAAAhGP0MAAAAAAAAAAAAAAAAAAAAACEZQQAhCQJAA0AgCSAKTg0BIBQgCWohFSAV/QAEACEaIBYgDCAJav0ABAAg' +
    'Gv3mAf3kASEWIBcgDSAJav0ABAAgGv3mAf3kASEXIBggDiAJav0ABAAgGv3mAf3kASEYIBkgDyAJav0ABAAgGv3mAf3kASEZIAlB' +
    'EGohCQwACwtDAAAAACEbIAUEQCAFIAhBAnRqKgIAIRsLIBAgCEECdGogGyAW/R8AIBb9HwGSIBb9HwIgFv0fA5KSkjgCACARIAhB' +
    'AnRqIBsgF/0fACAX/R8BkiAX/R8CIBf9HwOSkpI4AgAgEiAIQQJ0aiAbIBj9HwAgGP0fAZIgGP0fAiAY/R8DkpKSOAIAIBMgCEEC' +
    'dGogGyAZ/R8AIBn9HwGSIBn9HwIgGf0fA5KSkjgCACAUIApqIRQgCEEBaiEIDAALCyAHQQRqIQcMAAsLAkADQCAHIAFODQEgACAH' +
    'IApsaiEMIAYgByALbGohEEEAIQggAyEUAkADQCAIIARODQH9DAAAAAAAAAAAAAAAAAAAAAAhFkEAIQkCQANAIAkgCk4NASAWIAwg' +
    'CWr9AAQAIBQgCWr9AAQA/eYB/eQBIRYgCUEQaiEJDAALC0MAAAAAIRsgBQRAIAUgCEECdGoqAgAhGwsgECAIQQJ0aiAbIBb9HwAg' +
    'Fv0fAZIgFv0fAiAW/R8DkpKSOAIAIBQgCmohFCAIQQFqIQgMAAsLIAdBAWohBwwACwsL';

  function b64ToBytes(b64) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ---------- запасной путь: то же умножение на JS ---------- */
  function matmulJS(heap, xo, T, M, wo, N, bo, yo) {
    var t = 0, i, j, wp, a0, a1, a2, a3, wv;
    for (; t + 4 <= T; t += 4) {
      var x0 = xo + t * M, x1 = x0 + M, x2 = x1 + M, x3 = x2 + M;
      var o0 = yo + t * N, o1 = o0 + N, o2 = o1 + N, o3 = o2 + N;
      for (j = 0; j < N; j++) {
        wp = wo + j * M; a0 = a1 = a2 = a3 = 0;
        for (i = 0; i < M; i++) {
          wv = heap[wp + i];
          a0 += heap[x0 + i] * wv; a1 += heap[x1 + i] * wv;
          a2 += heap[x2 + i] * wv; a3 += heap[x3 + i] * wv;
        }
        if (bo) { var bv = heap[bo + j]; a0 += bv; a1 += bv; a2 += bv; a3 += bv; }
        heap[o0 + j] = a0; heap[o1 + j] = a1; heap[o2 + j] = a2; heap[o3 + j] = a3;
      }
    }
    for (; t < T; t++) {
      var xs = xo + t * M, ys = yo + t * N;
      for (j = 0; j < N; j++) {
        wp = wo + j * M; a0 = 0;
        for (i = 0; i < M; i++) a0 += heap[xs + i] * heap[wp + i];
        heap[ys + j] = bo ? a0 + heap[bo + j] : a0;
      }
    }
  }

  function layerNorm(heap, off, T, N, g, b) {
    for (var t = 0; t < T; t++) {
      var o = off + t * N, s = 0, i;
      for (i = 0; i < N; i++) s += heap[o + i];
      var m = s / N, v = 0, d;
      for (i = 0; i < N; i++) { d = heap[o + i] - m; v += d * d; }
      var inv = 1 / Math.sqrt(v / N + EPS);
      for (i = 0; i < N; i++) heap[o + i] = (heap[o + i] - m) * inv * heap[g + i] + heap[b + i];
    }
  }

  // erf по Abramowitz & Stegun 7.1.26: расхождение с точным меньше 1e-7,
  // на косинусах не видно
  function erf(x) {
    var s = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }

  /* Читает тензор из файла в обычный Float32Array независимо от того, как он
   * лежит: float32 или int8 с отдельным множителем на строку (см.
   * tools/pack-model.js). Поле count в старом формате — число чисел, в новом
   * его считаем из формы.
   */
  function readTensor(buf, m) {
    var base = buf.buffer || buf, b0 = buf.byteOffset || 0;
    var n = m.count;
    if (n === undefined) { n = 1; for (var d = 0; d < m.shape.length; d++) n *= m.shape[d]; }
    if (m.dtype === 'int8') {
      var q = new Int8Array(base, b0 + m.offset, n);
      var rows = m.shape[0], cols = n / rows;
      var sc = new Float32Array(base, b0 + m.scales, rows);
      var out = new Float32Array(n);
      for (var r = 0; r < rows; r++) {
        var s = sc[r], o = r * cols;
        for (var c = 0; c < cols; c++) out[o + c] = q[o + c] * s;
      }
      return out;
    }
    return new Float32Array(base, b0 + m.offset, n);
  }

  function tensorCount(m) {
    if (m.count !== undefined) return m.count;
    var n = 1; for (var d = 0; d < m.shape.length; d++) n *= m.shape[d];
    return n;
  }

  function load(buffer, manifest) {
    // model.json кладёт раскладку в поле tensors, старый формат — в корень
    if (manifest && manifest.tensors) manifest = manifest.tensors;

    /* ---- раскладка общей памяти ----
     * Веса и рабочие буферы лежат в одном непрерывном куске: так WebAssembly
     * читает их напрямую по смещению, а JS видит те же числа через Float32Array.
     * Каждый тензор выравниваем на 4 числа — под v128.
     */
    var align = function (n) { return (n + 3) & ~3; };
    var OFF = {}, cur = 0, SHAPE = {};
    var TRANSPOSED = { q: 1, k: 1, v: 1, ao: 1, fi: 1, fo: 1 };

    Object.keys(manifest).forEach(function (k) {
      SHAPE[k] = manifest[k].shape;
      OFF[k] = cur;
      cur = align(cur + tensorCount(manifest[k]));
    });

    var cap = MAX_BATCH_TOKENS;
    var BUF = {};
    ['x', 'q', 'k', 'v', 'ctx', 'att'].forEach(function (n) { BUF[n] = cur; cur = align(cur + cap * H); });
    BUF.ff = cur; cur = align(cur + cap * FF);
    ['qh', 'kh', 'vh'].forEach(function (n) { BUF[n] = cur; cur = align(cur + cap * H); });
    var TOTAL = cur;

    // WebAssembly: компилируем и растим память под всё сразу
    var wasm = null;
    try {
      if (typeof WebAssembly !== 'undefined') {
        var inst = new WebAssembly.Instance(new WebAssembly.Module(b64ToBytes(WASM_B64)), {});
        var mem = inst.exports.mem;
        var need = Math.ceil(TOTAL * 4 / 65536) + 2;
        var have = mem.buffer.byteLength / 65536;
        if (need > have) mem.grow(need - have);
        wasm = { mm: inst.exports.matmulT, mem: mem };
      }
    } catch (e) { wasm = null; }   // нет SIMD — считаем на JS

    var heap = wasm ? new Float32Array(wasm.mem.buffer, 0, TOTAL) : new Float32Array(TOTAL);

    // копируем веса, попутно транспонируя матрицы линейных слоёв
    Object.keys(manifest).forEach(function (k) {
      var m = manifest[k], t = readTensor(buffer, m), to = OFF[k], i;
      var short = k.split('.')[1];
      if (m.shape.length === 2 && TRANSPOSED[short]) {
        var M = m.shape[0], N = m.shape[1];
        for (i = 0; i < M; i++) {
          var so = i * N;
          for (var j = 0; j < N; j++) heap[to + j * M + i] = t[so + j];
        }
        SHAPE[k] = [N, M];
      } else {
        for (i = 0; i < t.length; i++) heap[to + i] = t[i];
      }
    });

    var VOCAB = SHAPE['embeddings.word'][0];
    var MAXPOS = SHAPE['embeddings.pos'][0];

    function mm(xo, T, M, key, N, bkey, yo) {
      if (wasm) wasm.mm(xo * 4, T, M, OFF[key] * 4, N, bkey ? OFF[bkey] * 4 : 0, yo * 4);
      else matmulJS(heap, xo, T, M, OFF[key], N, bkey ? OFF[bkey] : 0, yo);
    }

    // [t][h*HD+d] -> [h][t][d]: без этого внутренний цикл внимания шагает
    // по памяти через 312 чисел и съедает половину времени
    function toHeads(so, dof, T) {
      for (var h = 0; h < HEADS; h++) {
        var hb = dof + h * T * HD, ho = h * HD;
        for (var t = 0; t < T; t++) {
          var s = so + t * H + ho, d0 = hb + t * HD;
          for (var d = 0; d < HD; d++) heap[d0 + d] = heap[s + d];
        }
      }
    }

    var sc = new Float64Array(512);

    function forward(ids, segs, T) {
      var s, t, i, j, h, L, d;
      var we = OFF['embeddings.word'], pe = OFF['embeddings.pos'], te = OFF['embeddings.type'];
      var X = BUF.x;

      for (s = 0; s < segs.length; s++) {
        for (t = 0; t < segs[s].len; t++) {
          var id = ids[segs[s].off + t]; if (id < 0 || id >= VOCAB) id = 1; // [UNK]
          var wo = we + id * H, po = pe + t * H, xo = X + (segs[s].off + t) * H;
          for (i = 0; i < H; i++) heap[xo + i] = heap[wo + i] + heap[po + i] + heap[te + i];
        }
      }
      layerNorm(heap, X, T, H, OFF['embeddings.ln.w'], OFF['embeddings.ln.b']);

      var scale = 1 / Math.sqrt(HD);
      for (L = 0; L < LAYERS; L++) {
        var p = 'l' + L + '.';
        mm(X, T, H, p + 'q.w', H, p + 'q.b', BUF.q);
        mm(X, T, H, p + 'k.w', H, p + 'k.b', BUF.k);
        mm(X, T, H, p + 'v.w', H, p + 'v.b', BUF.v);
        toHeads(BUF.q, BUF.qh, T); toHeads(BUF.k, BUF.kh, T); toHeads(BUF.v, BUF.vh, T);

        for (s = 0; s < segs.length; s++) {           // внимание внутри предложения
          var base = segs[s].off, n = segs[s].len;
          if (n > sc.length) sc = new Float64Array(n);
          for (h = 0; h < HEADS; h++) {
            var hb = h * T * HD;
            for (i = 0; i < n; i++) {
              var qi = BUF.qh + hb + (base + i) * HD, mx = -Infinity;
              for (j = 0; j < n; j++) {
                var kj = BUF.kh + hb + (base + j) * HD, acc = 0;
                for (d = 0; d < HD; d++) acc += heap[qi + d] * heap[kj + d];
                acc *= scale; sc[j] = acc; if (acc > mx) mx = acc;
              }
              var sum = 0;
              for (j = 0; j < n; j++) { var e = Math.exp(sc[j] - mx); sc[j] = e; sum += e; }
              var inv = 1 / sum, co = BUF.ctx + (base + i) * H + h * HD;
              for (d = 0; d < HD; d++) heap[co + d] = 0;
              for (j = 0; j < n; j++) {
                var w2 = sc[j] * inv, vo = BUF.vh + hb + (base + j) * HD;
                for (d = 0; d < HD; d++) heap[co + d] += w2 * heap[vo + d];
              }
            }
          }
        }

        mm(BUF.ctx, T, H, p + 'ao.w', H, p + 'ao.b', BUF.att);
        for (i = 0; i < T * H; i++) heap[X + i] += heap[BUF.att + i];
        layerNorm(heap, X, T, H, OFF[p + 'ln1.w'], OFF[p + 'ln1.b']);

        mm(X, T, H, p + 'fi.w', FF, p + 'fi.b', BUF.ff);
        for (i = 0; i < T * FF; i++) { var g = heap[BUF.ff + i]; heap[BUF.ff + i] = g * 0.5 * (1 + erf(g * 0.7071067811865476)); }
        mm(BUF.ff, T, FF, p + 'fo.w', H, p + 'fo.b', BUF.att);
        for (i = 0; i < T * H; i++) heap[X + i] += heap[BUF.att + i];
        layerNorm(heap, X, T, H, OFF[p + 'ln2.w'], OFF[p + 'ln2.b']);
      }

      return segs.map(function (sg) {                 // среднее по токенам + нормировка
        var out = new Float32Array(H), n2 = 0, a, b2;
        for (a = 0; a < sg.len; a++) {
          var o = X + (sg.off + a) * H;
          for (b2 = 0; b2 < H; b2++) out[b2] += heap[o + b2];
        }
        for (b2 = 0; b2 < H; b2++) { out[b2] /= sg.len; n2 += out[b2] * out[b2]; }
        var iv = 1 / (Math.sqrt(n2) || 1);
        for (b2 = 0; b2 < H; b2++) out[b2] *= iv;
        return out;
      });
    }

    function embedAll(list, onProgress) {
      var res = [], i = 0, done = 0;
      while (i < list.length) {
        var ids = [], segs = [], T = 0;
        while (i < list.length) {
          var cur2 = list[i];
          if (cur2.length > MAXPOS) cur2 = cur2.slice(0, MAXPOS);
          if (cur2.length > MAX_BATCH_TOKENS) cur2 = cur2.slice(0, MAX_BATCH_TOKENS);
          if (T && T + cur2.length > MAX_BATCH_TOKENS) break;
          segs.push({ off: T, len: cur2.length });
          for (var z = 0; z < cur2.length; z++) ids.push(cur2[z]);
          T += cur2.length; i++;
        }
        var out = forward(ids, segs, T);
        for (var q = 0; q < out.length; q++) res.push(out[q]);
        done += out.length;
        if (onProgress) onProgress(done, list.length);
      }
      return res;
    }

    return {
      embed: function (ids) { return embedAll([ids])[0]; },
      embedAll: embedAll,
      dim: H, vocabSize: VOCAB, maxPos: MAXPOS,
      backend: wasm ? 'wasm-simd' : 'js'
    };
  }

  function cosine(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  return { load: load, cosine: cosine, HIDDEN: H, MAX_TOKENS: MAX_BATCH_TOKENS };
});
