-- Allow unlimited goal slots by relaxing constraints and removing slot uniqueness.

do $$
begin
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name in ('is_goal', 'goal_period', 'goal_slot')
  ) = 3 then
    alter table public.tasks drop constraint if exists tasks_goal_fields;
    alter table public.tasks add constraint tasks_goal_fields
      check (
        (is_goal = false and goal_period is null and goal_slot is null)
        or
        (is_goal = true and goal_period in ('day','week','month','year') and goal_slot >= 1)
      );
  end if;
end $$;

drop index if exists tasks_goals_slot_idx;

do $$
begin
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name in ('goal_period', 'goal_slot')
  ) = 2 then
    create index if not exists tasks_goals_slot_idx
      on public.tasks (telegram_id, goal_period, goal_slot);
  end if;
end $$;
