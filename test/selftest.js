/* Самотест движка: node test/selftest.js */
'use strict';
const path = require('path');
const kb = require(path.join(__dirname, '..', 'js', 'kb.js'));
const det = require(path.join(__dirname, '..', 'js', 'detector.js'));
const hum = require(path.join(__dirname, '..', 'js', 'humanize.js'));

const AI_TEXT = `В современном мире искусственный интеллект играет ключевую роль в развитии бизнеса. Важно отметить, что внедрение инновационных решений открывает новые горизонты для компаний любого масштаба. Давайте разберемся, почему автоматизация является неотъемлемой частью успешной стратегии.

Во-первых, комплексный подход к автоматизации позволяет существенно оптимизировать бизнес-процессы. Во-вторых, передовые технологии обеспечивают широкий спектр возможностей для масштабирования. Кроме того, интуитивно понятный интерфейс современных платформ позволяет сэкономить время и деньги.

Таким образом, цифровая трансформация — это не просто тренд, а необходимость. Стоит отметить, что компании, которые внедряют инновации, получают значительное конкурентное преимущество. Более того, индивидуальный подход к каждому клиенту становится залогом успеха в условиях стремительно развивающегося рынка.

Подводя итог, можно с уверенностью сказать: будущее за технологиями. Не упустите уникальную возможность вывести свой бизнес на новый уровень!`;

const HUMAN_TEXT = `Мы внедряли CRM три месяца вместо обещанных двух недель. Расскажу, где мы облажались (и что бы я сделал иначе).

Первая ошибка — понадеялись на «коробку». Вендор клялся, что интеграция с 1С заведётся за день. Ага, конечно. В итоге наш бухгалтер Лена неделю вручную сверяла счета, а я по вечерам читал форумы. Нашли костыль: выгрузка через CSV раз в час. Некрасиво? Да. Работает? Уже полгода.

Второе. Менеджеры саботировали систему примерно месяц. Продажи у нас, кстати, не упали — но и не выросли. Помогла банальная вещь: убрали 14 обязательных полей из карточки сделки, оставили 4. Заполняемость выросла с 30% до 90% за две недели.

Что в итоге? Цикл сделки сократился с 21 до 16 дней (считали по 240 сделкам за квартал). Стоило ли оно того? Пожалуй. Но если бы начинал заново — сначала месяц бы просто рисовал процессы на доске, и только потом выбирал софт.`;

let failed = 0;
function check(name, cond, extra) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
  if (!cond) failed++;
}

const rAI = det.analyze(AI_TEXT, kb, { profile: 'balanced' });
const rHU = det.analyze(HUMAN_TEXT, kb, { profile: 'balanced' });

console.log('\n== Оценки ==');
console.log('ИИ-текст:      aiScore=' + rAI.overall.aiScore + '  (' + rAI.overall.verdict + ')');
console.log('Живой текст:   aiScore=' + rHU.overall.aiScore + '  (' + rHU.overall.verdict + ')');

console.log('\n== Проверки ==');
check('ИИ-текст распознан как подозрительный (>=55)', rAI.overall.aiScore >= 55, rAI.overall.aiScore);
check('Живой текст распознан как человеческий (<=40)', rHU.overall.aiScore <= 40, rHU.overall.aiScore);
check('Разрыв оценок >= 30', rAI.overall.aiScore - rHU.overall.aiScore >= 30, rAI.overall.aiScore - rHU.overall.aiScore);
check('В ИИ-тексте найдены штампы (>=10)', rAI.hits.length >= 10, rAI.hits.length);
check('В живом тексте штампов мало (<=4)', rHU.hits.length <= 4, rHU.hits.length);
check('В живом тексте есть человеческие маркеры', rHU.humanHits.length >= 2, rHU.humanHits.length);
check('Сегменты размечены', rAI.segments.length >= 1 && rHU.segments.length >= 1, rAI.segments.length + '/' + rHU.segments.length);
check('Есть рекомендации для ИИ-текста', rAI.recommendations.length >= 2, rAI.recommendations.length);
check('Есть сильные стороны у живого текста', rHU.strengths.length >= 1, rHU.strengths.length);
check('Тепловая карта построена', rAI.heat.length >= 5, rAI.heat.length);
check('Канцелярит найден с офсетами (для подсветки)', rAI.burHits.length >= 2, rAI.burHits.length);
check('Шаблонные начала найдены с офсетами', rAI.starterHits.length >= 3, rAI.starterHits.length);

// детерминизм
const rAI2 = det.analyze(AI_TEXT, kb, { profile: 'balanced' });
check('Детерминизм: повторный прогон даёт тот же балл', rAI2.overall.aiScore === rAI.overall.aiScore);

