-- Supabase schema for Telegram Planner
create extension if not exists pgcrypto;

create table if not exists public.task_series (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  title text not null,
  duration integer not null default 30,
  repeat text not null check (repeat in ('daily','weekly')),
  weekday smallint,
  start_minutes int2,
  remind_before_minutes int2 not null default 0,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  constraint task_series_title_length check (char_length(title) > 0 and char_length(title) <= 160),
  constraint task_series_duration_range check (duration > 0 and duration <= 24 * 60),
  constraint task_series_weekday_valid check (
    (repeat = 'weekly' and weekday between 0 and 6)
    or (repeat = 'daily' and weekday is null)
  ),
  constraint task_series_start_minutes_valid check (start_minutes is null or start_minutes between 0 and 1439),
  constraint task_series_remind_before_valid check (remind_before_minutes between 0 and 1440)
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
  elapsed_ms bigint not null default 0,
  active_started_at timestamptz,
  series_id uuid references public.task_series(id) on delete cascade,
  color text not null default '#ff9f0a',
  is_pinned boolean not null default false,
  checklist jsonb not null default '[]'::jsonb,
  start_minutes int2,
  remind_before_minutes int2 not null default 0,
  remind_at timestamptz,
  reminder_sent_at timestamptz,
  is_goal boolean not null default false,
  goal_period text,
  goal_slot smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length check (char_length(title) > 0 and char_length(title) <= 160),
  constraint tasks_duration_range check (duration > 0 and duration <= 24 * 60),
  constraint tasks_elapsed_nonnegative check (elapsed_ms >= 0),
  constraint tasks_start_minutes_valid check (start_minutes is null or start_minutes between 0 and 1439),
  constraint tasks_remind_before_valid check (remind_before_minutes between 0 and 1440),
  constraint tasks_goal_fields check (
    (is_goal = false and goal_period is null and goal_slot is null)
    or
    (is_goal = true and goal_period in ('day','week','month','year') and goal_slot >= 1)
  )
);

alter table public.tasks replica identity full;
alter table public.task_series replica identity full;
alter table public.task_series_skips replica identity full;

create index if not exists tasks_telegram_id_date_idx
  on public.tasks (telegram_id, date);

create index if not exists tasks_telegram_id_created_at_idx
  on public.tasks (telegram_id, created_at);

create index if not exists tasks_remind_due_idx
  on public.tasks (remind_at)
  where reminder_sent_at is null and remind_at is not null;

create index if not exists tasks_position_idx
  on public.tasks (position);

create index if not exists idx_tasks_pinned
  on public.tasks (telegram_id, is_pinned desc, date, position);

create unique index if not exists tasks_active_single_idx
  on public.tasks (telegram_id)
  where active_started_at is not null and is_goal = false;

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

create or replace function public.stop_task_timer_on_complete()
returns trigger as $$
begin
  if new.completed = true and old.active_started_at is not null then
    new.elapsed_ms := old.elapsed_ms +
      floor(extract(epoch from (now() - old.active_started_at)) * 1000);
    new.active_started_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_stop_timer_on_complete on public.tasks;
create trigger tasks_stop_timer_on_complete
before update of completed on public.tasks
for each row execute function public.stop_task_timer_on_complete();

