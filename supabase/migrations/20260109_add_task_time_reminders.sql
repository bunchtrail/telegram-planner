-- Add start time and reminder fields for tasks and series
alter table public.tasks
  add column if not exists start_minutes int2 null check (start_minutes between 0 and 1439),
  add column if not exists remind_before_minutes int2 not null default 0 check (remind_before_minutes between 0 and 1440),
  add column if not exists remind_at timestamptz null,
  add column if not exists reminder_sent_at timestamptz null;

create index if not exists tasks_remind_due_idx
  on public.tasks (remind_at)
  where reminder_sent_at is null and remind_at is not null;

alter table public.task_series
  add column if not exists start_minutes int2 null check (start_minutes between 0 and 1439),
  add column if not exists remind_before_minutes int2 not null default 0 check (remind_before_minutes between 0 and 1440);
