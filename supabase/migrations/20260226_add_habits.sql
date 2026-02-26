-- Habits table
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  name text not null,
  icon text not null default '💧',
  color text not null default '#007aff',
  sort_order smallint not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habits_name_length check (char_length(name) > 0 and char_length(name) <= 100)
);

alter table public.habits replica identity full;

create index if not exists habits_telegram_id_idx
  on public.habits (telegram_id, sort_order);

-- Habit logs (daily check-ins)
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  date date not null,
  created_at timestamptz not null default now(),
  constraint habit_logs_unique unique (habit_id, date)
);

alter table public.habit_logs replica identity full;

create index if not exists habit_logs_telegram_id_date_idx
  on public.habit_logs (telegram_id, date);

create index if not exists habit_logs_habit_date_idx
  on public.habit_logs (habit_id, date);

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
before update on public.habits
for each row execute function public.set_updated_at();

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "habits_select_own" on public.habits
for select using (telegram_id = auth.jwt()->>'telegram_id');

create policy "habits_insert_own" on public.habits
for insert with check (telegram_id = auth.jwt()->>'telegram_id');

create policy "habits_update_own" on public.habits
for update using (telegram_id = auth.jwt()->>'telegram_id')
with check (telegram_id = auth.jwt()->>'telegram_id');

create policy "habits_delete_own" on public.habits
for delete using (telegram_id = auth.jwt()->>'telegram_id');

create policy "habit_logs_select_own" on public.habit_logs
for select using (telegram_id = auth.jwt()->>'telegram_id');

create policy "habit_logs_insert_own" on public.habit_logs
for insert with check (telegram_id = auth.jwt()->>'telegram_id');

create policy "habit_logs_delete_own" on public.habit_logs
for delete using (telegram_id = auth.jwt()->>'telegram_id');
