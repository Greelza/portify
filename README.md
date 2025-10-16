Portify — AI Portfolio Reviewer (extended)
=============================================

В комплекте — статический фронтенд + две Netlify serverless-функции:
- fetch-page.js — proxy для загрузки страниц (обходит CORS)
- openai-review.js — вызывает OpenAI и возвращает структурированный JSON-отчет

ВАЖНО: Ни в коем случае **не сохраняйте** секретные ключи в публичных репозиториях.
Если вы передавали ключ в чат (как сделали ранее), **смените ключ в OpenAI dashboard прямо сейчас**.

Как запустить локально (Netlify Dev)
------------------------------------
1. Установите Node.js и Netlify CLI:
   npm install -g netlify-cli

2. Инициализируйте проект и запустите:
   netlify init
   netlify dev

3. Установите переменную окружения OPENAI_API_KEY:
   - В Linux/macOS:
       export OPENAI_API_KEY="sk-..."
   - На Windows (PowerShell):
       $env:OPENAI_API_KEY = "sk-..."

   Или добавьте ключ через Dashboard Netlify (Site settings -> Build & deploy -> Environment -> Environment variables)

4. Тест OpenAI-функции:
   POST request to http://localhost:8888/.netlify/functions/openai-review
   body: { "text": "Your project HTML or description here" }

Как задеплоить на Netlify
-------------------------
1. Подключите репозиторий через Netlify или выполните:
   netlify deploy --prod

2. В настройках сайта в Netlify задайте переменную OPENAI_API_KEY (не храните ключ в коде).

Ротация / отзыв скомпрометированного ключа
-----------------------------------------
Если вы случайно поделились ключом (например, в чате), сделайте следующее:
1. Зайдите в https://platform.openai.com/account/api-keys
2. Найдите скомпрометированный ключ и нажмите "Revoke" или "Delete"
3. Создайте новый ключ и обновите переменную OPENAI_API_KEY в Netlify

Security reminder
-----------------
- Никогда не пушьте секретные ключи в публичные репозитории.
- Используйте environment variables на хостинге.
- Для дополнительных мер используйте прокси/сервер и ограничения по доменам/ips.
