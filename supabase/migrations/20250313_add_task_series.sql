-- Add recurring task series and skips.

do $$
begin
  if to_regclass('public.task_series') is null then
    create table public.task_series (
      id uuid primary key default gen_random_uuid(),
      telegram_id text not null default (auth.jwt()->>'telegram_id'),
      title text not null,
      duration integer not null default 30,
      repeat text not null check (repeat in ('daily','weekly')),
      weekday smallint,
      start_date date not null,
      end_date date,
      created_at timestamptz not null default now(),
      constraint task_series_weekday_valid check (
        (repeat = 'weekly' and weekday between 0 and 6)
        or (repeat = 'daily' and weekday is null)
      )
    );
  end if;

  if to_regclass('public.task_series_skips') is null then
    create table public.task_series_skips (
      series_id uuid references public.task_series(id) on delete cascade,
      telegram_id text not null default (auth.jwt()->>'telegram_id'),
      date date not null,
      created_at timestamptz not null default now(),
      primary key (series_id, date)
    );
  end if;

  if to_regclass('public.tasks') is not null then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'tasks'
        and column_name = 'series_id'
    ) then
      alter table public.tasks
        add column series_id uuid references public.task_series(id) on delete cascade;
    end if;

    create unique index if not exists tasks_series_date_unique
      on public.tasks (series_id, date)
      where series_id is not null;
  end if;

  create index if not exists task_series_telegram_id_start_date_idx
    on public.task_series (telegram_id, start_date);

  create index if not exists task_series_telegram_id_end_date_idx
    on public.task_series (telegram_id, end_date);

  create index if not exists task_series_skips_telegram_id_date_idx
    on public.task_series_skips (telegram_id, date);

  alter table public.task_series enable row level security;
  alter table public.task_series_skips enable row level security;

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
end $$;
