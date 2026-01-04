alter table public.tasks
  add column if not exists color text not null default '#ff9f0a',
  add column if not exists is_pinned boolean not null default false,
  add column if not exists checklist jsonb not null default '[]'::jsonb;

create index if not exists idx_tasks_pinned
  on public.tasks (telegram_id, is_pinned desc, date, position);

create or replace function public.get_user_streak(user_telegram_id text)
returns integer as $$
declare
  streak integer := 0;
  check_date date := current_date;
  has_task boolean;
begin
  loop
    select exists (
      select 1 from public.tasks
      where telegram_id = user_telegram_id
        and completed = true
        and date::date = check_date
    ) into has_task;

    if has_task then
      streak := streak + 1;
      check_date := check_date - 1;
    else
      if check_date = current_date then
        check_date := check_date - 1;
        continue;
      end if;
      exit;
    end if;
  end loop;
  return streak;
end;
$$ language plpgsql;

grant execute on function public.get_user_streak(text) to authenticated;
