# Архитектура

## Кратко

Приложение — Telegram Mini App:

- **Клиент**: Next.js App Router UI (в основном client components) + хук `usePlanner`.
- **Сервер**: `POST /api/auth/telegram` проверяет `initData` и выдаёт JWT, совместимый с Supabase RLS.
- **Хранилище**: Supabase Postgres таблица `tasks` + RLS + Realtime (`postgres_changes`).

## Границы ответственности (важно держать)

### UI (компоненты в `app/components/`)

- `app/components/PlannerApp.tsx` — только platform router.
- `app/components/planner/mobile/*` и `app/components/planner/desktop/*` — platform shells и platform-specific adapters.
- `app/components/planner/shared/*` — общие типы и маленькие примитивы без platform-ветвления.
- В UI допустимы только отображение и локальные shell-состояния; бизнес-правила не хранить.

### Бизнес-логика (хуки в `app/hooks/`)

- `usePlanner`: источник истины для задач/целей, подсчётов, навигации по датам, optimistic updates, supabase IO.
- `usePlannerUiController`: общий UI orchestration для shell-ов (sheet, undo, overlays, completion feedback).
- `useHaptic`: тонкая обёртка над Telegram WebApp HapticFeedback.

### Интеграции (в `app/lib/` и `app/api/`)

- `app/api/auth/telegram/route.ts`: только валидация Telegram initData + выпуск JWT.
- `app/api/reminders/run/route.ts`: служебный cron endpoint (секрет в заголовке),
  который атомарно “claim”-ит due reminders через `reminder_sent_at`.
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
4. **Platform boundary на уровне shell**
   - Router определяет `platform` один раз.
   - mobile/desktop различия замыкаются в shell-слое и platform wrappers, а не размазываются по всему дереву.

## Правило платформенного разделения

- `app/lib/platform.ts` — единственный источник truth для platform detection.
- shared hooks/компоненты не должны напрямую вычислять desktop/mobile через `window`, Telegram API или user agent.
- Если поведение реально отличается, это оформляется отдельными mobile/desktop wrapper-ами или shell-компонентами.

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

Для Pomodoro это уже применяется в упрощённом виде:

- `completed_at` хранит фактический timestamp завершения,
- `session_date` хранит логический день пользователя для недельной статистики.
