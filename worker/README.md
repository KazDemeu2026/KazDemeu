# Cloudflare Worker Proxy for KazDemeu Secure App

This worker provides a secure API proxy layer between the browser and Supabase.

## Purpose
- Protects the Supabase `service_role` key from client exposure.
- Handles authentication and issue JWT-like bearer tokens.
- Forwards authorized REST requests to Supabase for allowed tables.
- Enforces simple role-based write permissions.

## Routes
- `POST /api/auth/login`
  - Body: `{ login, password }`
  - Returns: `{ token, role, name, exp }`

- `GET /api/auth/me`
  - Requires `Authorization: Bearer <token>` header.
  - Returns current user metadata.

- `/api/data/<table>`
  - GET: read from allowed table.
  - POST/PATCH/DELETE: write only if role permits.

## Configuration
Set these environment variables in Cloudflare:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_SECRET`
- `AUTH_USERS`

Example `AUTH_USERS` payload:
```json
{
  "admin": { "passwordHash": "<sha256-hash>", "role": "admin", "name": "Admin" },
  "manager": { "passwordHash": "<sha256-hash>", "role": "manager", "name": "Manager" }
}
```

## Deployment
### Вручную через Wrangler
1. Установите Wrangler, если ещё не установлен:
```powershell
npm install -g wrangler
```
2. Выполните вход:
```powershell
wrangler login
```
3. Опубликуйте из папки `worker`:
```powershell
cd worker
wrangler publish
```

### Автоматически через GitHub Actions
Если вы хотите, чтобы воркер публиковался при пуше в `main`:
- добавьте файл `.github/workflows/deploy-worker.yml`
- добавьте в GitHub Secrets:
  - `CF_API_TOKEN`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `API_SECRET`
  - `AUTH_USERS`

GitHub Actions будет использовать эти секреты для деплоя воркера в Cloudflare.
