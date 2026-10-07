#!/usr/bin/env node
/*
  Пользователи детектора: логины, роли, пароли (в js/users.js — только хеши).

  node tools/user.js list
  node tools/user.js add <логин> <admin|worker|guest> "<Имя>" [пароль]
  node tools/user.js remove <логин>

  add без пароля придумывает его сам и печатает один раз — сохраните.
  add для существующего логина меняет ему пароль и роль: старый вход
  на всех устройствах этого человека сразу перестаёт действовать.
*/
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'js', 'users.js');
const ITER = 150000;   // столько же в js/auth.js
const ROLES = { admin: 'Админ', worker: 'Работник', guest: 'Гость' };

function load() {
  const m = fs.readFileSync(FILE, 'utf8').match(/\[[\s\S]*\]/);
  return m ? JSON.parse(m[0]) : [];
}
function save(users) {
  const body = users.map(u => '  ' + JSON.stringify(u)).join(',\n');
  fs.writeFileSync(FILE,
    '/*\n * Пользователи детектора. Пароли не хранятся — только соль и хеш PBKDF2.\n' +
    ' * Править не руками, а через node tools/user.js (add / remove / list).\n */\n' +
    'self.DetectorUsers = [\n' + body + '\n];\n');
}
function genPassword() {
  // без похожих символов (0/O, 1/l/I), чтобы легко продиктовать
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of crypto.randomBytes(12)) s += abc[b % abc.length];
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
}

const [cmd, login, role, name, pass] = process.argv.slice(2);
const users = load();

if (cmd === 'list' || !cmd) {
  for (const u of users) console.log(u.login.padEnd(16), (ROLES[u.role] || u.role).padEnd(10), u.name);
} else if (cmd === 'add') {
  if (!login || !ROLES[role]) { console.log('node tools/user.js add <логин> <admin|worker|guest> "<Имя>" [пароль]'); process.exit(1); }
  const password = pass || genPassword();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITER, 32, 'sha256').toString('hex');
  const entry = { login: login.toLowerCase(), role, name: name || ROLES[role], salt, hash };
  const i = users.findIndex(u => u.login === entry.login);
  if (i >= 0) users[i] = entry; else users.push(entry);
  save(users);
  console.log((i >= 0 ? 'Обновлён: ' : 'Добавлен: ') + entry.login + ' (' + ROLES[role] + ')');
  console.log('Пароль:   ' + password);
} else if (cmd === 'remove') {
  const left = users.filter(u => u.login !== String(login).toLowerCase());
  if (left.length === users.length) { console.log('Нет такого логина: ' + login); process.exit(1); }
  save(left);
  console.log('Удалён: ' + login);
} else {
  console.log('Команды: list, add, remove');
  process.exit(1);
}
