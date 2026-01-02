-- Fix ON CONFLICT target for series instances by using a non-partial unique index.

do $$
begin
  if to_regclass('public.tasks') is null then
    return;
  end if;

  drop index if exists public.tasks_series_date_unique;

  create unique index if not exists tasks_series_date_unique
    on public.tasks (series_id, date);
end $$;
