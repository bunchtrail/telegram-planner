# Архитектура

## Кратко

Приложение — Telegram Mini App:

- **Клиент**: Next.js App Router UI (в основном client components) + хук `usePlanner`.
- **Сервер**: `POST /api/auth/telegram` проверяет `initData` и выдаёт JWT, совместимый с Supabase RLS.
- **Хранилище**: Supabase Postgres таблица `tasks` + RLS + Realtime (`postgres_changes`).

## Границы ответственности (важно держать)

### UI (компоненты в `app/components/`)

- Только отображение и локальные UI-состояния (открыт/закрыт sheet, фокус, анимации).
- Не хранить там бизнес-правила (лимиты, правила слотов, фильтры дат) — это зона `usePlanner`.

### Бизнес-логика (хуки в `app/hooks/`)

- `usePlanner`: источник истины для задач/целей, подсчётов, навигации по датам, optimistic updates, supabase IO.
- `useHaptic`: тонкая обёртка над Telegram WebApp HapticFeedback.

### Интеграции (в `app/lib/` и `app/api/`)

- `app/api/auth/telegram/route.ts`: только валидация Telegram initData + выпуск JWT.
- `app/api/reminders/run/route.ts`: серверный cron endpoint для отправки напоминаний через Telegram Bot API (`GET` для Vercel Cron по Bearer secret, `POST` для совместимости/ручных вызовов).
- `app/lib/supabase.ts`: конфигурация клиента Supabase и установка access token.

## Поток авторизации

1. Клиент читает `Telegram.WebApp.initData` (или `NEXT_PUBLIC_TELEGRAM_INIT_DATA` в dev).
2. Клиент отправляет `initData` на `POST /api/auth/telegram`.
3. Сервер:
   - проверяет подпись initData;
   - проверяет свежесть (`auth_date`);
   - извлекает `user.id`;
   - подписывает JWT (`telegram_id` claim + `sub`).
4. Клиент кладёт JWT в `supabase` (включая realtime auth).
5. Все запросы к таблице `tasks` теперь “само-ограничены” RLS политиками.

## Поток данных задач

- “Календарь” и “Задачи дня” — запрос за месяц (range по date) + фильтрация в памяти.
- “Цели” — запрос за активные периоды (day/week/month/year) и сортировка по `goal_slot`.
- Realtime подписка держит состояние в актуальном виде и подхватывает изменения с других устройств.

## Ключевые архитектурные решения (и почему)

1. **RLS через claim `telegram_id`**
   - Позволяет не доверять клиенту и не передавать telegram_id руками.
2. **Хранение `date` как `date` (без времени)**
   - Упрощает календарную логику. Это “логический день пользователя”, а не UTC timestamp.
3. **Optimistic updates + reconciliation**
   - UI всегда быстрый; при ошибке откатываем.
   - Для INSERT используем временный id и “сопоставление” по полям (см. `STATE_REALTIME.md`).

## Рекомендации по развитию (проверенные направления)

### Добавление новых сущностей

Если появятся “проекты/теги/привычки/заметки”:

- Создавайте отдельные таблицы (не перегружайте `tasks`), но сохраняйте идею RLS по `telegram_id`.
- Вводите явные ограничения (CHECK) и индексы с самого начала.

### Расширение задач

Если добавлять поля:

- `priority`, `notes`, `estimate`, `category_id`, `repeat_rule`:
  - сначала задокументируйте контракт и UX,
  - затем миграция БД + RLS,
  - затем типы в `app/types`,
  - затем UI.

### Дата/таймзоны (если понадобится)

Сейчас `date` — календарная дата. Если появятся уведомления/время начала:

- Добавляйте отдельное поле `starts_at timestamptz` (UTC),
- а `date` оставляйте как производное/кэш для календаря (или вычисляйте).
