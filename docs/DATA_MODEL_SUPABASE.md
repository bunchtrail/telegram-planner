# Supabase: схема данных, RLS, ограничения

## Таблица `public.tasks`

Источник истины: `supabase/migrations/*`

`supabase/schema.sql` — актуальный snapshot схемы для review и ручной сверки, но
fresh bootstrap должен идти через цепочку миграций.

### Назначение

Одна таблица хранит:

- обычные задачи дня (`is_goal = false`)
- цели по периодам (`is_goal = true` + `goal_period` + `goal_slot`)

### Основные поля

- `id uuid PK`
- `telegram_id text not null default (auth.jwt()->>'telegram_id')`
- `title text not null` (1..160)
- `duration int not null` (1..1440)
- `date date not null` — логическая дата (без времени)
- `completed bool`
- `position bigint not null default 0` — порядок задач внутри дня
- `elapsed_ms bigint not null default 0` — фактически затраченное время (мс)
- `active_started_at timestamptz` — когда запущен таймер (null если не активна)
- `series_id uuid` — связь с серией повтора (если `null` — обычная задача)
- `color text not null default '#ff9f0a'` — цвет категории
- `is_pinned bool not null default false` — закрепление в списке
- `checklist jsonb not null default '[]'` — подзадачи
- время/напоминания:
  - `start_minutes smallint` — минуты от начала дня (0..1439)
  - `remind_before_minutes smallint not null default 0` — за сколько минут напомнить (0..1440)
  - `remind_at timestamptz` — фактическое время напоминания (UTC)
  - `reminder_sent_at timestamptz` — когда напоминание было отправлено
- goal-поля:
  - `is_goal bool`
  - `goal_period text in ('day','week','month','year')`
  - `goal_slot smallint >= 1`

### Ограничения целостности (почему это важно)

- `tasks_title_length` и `tasks_duration_range` защищают от мусора/переполнений.
- `tasks_elapsed_nonnegative` защищает от отрицательного времени.
- `tasks_goal_fields` гарантирует консистентность: goal поля либо все пустые, либо валидные.

### Индексы

- `tasks_telegram_id_date_idx` — критичен для выборок по календарю
- `tasks_goals_period_idx` + `tasks_goals_slot_idx` — для целей и сортировки по слоту
- `tasks_position_idx` — упрощает сортировку задач по ручному порядку
- `idx_tasks_pinned` — ускоряет сортировку “закреплённые выше”
- `tasks_active_single_idx` — гарантирует одну активную задачу на пользователя
- `tasks_series_date_unique` — защита от дублей инстанса серии на одну дату
- `tasks_remind_due_idx` — ускоряет выборку задач, по которым надо отправить напоминание

### RPC функции

- `get_user_streak(user_telegram_id text) -> int` — считает текущий стрик
  выполненных дней (считает “сегодня” как не сбрасывающий, если задач ещё нет).

## Таблица `public.pomodoro_sessions`

### Назначение

Хранит завершённые фазы Pomodoro (focus/short_break/long_break).

### Основные поля

- `id uuid PK`
- `telegram_id text not null default (auth.jwt()->>'telegram_id')`
- `task_id uuid null FK -> tasks.id`
- `session_date date not null` — логический день пользователя для статистики
- `duration_minutes smallint`
- `type text in ('focus','short_break','long_break')`
- `completed_at timestamptz`

### RPC функции

- `get_weekly_focus_stats(week_end_date date default current_date)` —
  недельная статистика фокус-сессий текущего пользователя.
  Важно: `telegram_id` берётся из JWT (`auth.jwt()->>'telegram_id'`),
  а не из параметров клиента. Группировка идёт по `session_date`, а не по UTC-дню
  из `completed_at`.

## Таблица `public.task_series`

### Назначение

Хранит правила повтора (серии) для задач.

### Основные поля

- `id uuid PK`
- `telegram_id text not null default (auth.jwt()->>'telegram_id')`
- `title text not null` (1..160)
- `duration int not null` (1..1440)
- `repeat text in ('daily','weekly')`
- `weekday smallint` — для weekly (0..6)
- `start_minutes smallint` — минуты от начала дня (0..1439)
- `remind_before_minutes smallint not null default 0` — за сколько минут напомнить
- `start_date date not null`
- `end_date date` — конец серии (по выбору «на сколько дней/недель»)

### Индексы

- `task_series_telegram_id_start_date_idx`
- `task_series_telegram_id_end_date_idx`

## Таблица `public.task_series_skips`

### Назначение

Хранит “пропуски” серий (чтобы удалённый инстанс не появлялся снова).

### Основные поля

- `series_id uuid FK -> task_series.id`
- `telegram_id text not null default (auth.jwt()->>'telegram_id')`
- `date date not null`

### Индексы

- `task_series_skips_telegram_id_date_idx`

## RLS политики

RLS включен, политики работают через claim:

- `telegram_id = auth.jwt()->>'telegram_id'`

Это значит:

- клиент НЕ должен отправлять telegram_id (по умолчанию он берётся из JWT).
- любые попытки доступа к чужим данным будут блокироваться на уровне Postgres.

RLS применяется ко всем таблицам: `tasks`, `task_series`, `task_series_skips`,
`habits`, `habit_logs`, `pomodoro_sessions`.

Для child-таблиц этого недостаточно само по себе: ownership родительских ссылок
дополнительно валидируется на уровне БД (`series_id`, `habit_id`, `task_id`)
через policy checks и trigger validation.

## Realtime и DELETE события

Чтобы фильтры Realtime по `telegram_id` корректно работали на DELETE,
таблицы имеют `REPLICA IDENTITY FULL` — это гарантирует, что `old` содержит
`telegram_id` и события не теряются.

## Best practices для изменений схемы

### 1) Миграции

Даже если сейчас используется “ручной SQL”, держите изменения:

- в отдельных SQL файлах (например `supabase/migrations/XXXX_name.sql`)
- и применяйте последовательно (чтобы можно было восстановить состояние)

### 2) CHECK/UNIQUE/NOT NULL — с первого дня

Если вы добавляете поле — сразу решите:

- nullable или нет?
- нужен ли CHECK?
- нужен ли индекс?

### 3) Enum вместо text (опционально)

`goal_period text` можно усилить:

- Postgres ENUM типом или справочной таблицей.
  Плюсы: меньше ошибок, лучше целостность.
  Минусы: миграции чуть сложнее.

### 4) Обновление `updated_at`

Триггер `set_updated_at` уже есть — сохраняйте эту практику для новых таблиц.

## Рекомендации по будущим расширениям

### Категории/проекты

Лучше отдельная таблица `categories` / `projects`:

- `id uuid`
- `telegram_id` по той же схеме
- FK из `tasks.category_id` (с индексом)

### Повторяющиеся задачи

Повторы реализованы через “серии” + инстансы:

- `task_series` — правило повтора,
- `tasks` — конкретные инстансы по датам,
- `task_series_skips` — исключения (удалённые инстансы).

### Приватность

Не храните чувствительные данные пользователя Telegram (имя/username) в БД без необходимости.
Сейчас мы используем только `telegram_id` — это хорошо.
