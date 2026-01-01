# Telegram Auth (initData → JWT для Supabase)

## Контекст

Telegram Mini Apps передают `initData`, которое содержит параметры пользователя и подпись `hash`.
Наша задача:

1. проверить, что initData подписано Telegram (через bot token),
2. проверить “свежесть” (`auth_date`),
3. выпустить JWT (HS256), который Supabase примет как Bearer, и который содержит claim `telegram_id`.

## Реализация в проекте

Файл: `app/api/auth/telegram/route.ts`

### Ключевые параметры

- `MAX_AUTH_AGE_SECONDS = 24h` — насколько старым может быть initData
- `TOKEN_TTL_SECONDS = 24h` — срок жизни JWT

### Как считается подпись (важно не “упростить”)

1. Парсим initData как querystring.
2. Берём `hash`, удаляем из параметров.
3. Сортируем параметры по ключу (лексикографически).
4. Склеиваем как `key=value` по строкам с `\n`.
5. Делаем `secretKey = HMAC_SHA256("WebAppData", botToken)`.
6. `computedHash = HMAC_SHA256(secretKey, dataCheckString)` и сравниваем timing-safe.

### Что кладём в JWT payload

Минимальный набор для Supabase:

- `aud: "authenticated"`
- `role: "authenticated"`
- `sub: telegramId`
- `telegram_id: telegramId`

⚠️ Политики RLS завязаны на `auth.jwt()->>'telegram_id'`.

## Лучшие практики и защита

### Секреты

- `TELEGRAM_BOT_TOKEN` и `SUPABASE_JWT_SECRET` — **только серверные env**.
- Никогда не начинайте эти переменные с `NEXT_PUBLIC_`.

### Кэширование

- Ответ auth всегда `Cache-Control: no-store`.

### Ограничения/Rate limit

Если endpoint становится публичным (не только внутри Telegram), добавьте:

- rate limiting (по IP/UA) на уровне edge/платформы,
- логирование отказов без утечек initData.

### Ошибки и сообщения

- Возвращайте одинаково “скучные” ошибки для атакующего (не раскрывать детали).
- В dev можно логировать подробнее, но не выводить initData целиком.

## Расширение (если понадобится)

### Добавить “версию токена”

Можно добавить claim `ver: 1`, чтобы в будущем отличать форматы.

### Ротация секретов

- `SUPABASE_JWT_SECRET` ротация требует перевыпуска токенов.
- Делайте план: короткий TTL + постепенная миграция.

### Edge runtime?

Текущая реализация использует `crypto` Node и явно `runtime = "nodejs"`.
Переход на edge возможен, но требует совместимого crypto и осторожной проверки.
