-- Add manual ordering for tasks.

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
      and column_name = 'position'
  ) then
    alter table public.tasks
      add column position bigint not null default 0;
  end if;

  create index if not exists tasks_position_idx
    on public.tasks (position);
end $$;
