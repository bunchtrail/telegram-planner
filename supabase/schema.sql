-- Supabase schema for Telegram Planner
create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  title text not null,
  duration integer not null,
  date date not null,
  completed boolean not null default false,
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

create index if not exists tasks_goals_period_idx
  on public.tasks (telegram_id, goal_period);

create index if not exists tasks_goals_slot_idx
  on public.tasks (telegram_id, goal_period, goal_slot);

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
