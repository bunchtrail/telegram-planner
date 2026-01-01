-- Ensure tasks update policy exists so completed state persists.

do $$
begin
  if to_regclass('public.tasks') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'telegram_id'
  ) then
    return;
  end if;

  alter table public.tasks enable row level security;

  drop policy if exists "tasks_update_own" on public.tasks;
  create policy "tasks_update_own"
  on public.tasks
  for update
  using (telegram_id = auth.jwt()->>'telegram_id')
  with check (telegram_id = auth.jwt()->>'telegram_id');
end $$;
