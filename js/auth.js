/*
 * Вход по логину и паролю — временный замок, пока детектор на GitHub Pages.
 * Сервера нет, поэтому это защита от случайных посетителей, а не от того,
 * кто откроет код страницы. Настоящий вход — после переезда на хостинг:
 * там проверка пароля переедет на сервер, а форма и роли останутся.
 *
 * Пользователи — js/users.js (только соль и хеш), правятся через
 * node tools/user.js. Подключается в <head>, до отрисовки страницы,
 * чтобы детектор не мелькал перед формой входа.
 */
(function () {
  'use strict';
  var KEY = 'aidet_auth';
  var ITER = 150000;          // столько же в tools/user.js
  var DAYS = 30;              // столько помним вход на устройстве
  var ROLES = { admin: 'Админ', worker: 'Работник', guest: 'Гость' };
  var users = self.DetectorUsers || [];

  function find(login) {
    login = String(login || '').trim().toLowerCase();
    for (var i = 0; i < users.length; i++) if (users[i].login === login) return users[i];
    return null;
  }
  // Сессия привязана к хешу: смена пароля или удаление пользователя
  // выбрасывает его со всех устройств.
  function current() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      var u = s && find(s.login);
      if (u && s.sig === u.hash.slice(0, 16) && s.until > Date.now()) return u;
    } catch (e) {}
    return null;
  }

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function check(login, password) {
    var u = find(login);
    var subtle = self.crypto && self.crypto.subtle;
    if (!subtle) return Promise.reject(new Error('Браузер не умеет проверять пароль. Откройте страницу в свежем Chrome, Safari или Firefox.'));
    var enc = new TextEncoder();
    // считаем хеш и для несуществующего логина — чтобы ответ не выдавал, есть ли такой
    var salt = u ? u.salt : '00000000000000000000000000000000';
    return subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']).then(function (key) {
      return subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITER }, key, 256);
    }).then(function (bits) {
      return u && hex(bits) === u.hash ? u : null;
    });
  }

  function login(u) {
    try { localStorage.setItem(KEY, JSON.stringify({ login: u.login, sig: u.hash.slice(0, 16), until: Date.now() + DAYS * 864e5 })); } catch (e) {}
  }
  function log(fn, arg) { var L = self.DetectorLog; if (L) L[fn](arg); }
  function logout() {
    log('logout');
    try { localStorage.removeItem(KEY); } catch (e) {}
    (self.DetectorLog ? self.DetectorLog.flush() : Promise.resolve()).then(function () { location.reload(); });
  }

  var user = current();
  if (!user) document.documentElement.classList.add('auth-locked');

  self.DetectorAuth = {
    roles: ROLES,
    user: function () { return user; },
    role: function () { return user ? user.role : null; },
    logout: logout
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function showGate() {
    var V = self.DetectorVersion;
    var gate = document.createElement('div');
    gate.id = 'auth-gate';
    gate.className = 'auth-gate';
    gate.innerHTML =
      '<form class="auth-card" novalidate>' +
        '<div class="brand"><span class="brand-mark">AI</span><div>' +
          '<div class="brand-name">' + esc(V ? V.name : 'ИИ Детектор Пылова') + '</div>' +
          '<div class="brand-sub">Вход для своих</div></div></div>' +
        '<label class="field-label" for="auth-login">Логин</label>' +
        '<input id="auth-login" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required>' +
        '<label class="field-label" for="auth-pass">Пароль</label>' +
        '<input id="auth-pass" name="password" type="password" autocomplete="current-password" required>' +
        '<p class="auth-err" id="auth-err" role="alert"></p>' +
        '<button class="pill primary lg" type="submit">Войти</button>' +
        '<p class="field-hint">Вход, проверки и загруженные тексты записываются в журнал.<br>' +
          'Логин и пароль выдаёт администратор:<br>' +
          '<a href="https://t.me/bigmatrix2xl" target="_blank" rel="noopener">@bigmatrix2xl</a> в Telegram</p>' +
      '</form>';
    document.body.insertBefore(gate, document.body.firstChild);

    var form = gate.querySelector('form');
    var err = gate.querySelector('#auth-err');
    var btn = gate.querySelector('button');
    gate.querySelector('#auth-login').focus();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var l = form.username.value, p = form.password.value;
      if (!l.trim() || !p) { err.textContent = 'Введите логин и пароль'; return; }
      btn.disabled = true; err.textContent = '';
      check(l, p).then(function (u) {
        if (!u) {
          // пауза против перебора с клавиатуры
          log('loginFailed', l.trim());
          setTimeout(function () { btn.disabled = false; err.textContent = 'Неверный логин или пароль'; form.password.select(); }, 600);
          return;
        }
        login(u);
        user = u;
        log('login');
        gate.remove();
        document.documentElement.classList.remove('auth-locked');
        showUser();
      }, function (ex) { btn.disabled = false; err.textContent = ex.message; });
    });
  }

  function showUser() {
    var box = document.querySelector('.top-actions');
    if (!box || !user) return;
    var chip = document.createElement('span');
    chip.className = 'auth-user';
    var role = ROLES[user.role] || user.role;
    chip.innerHTML = '<b>' + esc(user.name) + '</b>' + (role !== user.name ? '<span>' + esc(role) + '</span>' : '');
    var out = document.createElement('button');
    out.type = 'button';
    out.className = 'pill ghost';
    out.textContent = 'Выйти';
    out.onclick = logout;
    box.insertBefore(out, box.firstChild);
    box.insertBefore(chip, out);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (user) showUser(); else showGate();
  });
})();
