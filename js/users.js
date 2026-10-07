/*
 * Пользователи детектора. Пароли не хранятся — только соль и хеш PBKDF2.
 * Править не руками, а через node tools/user.js (add / remove / list).
 */
self.DetectorUsers = [
  {"login":"admin","role":"admin","name":"Администратор","salt":"540171e2af1186e82517c0eb6b77171a","hash":"bf07632d5425e4f66d2c1e9f0fbdd365fef8d874ee4eec02dd7e399abcb4bb28"},
  {"login":"worker","role":"worker","name":"Работник","salt":"7660ffc1762f6ff637331c9d82d76708","hash":"336328a1cf60c627f026447914e39b67f48663bdcc762d376a05c92e08bdca7d"},
  {"login":"guest","role":"guest","name":"Гость","salt":"40dec841a694cd73c943c8288a41fdc6","hash":"5f7addcff10cc382a5a0d27ce574b8be8f8ccf879afe2f34069499acdf52fb67"}
];
