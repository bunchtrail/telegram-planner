drop function if exists public.get_weekly_focus_stats(text, date);

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
      (completed_at at time zone 'UTC')::date as d,
      count(*) as cnt
    from public.pomodoro_sessions
    where telegram_id = current_user_telegram_id
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

grant execute on function public.get_weekly_focus_stats(date) to authenticated;