// профили
const rStrict = det.analyze(AI_TEXT, kb, { profile: 'strict' });
const rSoft = det.analyze(AI_TEXT, kb, { profile: 'soft' });
check('Строгий профиль >= сбалансированного', rStrict.overall.aiScore >= rAI.overall.aiScore, rStrict.overall.aiScore);
check('Мягкий профиль <= сбалансированного', rSoft.overall.aiScore <= rAI.overall.aiScore, rSoft.overall.aiScore);

// whitelist
const rWL = det.analyze(AI_TEXT, kb, { profile: 'balanced', whitelist: ['комплексный подход'] });
check('Исключения (whitelist) уменьшают число совпадений', rWL.hits.length < rAI.hits.length, rWL.hits.length + ' < ' + rAI.hits.length);

// очеловечивание
const h = hum.apply(AI_TEXT, rAI, { mode: 'aggressive' });
const rAfter = det.analyze(h.text, kb, { profile: 'balanced' });
console.log('\nПосле «Очеловечить» (смело): aiScore=' + rAfter.overall.aiScore + ', правок: ' + h.changes.length + ', в ручной список: ' + h.skipped.length);
check('Очеловечивание сделало правки (>=5)', h.changes.length >= 5, h.changes.length);
check('Рискованные штампы ушли в ручной список', h.skipped.length >= 3, h.skipped.length);
check('AI-сигнал после очеловечивания снизился', rAfter.overall.aiScore < rAI.overall.aiScore, rAI.overall.aiScore + ' -> ' + rAfter.overall.aiScore);
check('Число штампов после очеловечивания уменьшилось на 25%+', rAfter.hits.length <= rAI.hits.length * 0.75, rAI.hits.length + ' -> ' + rAfter.hits.length);
check('Текст не сломан (длина в пределах разумного)', h.text.length > AI_TEXT.length * 0.7 && h.text.length <= AI_TEXT.length * 1.1);
check('Нет следов поломанной пунктуации (", ," и т.п.)', !/,\s*,|\s[,.]|\.\./.test(h.text.replace(/\.\.\./g, '…')));

// очеловечивание реального текста: штампы в косвенных падежах
const INFLECTED = `Разработка сайта под ключ требует комплексного подхода к решению задач бизнеса. Использование инновационных решений и передовых технологий обеспечивает рост продаж. Индивидуальным подходом к каждому клиенту мы завоевали доверие партнёров, а интуитивно понятного интерфейса удалось добиться благодаря продуманной архитектуре. Конкурентным преимуществом компании является наличие собственного отдела разработки, что играет ключевую роль при выборе подрядчика.`;
const rInf = det.analyze(INFLECTED, kb, { profile: 'balanced' });
const hInf = hum.apply(INFLECTED, rInf, { mode: 'safe' });
console.log('\nСловоформы (бережно): штампов ' + rInf.hits.length + ', правок: ' + hInf.changes.length);
check('Штампы в косвенных падежах тоже правятся (>=4)', hInf.changes.length >= 4, hInf.changes.length);
check('Существительное остаётся в своём падеже', /требует подхода к решению/.test(hInf.text), hInf.text.slice(0, 90));
check('Глагольный штамп не заменён машинально',
  /играет ключевую роль/.test(hInf.text) && hInf.skipped.some((s) => /играет/.test(s.phrase)));
check('Заглавная буква восстановлена после снятия эпитета', /(^|\s)Подходом к каждому/.test(hInf.text));

// английский
const EN = `In today's fast-paced world, it is important to note that artificial intelligence plays a pivotal role in the ever-evolving landscape of business. Moreover, leveraging cutting-edge technologies can seamlessly unlock the potential of your organization. Furthermore, a comprehensive approach fosters robust growth. In conclusion, the world of digital transformation is a testament to innovation, and its importance cannot be overstated. Whether you are a beginner or an expert, this game-changer will elevate your strategy and take it to the next level. Additionally, harnessing synergy across teams underscores the crucial value of streamlined workflows.`;
const rEN = det.analyze(EN, kb, { profile: 'balanced' });
console.log('\nАнглийский ИИ-текст: aiScore=' + rEN.overall.aiScore + ', lang=' + rEN.meta.lang + ', штампов: ' + rEN.hits.length);
check('Английский язык определён', rEN.meta.lang === 'en');
check('Английские штампы найдены (>=8)', rEN.hits.length >= 8, rEN.hits.length);

console.log('\n' + (failed === 0 ? 'ВСЕ ТЕСТЫ ПРОЙДЕНЫ ✓' : failed + ' ТЕСТ(ОВ) ПРОВАЛЕНО ✗'));
process.exit(failed === 0 ? 0 : 1);
