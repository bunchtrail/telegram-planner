-- Harden ownership checks for parent references and store pomodoro sessions on
-- the planner's logical day instead of UTC day boundaries.

do $$
begin
  if exists (
    select 1
    from public.tasks t
    join public.task_series s on s.id = t.series_id
    where t.series_id is not null
      and s.telegram_id <> t.telegram_id
  ) then
    raise exception 'Found tasks rows referencing task_series owned by another telegram_id';
  end if;

  if exists (
    select 1
    from public.task_series_skips skip
    join public.task_series s on s.id = skip.series_id
    where s.telegram_id <> skip.telegram_id
  ) then
    raise exception 'Found task_series_skips rows referencing task_series owned by another telegram_id';
  end if;

  if exists (
    select 1
    from public.habit_logs log
    join public.habits h on h.id = log.habit_id
    where h.telegram_id <> log.telegram_id
  ) then
    raise exception 'Found habit_logs rows referencing habits owned by another telegram_id';
  end if;

  if exists (
    select 1
    from public.pomodoro_sessions ps
    join public.tasks t on t.id = ps.task_id
    where ps.task_id is not null
      and t.telegram_id <> ps.telegram_id
  ) then
    raise exception 'Found pomodoro_sessions rows referencing tasks owned by another telegram_id';
  end if;
end $$;

alter table public.pomodoro_sessions
  add column if not exists session_date date;

update public.pomodoro_sessions ps
set session_date = t.date
from public.tasks t
where ps.task_id is not null
  and t.id = ps.task_id
  and ps.session_date is null;

update public.pomodoro_sessions
set session_date = (completed_at at time zone 'UTC')::date
where session_date is null;

alter table public.pomodoro_sessions
  alter column session_date set not null;

create index if not exists pomodoro_sessions_focus_stats_idx
  on public.pomodoro_sessions (telegram_id, session_date)
  where type = 'focus';

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

drop function if exists public.get_weekly_focus_stats(date);

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
