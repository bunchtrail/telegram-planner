# Deployment & Operations

## Окружения

- Dev (локально): `NEXT_PUBLIC_TELEGRAM_INIT_DATA` может использоваться для эмуляции
- Prod: initData берётся только из Telegram WebApp

## Переменные окружения (обязательно)

### Public (доступны в браузере)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_NAME` (опционально)
- `NEXT_PUBLIC_APP_DESCRIPTION` (опционально)
- `NEXT_PUBLIC_APP_LANG` (опционально)
- `NEXT_PUBLIC_TELEGRAM_SCRIPT_URL` (опционально)

### Server-only (секреты)

- `TELEGRAM_BOT_TOKEN`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase настройки

1. Применить `supabase/schema.sql`
2. Убедиться, что JWT secret совпадает с `SUPABASE_JWT_SECRET`
3. Realtime включен для таблицы (по умолчанию — обычно да, но зависит от проекта)

## Деплой

- Любая платформа, поддерживающая Next.js (часто Vercel).
- Убедитесь, что API route работает в Node runtime (не edge), так как используется `crypto`.

## Мониторинг/наблюдаемость (рекомендации)

- Логи сервера: только факты ошибок, без `initData` целиком.
- Клиентские ошибки: можно подключить Sentry/аналог (с осторожностью к PII).
- Метрики: число задач/целей, ошибки Supabase, время ответа auth route.

## Управление изменениями (release discipline)

- Маленькие релизы, меньше рисков.
- Схема БД и RLS меняются только совместно с обновлением docs и проверкой в staging.
