import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, isSameDay, startOfDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import {
  type SupabaseErrorLike,
  formatDateOnly,
} from '../lib/task-utils';
import type { TaskSeriesRow, TaskSeriesSkipRow } from './usePlanner';

export const RECURRING_QUERY_KEY = 'recurring-tasks';

type UseRecurringTasksConfig = {
  userId: string | null;
  runWithAuthRetry: <T extends { error: SupabaseErrorLike | null | undefined }>(
    operation: () => PromiseLike<T> | T,
  ) => Promise<T>;
  onTasksChanged: () => void;
  setTasksCache: (updater: (prev: import('../types/task').Task[]) => import('../types/task').Task[]) => void;
};

export function useRecurringTasks(config: UseRecurringTasksConfig) {
  const { userId, runWithAuthRetry, onTasksChanged, setTasksCache } = config;
  const queryClient = useQueryClient();

  const queryKey = [RECURRING_QUERY_KEY, userId];

  const recurringQuery = useQuery<{
    series: TaskSeriesRow[];
    skips: TaskSeriesSkipRow[];
  }>({
    queryKey,
    queryFn: async () => {
      const todayKey = formatDateOnly(new Date());

      const { data, error } = await runWithAuthRetry(() =>
        supabase
          .from('task_series')
          .select('*')
          .eq('telegram_id', userId!)
          .or(`end_date.is.null,end_date.gte.${todayKey}`),
      );

      if (error || !data) return { series: [], skips: [] };

      const seriesRows = data as TaskSeriesRow[];
      const seriesIds = seriesRows.map((s) => s.id);

      if (seriesIds.length === 0) return { series: seriesRows, skips: [] };

      const { data: skipsData, error: skipsError } = await runWithAuthRetry(
        () =>
          supabase
            .from('task_series_skips')
            .select('series_id,date')
            .eq('telegram_id', userId!)
            .in('series_id', seriesIds)
            .gte('date', todayKey),
      );

      return {
        series: seriesRows,
        skips:
          !skipsError && skipsData
            ? (skipsData as TaskSeriesSkipRow[])
            : [],
      };
    },
    enabled: !!userId,
  });

  const recurringTasks = recurringQuery.data?.series ?? [];
  const recurringSkips = recurringQuery.data?.skips ?? [];

  const fetchRecurringTasks = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, userId]);

  const deleteTaskSeries = useCallback(
    async (seriesId: string) => {
      if (!userId) return;
      const today = startOfDay(new Date());
      const todayKey = formatDateOnly(today);
      const yesterdayKey = formatDateOnly(addDays(today, -1));

      // Optimistic: remove from cache
      queryClient.setQueryData<{
        series: TaskSeriesRow[];
        skips: TaskSeriesSkipRow[];
      }>(queryKey, (old) => {
        if (!old) return { series: [], skips: [] };
        return {
          series: old.series.filter((s) => s.id !== seriesId),
          skips: old.skips.filter((s) => s.series_id !== seriesId),
        };
      });

      setTasksCache((prev) =>
        prev.filter(
          (task) =>
            !(
              task.seriesId === seriesId &&
              formatDateOnly(task.date) >= todayKey
            ),
        ),
      );

      const { error: updateError } = await runWithAuthRetry(() =>
        supabase
          .from('task_series')
          .update({ end_date: yesterdayKey })
          .eq('telegram_id', userId)
          .eq('id', seriesId),
      );

      if (updateError) {
        fetchRecurringTasks();
        onTasksChanged();
        return;
      }

      const { error: deleteFutureError } = await runWithAuthRetry(() =>
        supabase
          .from('tasks')
          .delete()
          .eq('telegram_id', userId)
          .eq('series_id', seriesId)
          .gte('date', todayKey),
      );

      if (deleteFutureError) onTasksChanged();

      await runWithAuthRetry(() =>
        supabase
          .from('task_series_skips')
          .delete()
          .eq('series_id', seriesId),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, runWithAuthRetry, fetchRecurringTasks, onTasksChanged, setTasksCache],
  );

  const skipTaskSeriesDate = useCallback(
    async (seriesId: string, date: Date) => {
      if (!userId) return;
      const dateKey = formatDateOnly(date);
      const hasSkip = recurringSkips.some(
        (skip) => skip.series_id === seriesId && skip.date === dateKey,
      );
      const skipAddedOptimistically = !hasSkip;

      // Optimistic update
      setTasksCache((prev) =>
        prev.filter(
          (t) => !(t.seriesId === seriesId && isSameDay(t.date, date)),
        ),
      );

      if (skipAddedOptimistically) {
        queryClient.setQueryData<{
          series: TaskSeriesRow[];
          skips: TaskSeriesSkipRow[];
        }>(queryKey, (old) => {
          if (!old) return { series: [], skips: [] };
          return {
            ...old,
            skips: [
              ...old.skips,
              { series_id: seriesId, date: dateKey },
            ],
          };
        });
      }

      const { error: skipError } = await runWithAuthRetry(() =>
        supabase.from('task_series_skips').upsert(
          {
            series_id: seriesId,
            telegram_id: userId,
            date: dateKey,
          },
          { onConflict: 'series_id,date', ignoreDuplicates: true },
        ),
      );

      if (skipError) {
        if (skipAddedOptimistically) {
          queryClient.setQueryData<{
            series: TaskSeriesRow[];
            skips: TaskSeriesSkipRow[];
          }>(queryKey, (old) => {
            if (!old) return { series: [], skips: [] };
            return {
              ...old,
              skips: old.skips.filter(
                (s) =>
                  !(s.series_id === seriesId && s.date === dateKey),
              ),
            };
          });
        }
        onTasksChanged();
        return;
      }

      const { error: deleteError } = await runWithAuthRetry(() =>
        supabase
          .from('tasks')
          .delete()
          .eq('series_id', seriesId)
          .eq('date', dateKey),
      );

      if (deleteError) {
        console.error(
          'Skip recurring date failed to delete task instance',
          deleteError,
        );
        if (skipAddedOptimistically) {
          queryClient.setQueryData<{
            series: TaskSeriesRow[];
            skips: TaskSeriesSkipRow[];
          }>(queryKey, (old) => {
            if (!old) return { series: [], skips: [] };
            return {
              ...old,
              skips: old.skips.filter(
                (s) =>
                  !(s.series_id === seriesId && s.date === dateKey),
              ),
            };
          });
        }
        await runWithAuthRetry(() =>
          supabase
            .from('task_series_skips')
            .delete()
            .eq('series_id', seriesId)
            .eq('date', dateKey),
        );
        onTasksChanged();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, recurringSkips, runWithAuthRetry, onTasksChanged, setTasksCache],
  );

  return {
    recurringTasks,
    recurringSkips,
    fetchRecurringTasks,
    deleteTaskSeries,
    skipTaskSeriesDate,
  };
}
