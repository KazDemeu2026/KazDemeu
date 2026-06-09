# KazDemeu Secure Version

Это переработанная версия проекта KazDemeu с улучшенной архитектурой безопасности и рабочей схемой через Cloudflare Worker.

## Что сделано
- Убрана прямая публикация `SUPABASE_KEY` в клиентском коде.
- Добавлен защищённый API-прокси на Cloudflare Worker.
- Перенесена аутентификация в защищённый бэкенд.
- Улучшена защита от XSS при рендере данных.
- Уменьшено количество клиентских прямых запросов к Supabase.

## Структура
- `index.html` — входной файл интерфейса.
- `styles.css` — стили приложения.
- `utils.js` — утилиты, хранилище и сессии.
- `supabase.js` — клиент API, работающий через Worker.
- `auth.js` — вход пользователей.
- `contracts.js` — страница договора.
- `analytics.js` — аналитика.
- `expenses.js` — учёт расходов.
- `grok.js` — чат с AI-помощником.
- `app.js` — общая логика навигации и загрузки.
- `worker/` — Cloudflare Worker API-прокси.

## Важно
Этот проект пока находится только локально в папке `KazDemeu-secure`. Я не пушил изменения в ваш GitHub репозиторий — вам нужно будет добавить файлы в репо и запушить.

### Что нужно сделать дальше
1. Настроить Cloudflare Worker и добавить секреты в Cloudflare.
2. Заменить в `index.html`:
   - `window.APP_CONFIG.apiBase = 'https://your-worker.example.workers.dev'`
   - на URL вашего опубликованного воркера.
3. Сформировать `AUTH_USERS` и добавить его в Cloudflare как переменную окружения.
4. Если хотите автоматический деплой из GitHub, добавьте `CF_API_TOKEN` и другие секреты в GitHub Actions.

### Обязательные переменные Cloudflare Worker
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_SECRET`
- `AUTH_USERS`

### Полезные файлы
- `worker/AUTH_USERS.example.json` — пример формата списка пользователей.
- `tools/hash_pw.ps1` — утилита для генерации sha256-пароля на Windows.
- `.github/workflows/deploy-worker.yml` — GitHub Actions workflow для деплоя воркера при пуше в `main`.

### Пример генерации хэша пароля
В PowerShell:
```powershell
cd C:\Users\Admin\KazDemeu-main\KazDemeu-secure
.\tools\hash_pw.ps1 'ВашПароль'
```
Скопируйте результат в `AUTH_USERS` как `passwordHash`.

### Пример `AUTH_USERS`
```json
{
  "admin": {
    "passwordHash": "<sha256-hash>",
    "role": "admin",
    "name": "Admin"
  }
}
```

### Быстрый тест локально
- Откройте `index.html` в браузере или используйте локальный HTTP-сервер.
- Убедитесь, что `apiBase` указывает на рабочий воркер.
- Попробуйте логин.

## Документация по воркеру
Подробные инструкции в `worker/README.md`.
