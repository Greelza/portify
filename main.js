// main.js — frontend logic that uses Netlify functions for fetch + OpenAI review
const analyzeBtn = document.getElementById('analyzeBtn');
const exampleBtn = document.getElementById('exampleBtn');
const urlInput = document.getElementById('url');
const pasteInput = document.getElementById('paste');
const status = document.getElementById('status');
const resultBlock = document.getElementById('result');
const scoreEl = document.getElementById('score');
const breakdownEl = document.getElementById('breakdown');
const recommendationsEl = document.getElementById('recommendations');
const shareBtn = document.getElementById('shareBtn');

exampleBtn.onclick = () => {
  pasteInput.value = `Проект: Landing для кафе
Роль: frontend dev
Задача: сделать адаптивный лендинг, увеличить конверсию подписки
Результат: +12% подписок, время на страницу 2:14
Описание: использованы анимации, кейс со скриншотами, ссылка на исходники.`;
};

analyzeBtn.onclick = async () => {
  reset();
  const url = urlInput.value.trim();
  const paste = pasteInput.value.trim();
  if (!url && !paste) {
    status.textContent = 'Вставь ссылку или текст кейса';
    return;
  }
  status.textContent = 'Анализ...';
  let text = paste;
  if (url) {
    status.textContent = 'Запрашиваю страницу через serverless-прокси...';
    try {
      const res = await fetch(`/.netlify/functions/fetch-page?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('fetch failed');
      text = await res.text();
    } catch (e) {
      status.textContent = 'Не получилось получить URL через прокси. Вставь HTML/текст в поле ниже.';
      if (!paste) return;
    }
  }

  // Call OpenAI-powered review (serverless)
  try {
    status.textContent = 'Отправляю запрос на глубокий анализ (OpenAI)...';
    const res = await fetch('/.netlify/functions/openai-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('openai function failed');
    const data = await res.json();
    showOpenAIResult(data);
    status.textContent = 'Готово';
  } catch (err) {
    status.textContent = 'OpenAI недоступен — выполняю локальный анализ...';
    // fallback to local heuristics if OpenAI fails
    const contentScore = analyzeContent(text);
    const uxScore = analyzeUX(text);
    const perfScore = analyzePerformanceHeuristic(text);
    const hireScore = analyzeHireability(text);
    const total = Math.round((contentScore + uxScore + perfScore + hireScore) / 4);
    showResult({ total, parts: { contentScore, uxScore, perfScore, hireScore }, text });
  }
};

function showOpenAIResult(resp) {
  // expecting { summary, score, recommendations, breakdown }
  const total = resp.score || 0;
  scoreEl.textContent = total;
  breakdownEl.innerHTML = '';
  const mapping = resp.breakdown || [
    { title: 'Content (кейс-стади)', score: resp.contentScore || 0 },
    { title: 'UX / UI', score: resp.uxScore || 0 },
    { title: 'Performance (lite)', score: resp.perfScore || 0 },
    { title: 'Hireability', score: resp.hireScore || 0 }
  ];
  mapping.forEach(m => {
    const el = document.createElement('div');
    el.className = 'cat';
    el.innerHTML = `<h4>${m.title}</h4><div>Оценка: <strong>${m.score}</strong>/100</div>`;
    breakdownEl.appendChild(el);
  });

  recommendationsEl.innerHTML = '<h3>Рекомендации</h3>';
  const ul = document.createElement('ul');
  (resp.recommendations || []).forEach(r => {
    const li = document.createElement('li');
    li.textContent = r;
    ul.appendChild(li);
  });
  recommendationsEl.appendChild(ul);

  shareBtn.onclick = () => {
    const shareText = `Мой портфолио: общий рейтинг ${total}/100 — проверь своё на Portify!`;
    navigator.clipboard?.writeText(shareText).then(()=> {
      alert('Текст для соцсетей скопирован в буфер обмена.');
    }).catch(()=>alert('Скопируй текст вручную: ' + shareText));
  };

  resultBlock.classList.remove('hidden');
}

// --- local heuristics (fallback) ---
function reset() {
  status.textContent = '';
  resultBlock.classList.add('hidden');
  breakdownEl.innerHTML = '';
  recommendationsEl.innerHTML = '';
  scoreEl.textContent = '—';
}

function showResult({ total, parts, text }) {
  resultBlock.classList.remove('hidden');
  scoreEl.textContent = total;
  breakdownEl.innerHTML = '';
  const mapping = [
    { key: 'contentScore', title: 'Content (кейс-стади)' },
    { key: 'uxScore', title: 'UX / UI' },
    { key: 'perfScore', title: 'Performance (lite)' },
    { key: 'hireScore', title: 'Hireability' }
  ];
  mapping.forEach(m => {
    const v = parts[m.key];
    const el = document.createElement('div');
    el.className = 'cat';
    el.innerHTML = `<h4>${m.title}</h4><div>Оценка: <strong>${v}</strong>/100</div>`;
    breakdownEl.appendChild(el);
  });

  const recs = generateRecommendations(parts, text);
  const ul = document.createElement('ul');
  recs.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r;
    ul.appendChild(li);
  });
  recommendationsEl.innerHTML = '<h3>Рекомендации</h3>';
  recommendationsEl.appendChild(ul);

  shareBtn.onclick = () => {
    const shareText = `Мой портфолио: общий рейтинг ${total}/100 — check it at Portify.app (пример)`;
    navigator.clipboard?.writeText(shareText).then(()=> {
      alert('Текст для соцсетей скопирован в буфер обмена.');
    }).catch(()=>alert('Скопируй текст вручную: ' + shareText));
  };
}

function analyzeContent(htmlOrText) {
  const text = htmlOrText.toLowerCase();
  let score = 50;
  if (/(role|роль|я\s+делал|я\s+делала)/.test(text)) score += 15;
  if (/(result|результат|increase|%|\+12%|увелич)/.test(text)) score += 15;
  if (/(screenshot|скрин|prototype|figma|github|github.com)/.test(text)) score += 10;
  if (/case study|case-study|кейc|кейс/.test(text)) score += 10;
  return clamp(score);
}

function analyzeUX(htmlOrText) {
  const text = htmlOrText.toLowerCase();
  let score = 45;
  if (/(overview|process|flow|процесс|этап|шаг|research|исслед)/.test(text)) score += 12;
  if (/(cta|contact|hire me|связаться|подписаться|contact)/.test(text)) score += 13;
  if (/(mobile|responsive|адаптив|@media)/.test(text)) score += 10;
  return clamp(score);
}

function analyzePerformanceHeuristic(htmlOrText) {
  const text = htmlOrText.toLowerCase();
  let score = 50;
  if (/(lighthouse|performance|speed|2s|3s|page speed)/.test(text)) score += 10;
  if (/(svg|webp|optimized|lazyload|lazy\-load)/.test(text)) score += 10;
  if (/<img\s/.test(text) && !/data:image\/svg\+xml/.test(text)) score -= 5;
  return clamp(score);
}

function analyzeHireability(htmlOrText) {
  const text = htmlOrText.toLowerCase();
  let score = 40;
  if (/(contact|hire me|email|телефон|связаться)/.test(text)) score += 20;
  if (/(clients|customers|worked with|работал с|клиенты|employer)/.test(text)) score += 15;
  if (/(case study|результат|result|metrics)/.test(text)) score += 10;
  return clamp(score);
}

function generateRecommendations(parts, text) {
  const rec = [];
  if (parts.contentScore < 60) {
    rec.push('Добавь явную роль и результат в каждый кейс (что сделал и какой был эффект — числа лечат).');
  } else {
    rec.push('Классно: в кейсах есть роль и результаты — подчеркни графиками/цифрами.');
  }
  if (parts.uxScore < 60) {
    rec.push('Улучшить CTA: видимая кнопка "Hire me" на главной и в кейсах.');
  } else {
    rec.push('UX ок: CTA видим и понятен.');
  }
  if (parts.perfScore < 60) {
    rec.push('Оптимизируй изображения (webp, lazyload) и минимизируй блокирующие скрипты.');
  } else {
    rec.push('Performance-бонус: упомяни числа загрузки или lighthouse-оценку прямо в отчёте.');
  }
  if (parts.hireScore < 60) {
    rec.push('Добавь контакты и краткую “why hire me” часть с достижениями и клиентским результатом.');
  } else {
    rec.push('Hireability — strong: контакты и примеры клиентов есть.');
  }
  rec.push('Сгенерируй короткую "share" карточку: 3 строки — роль, результат, общий рейтинг.');
  return rec;
}

function clamp(v){ return Math.max(0, Math.min(100, Math.round(v))); }
