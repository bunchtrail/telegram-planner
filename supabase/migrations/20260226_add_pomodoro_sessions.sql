-- Pomodoro sessions table to track completed pomodoro intervals
create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null default (auth.jwt()->>'telegram_id'),
  task_id uuid references public.tasks(id) on delete set null,
  duration_minutes smallint not null default 25,
  type text not null default 'focus' check (type in ('focus','short_break','long_break')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.pomodoro_sessions replica identity full;

create index if not exists pomodoro_sessions_telegram_id_completed_at_idx
  on public.pomodoro_sessions (telegram_id, completed_at);

alter table public.pomodoro_sessions enable row level security;

create policy "pomodoro_sessions_select_own"
on public.pomodoro_sessions for select
using (telegram_id = auth.jwt()->>'telegram_id');

create policy "pomodoro_sessions_insert_own"
on public.pomodoro_sessions for insert
with check (telegram_id = auth.jwt()->>'telegram_id');

create policy "pomodoro_sessions_delete_own"
on public.pomodoro_sessions for delete
using (telegram_id = auth.jwt()->>'telegram_id');

-- Function to get weekly focus stats (pomodoro-based)
create or replace function public.get_weekly_focus_stats(user_telegram_id text, week_end_date date default current_date)
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
  week_start date := week_end_date - interval '6 days';
begin
  return query
  with daily as (
    select
      (completed_at at time zone 'UTC')::date as d,
      count(*) as cnt
    from public.pomodoro_sessions
    where telegram_id = user_telegram_id
      and type = 'focus'
      and (completed_at at time zone 'UTC')::date between week_start and week_end_date
    group by d
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
    ds.d,
    coalesce(dy.cnt, 0)
  from totals t
  cross join generate_series(week_start, week_end_date, '1 day'::interval) as ds(d)
  left join daily dy on dy.d = ds.d::date
  order by ds.d;
end;
$$;

grant execute on function public.get_weekly_focus_stats(text, date) to authenticated;
