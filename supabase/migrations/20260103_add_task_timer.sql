alter table public.tasks
  add column if not exists elapsed_ms bigint not null default 0,
  add column if not exists active_started_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_elapsed_nonnegative'
  ) then
    alter table public.tasks
      add constraint tasks_elapsed_nonnegative check (elapsed_ms >= 0);
  end if;
end $$;

create unique index if not exists tasks_active_single_idx
  on public.tasks (telegram_id)
  where active_started_at is not null and is_goal = false;

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
