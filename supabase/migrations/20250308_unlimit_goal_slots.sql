-- Allow unlimited goal slots by ensuring goal columns exist and relaxing constraints.

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
      and column_name = 'is_goal'
  ) then
    alter table public.tasks
      add column is_goal boolean not null default false;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'goal_period'
  ) then
    alter table public.tasks
      add column goal_period text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'goal_slot'
  ) then
    alter table public.tasks
      add column goal_slot smallint;
  end if;

  alter table public.tasks drop constraint if exists tasks_goal_fields;
  alter table public.tasks add constraint tasks_goal_fields
    check (
      (is_goal = false and goal_period is null and goal_slot is null)
      or
      (is_goal = true and goal_period in ('day','week','month','year') and goal_slot >= 1)
    );
end $$;

drop index if exists tasks_goals_slot_idx;

do $$
begin
  if to_regclass('public.tasks') is not null then
    create index if not exists tasks_goals_slot_idx
      on public.tasks (telegram_id, goal_period, goal_slot);
  end if;
end $$;
