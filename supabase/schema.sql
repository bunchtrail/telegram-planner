-- Supabase schema for Telegram Planner
create extension if not exists pgcrypto;

create table if not exists public.task_series (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  title text not null,
  duration integer not null default 30,
  repeat text not null check (repeat in ('daily','weekly')),
  weekday smallint,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  constraint task_series_title_length check (char_length(title) > 0 and char_length(title) <= 160),
  constraint task_series_duration_range check (duration > 0 and duration <= 24 * 60),
  constraint task_series_weekday_valid check (
    (repeat = 'weekly' and weekday between 0 and 6)
    or (repeat = 'daily' and weekday is null)
  )
);

create table if not exists public.task_series_skips (
  series_id uuid references public.task_series(id) on delete cascade,
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  date date not null,
  created_at timestamptz not null default now(),
  primary key (series_id, date)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  title text not null,
  duration integer not null,
  date date not null,
  completed boolean not null default false,
  position bigint not null default 0,
  series_id uuid references public.task_series(id) on delete cascade,
  is_goal boolean not null default false,
  goal_period text,
  goal_slot smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length check (char_length(title) > 0 and char_length(title) <= 160),
  constraint tasks_duration_range check (duration > 0 and duration <= 24 * 60),
  constraint tasks_goal_fields check (
    (is_goal = false and goal_period is null and goal_slot is null)
    or
    (is_goal = true and goal_period in ('day','week','month','year') and goal_slot >= 1)
  )
);

create index if not exists tasks_telegram_id_date_idx
  on public.tasks (telegram_id, date);

create index if not exists tasks_telegram_id_created_at_idx
  on public.tasks (telegram_id, created_at);

create index if not exists tasks_position_idx
  on public.tasks (position);

create unique index if not exists tasks_series_date_unique
  on public.tasks (series_id, date);

create index if not exists tasks_goals_period_idx
  on public.tasks (telegram_id, goal_period);

create index if not exists tasks_goals_slot_idx
  on public.tasks (telegram_id, goal_period, goal_slot);

create index if not exists task_series_telegram_id_start_date_idx
  on public.task_series (telegram_id, start_date);

create index if not exists task_series_telegram_id_end_date_idx
  on public.task_series (telegram_id, end_date);

create index if not exists task_series_skips_telegram_id_date_idx
  on public.task_series_skips (telegram_id, date);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.task_series enable row level security;
alter table public.task_series_skips enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
on public.tasks
for select
using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
on public.tasks
for insert
with check (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
on public.tasks
for update
using (telegram_id = auth.jwt()->>'telegram_id')
with check (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
on public.tasks
for delete
using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "task_series_select_own" on public.task_series;
create policy "task_series_select_own"
on public.task_series
for select
using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "task_series_insert_own" on public.task_series;
create policy "task_series_insert_own"
on public.task_series
for insert
with check (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "task_series_update_own" on public.task_series;
create policy "task_series_update_own"
on public.task_series
for update
using (telegram_id = auth.jwt()->>'telegram_id')
with check (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "task_series_delete_own" on public.task_series;
create policy "task_series_delete_own"
on public.task_series
for delete
using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "task_series_skips_select_own" on public.task_series_skips;
create policy "task_series_skips_select_own"
on public.task_series_skips
for select
using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "task_series_skips_insert_own" on public.task_series_skips;
create policy "task_series_skips_insert_own"
on public.task_series_skips
for insert
with check (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "task_series_skips_delete_own" on public.task_series_skips;
create policy "task_series_skips_delete_own"
on public.task_series_skips
for delete
using (telegram_id = auth.jwt()->>'telegram_id');
