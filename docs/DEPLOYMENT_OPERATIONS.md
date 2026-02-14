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
- `SUPABASE_SERVICE_ROLE_KEY` (для рассылки напоминаний)
- `CRON_SECRET` (рекомендуется для Vercel Cron: Bearer token в `Authorization`)
- `REMINDERS_CRON_SECRET` (legacy/fallback: ключ в query `?key=...`)

## Supabase настройки

1. Применить `supabase/schema.sql`
2. Убедиться, что JWT secret совпадает с `SUPABASE_JWT_SECRET`
3. Realtime включен для таблицы (по умолчанию — обычно да, но зависит от проекта)

## Напоминания (cron)

- Vercel Cron: `GET /api/reminders/run` (защита через `Authorization: Bearer <CRON_SECRET>`)
- Внешний cron/manual: `POST /api/reminders/run?key=...` (или `Authorization: Bearer ...`)
- Ключ: `CRON_SECRET` (или `REMINDERS_CRON_SECRET` как fallback)
- Рекомендуемый интервал: 1–5 минут (в зависимости от лимитов и нужной точности)
- В репозитории добавлен `vercel.json` с расписанием `*/2 * * * *`.

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
