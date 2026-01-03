-- Ensure realtime DELETE events include telegram_id for filters
alter table public.tasks replica identity full;
alter table public.task_series replica identity full;
alter table public.task_series_skips replica identity full;