create or replace function public.toggle_task_timer(task_id uuid)
returns table(id uuid, active_started_at timestamptz, elapsed_ms bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user text := auth.jwt()->>'telegram_id';
  target_active timestamptz;
begin
  select active_started_at
  into target_active
  from public.tasks
  where id = task_id
    and telegram_id = current_user
    and is_goal = false
  for update;

  if not found then
    return;
  end if;

  update public.tasks
  set
    elapsed_ms = elapsed_ms +
      floor(extract(epoch from (now() - active_started_at)) * 1000),
    active_started_at = null
  where telegram_id = current_user
    and active_started_at is not null
    and id <> task_id
    and is_goal = false;

  if target_active is not null then
    update public.tasks
    set
      elapsed_ms = elapsed_ms +
        floor(extract(epoch from (now() - active_started_at)) * 1000),
      active_started_at = null
    where id = task_id
      and telegram_id = current_user
      and active_started_at is not null;
  else
    update public.tasks
    set active_started_at = now()
    where id = task_id
      and telegram_id = current_user
      and completed = false
      and is_goal = false;
  end if;

  return query
  select id, active_started_at, elapsed_ms
  from public.tasks
  where id = task_id and telegram_id = current_user;
end;
$$;

grant execute on function public.toggle_task_timer(uuid) to authenticated;

create or replace function public.get_user_streak(user_telegram_id text)
returns integer as $$
declare
  streak integer := 0;
  check_date date := current_date;
  has_task boolean;
begin
  loop
    select exists (
      select 1 from public.tasks
      where telegram_id = user_telegram_id
        and completed = true
        and date::date = check_date
    ) into has_task;

    if has_task then
      streak := streak + 1;
      check_date := check_date - 1;
    else
      if check_date = current_date then
        check_date := check_date - 1;
        continue;
      end if;
      exit;
    end if;
  end loop;
  return streak;
end;
$$ language plpgsql;

grant execute on function public.get_user_streak(text) to authenticated;

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

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  date date not null,
  created_at timestamptz not null default now(),
  constraint habit_logs_unique unique (habit_id, date)
);

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  task_id uuid references public.tasks(id) on delete set null,
  session_date date not null,
  duration_minutes smallint not null default 25,
  type text not null default 'focus' check (type in ('focus','short_break','long_break')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.habits replica identity full;
alter table public.habit_logs replica identity full;
alter table public.pomodoro_sessions replica identity full;

create index if not exists habits_telegram_id_idx
  on public.habits (telegram_id, sort_order);

create index if not exists habit_logs_telegram_id_date_idx
  on public.habit_logs (telegram_id, date);

create index if not exists habit_logs_habit_date_idx
  on public.habit_logs (habit_id, date);

create index if not exists pomodoro_sessions_telegram_id_completed_at_idx
  on public.pomodoro_sessions (telegram_id, completed_at);

create index if not exists pomodoro_sessions_focus_stats_idx
  on public.pomodoro_sessions (telegram_id, session_date)
  where type = 'focus';

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
before update on public.habits
for each row execute function public.set_updated_at();

create or replace function public.validate_owned_parent_refs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  case tg_table_name
    when 'tasks' then
      if new.series_id is not null and not exists (
        select 1
        from public.task_series s
        where s.id = new.series_id
          and s.telegram_id = new.telegram_id
      ) then
        raise exception using
          errcode = '23503',
          message = 'tasks.series_id must reference a task_series row owned by the same telegram_id';
      end if;
    when 'task_series_skips' then
      if not exists (
        select 1
        from public.task_series s
        where s.id = new.series_id
          and s.telegram_id = new.telegram_id
      ) then
        raise exception using
          errcode = '23503',
          message = 'task_series_skips.series_id must reference a task_series row owned by the same telegram_id';
      end if;
    when 'habit_logs' then
      if not exists (
        select 1
        from public.habits h
        where h.id = new.habit_id
          and h.telegram_id = new.telegram_id
      ) then
        raise exception using
          errcode = '23503',
          message = 'habit_logs.habit_id must reference a habits row owned by the same telegram_id';
      end if;
    when 'pomodoro_sessions' then
      if new.task_id is not null and not exists (
        select 1
        from public.tasks t
        where t.id = new.task_id
          and t.telegram_id = new.telegram_id
      ) then
        raise exception using
          errcode = '23503',
          message = 'pomodoro_sessions.task_id must reference a tasks row owned by the same telegram_id';
      end if;
  end case;

  return new;
end;
$$;

drop trigger if exists tasks_validate_owned_parent_refs on public.tasks;
create trigger tasks_validate_owned_parent_refs
before insert or update of telegram_id, series_id on public.tasks
for each row execute function public.validate_owned_parent_refs();

drop trigger if exists task_series_skips_validate_owned_parent_refs on public.task_series_skips;
create trigger task_series_skips_validate_owned_parent_refs
before insert or update of telegram_id, series_id on public.task_series_skips
for each row execute function public.validate_owned_parent_refs();

drop trigger if exists habit_logs_validate_owned_parent_refs on public.habit_logs;
create trigger habit_logs_validate_owned_parent_refs
before insert or update of telegram_id, habit_id on public.habit_logs
for each row execute function public.validate_owned_parent_refs();

drop trigger if exists pomodoro_sessions_validate_owned_parent_refs on public.pomodoro_sessions;
create trigger pomodoro_sessions_validate_owned_parent_refs
before insert or update of telegram_id, task_id on public.pomodoro_sessions
for each row execute function public.validate_owned_parent_refs();

create or replace function public.get_weekly_focus_stats(
  week_end_date date default current_date
)
returns table(
  total_pomodoros bigint,
  total_focus_minutes bigint,
  day_date date,
  day_pomodoros bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_telegram_id text := auth.jwt()->>'telegram_id';
  week_start date := week_end_date - 6;
begin
  if current_user_telegram_id is null then
    return;
  end if;

  return query
  with daily as (
    select
      session_date as d,
      count(*) as cnt
    from public.pomodoro_sessions
    where telegram_id = current_user_telegram_id
      and type = 'focus'
      and session_date between week_start and week_end_date
    group by session_date
  ),
  totals as (
    select
      coalesce(sum(cnt), 0) as total_p,
      coalesce(sum(cnt), 0) * 25 as total_m
    from daily
  )
  select
    t.total_p,
    t.total_m,
    ds.d::date,
    coalesce(dy.cnt, 0)
  from totals t
  cross join generate_series(week_start, week_end_date, '1 day'::interval) as ds(d)
  left join daily dy on dy.d = ds.d::date
  order by ds.d;
end;
$$;

grant execute on function public.get_weekly_focus_stats(date) to authenticated;

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.pomodoro_sessions enable row level security;

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits
for select using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits
for insert with check (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits
for update using (telegram_id = auth.jwt()->>'telegram_id')
with check (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits
for delete using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "habit_logs_select_own" on public.habit_logs;
create policy "habit_logs_select_own" on public.habit_logs
for select using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "habit_logs_insert_own" on public.habit_logs;
create policy "habit_logs_insert_own" on public.habit_logs
for insert with check (
  telegram_id = auth.jwt()->>'telegram_id'
  and exists (
    select 1
    from public.habits h
    where h.id = habit_id
      and h.telegram_id = auth.jwt()->>'telegram_id'
  )
);

drop policy if exists "habit_logs_delete_own" on public.habit_logs;
create policy "habit_logs_delete_own" on public.habit_logs
for delete using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "pomodoro_sessions_select_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_select_own"
on public.pomodoro_sessions for select
using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "pomodoro_sessions_insert_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_insert_own"
on public.pomodoro_sessions for insert
with check (
  telegram_id = auth.jwt()->>'telegram_id'
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.telegram_id = auth.jwt()->>'telegram_id'
    )
  )
);

drop policy if exists "pomodoro_sessions_delete_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_delete_own"
on public.pomodoro_sessions for delete
using (telegram_id = auth.jwt()->>'telegram_id');

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
on public.tasks
for insert
with check (
  telegram_id = auth.jwt()->>'telegram_id'
  and (
    series_id is null
    or exists (
      select 1
      from public.task_series s
      where s.id = series_id
        and s.telegram_id = auth.jwt()->>'telegram_id'
    )
  )
);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
on public.tasks
for update
using (telegram_id = auth.jwt()->>'telegram_id')
with check (
  telegram_id = auth.jwt()->>'telegram_id'
  and (
    series_id is null
    or exists (
      select 1
      from public.task_series s
      where s.id = series_id
        and s.telegram_id = auth.jwt()->>'telegram_id'
    )
  )
);

drop policy if exists "task_series_skips_insert_own" on public.task_series_skips;
create policy "task_series_skips_insert_own"
on public.task_series_skips
for insert
with check (
  telegram_id = auth.jwt()->>'telegram_id'
  and exists (
    select 1
    from public.task_series s
    where s.id = series_id
      and s.telegram_id = auth.jwt()->>'telegram_id'
  )
);
