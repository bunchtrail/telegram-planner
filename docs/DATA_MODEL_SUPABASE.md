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
- goal-поля:
  - `is_goal bool`
  - `goal_period text in ('day','week','month','year')`
  - `goal_slot smallint between 1 and 3`

### Ограничения целостности (почему это важно)

- `tasks_title_length` и `tasks_duration_range` защищают от мусора/переполнений.
- `tasks_goal_fields` гарантирует консистентность: goal поля либо все пустые, либо валидные.

### Индексы

- `tasks_telegram_id_date_idx` — критичен для выборок по календарю
- `tasks_goals_period_idx` + `tasks_goals_slot_idx (unique)` — для целей и правила “слот уникален”

## RLS политики

RLS включен, политики работают через claim:

- `telegram_id = auth.jwt()->>'telegram_id'`

Это значит:

- клиент НЕ должен отправлять telegram_id (по умолчанию он берётся из JWT).
- любые попытки доступа к чужим данным будут блокироваться на уровне Postgres.

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

Не пытайтесь хранить “repeat rule” в текущей строке без модели:

- либо отдельная таблица `recurrences`,
- либо `repeat_rule` + генерация инстансов “на лету” (но тогда подумать про realtime).

### Приватность

Не храните чувствительные данные пользователя Telegram (имя/username) в БД без необходимости.
Сейчас мы используем только `telegram_id` — это хорошо.
