# Supabase: схема данных, RLS, ограничения

## Таблица `public.tasks`

Источник: `supabase/schema.sql`

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
- `tasks_active_single_idx` — гарантирует одну активную задачу на пользователя
- `tasks_series_date_unique` — защита от дублей инстанса серии на одну дату

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

RLS применяется ко всем таблицам: `tasks`, `task_series`, `task_series_skips`.

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
