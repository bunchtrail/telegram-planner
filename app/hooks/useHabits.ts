import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Habit, HabitLog } from '../types/habit';
import type { SupabaseErrorLike } from '../lib/task-utils';

export const HABITS_QUERY_KEY = 'habits';
export const HABIT_LOGS_QUERY_KEY = 'habit_logs';

type HabitRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  archived: boolean;
};

type HabitLogRow = {
  id: string;
  habit_id: string;
  date: string;
};

const mapHabitRow = (row: HabitRow): Habit => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  sortOrder: row.sort_order,
  archived: row.archived,
});

const mapLogRow = (row: HabitLogRow): HabitLog => ({
  id: row.id,
  habitId: row.habit_id,
  date: row.date,
});

type UseHabitsConfig = {
  userId: string | null;
  weekStartKey: string; // yyyy-MM-dd
  weekEndKey: string;   // yyyy-MM-dd
  runWithAuthRetry: <T extends { error: SupabaseErrorLike | null | undefined }>(
    operation: () => PromiseLike<T> | T,
  ) => Promise<T>;
};

export function useHabits({ userId, weekStartKey, weekEndKey, runWithAuthRetry }: UseHabitsConfig) {
  const queryClient = useQueryClient();

  const habitsQueryKey = useMemo(
    () => [HABITS_QUERY_KEY, userId],
    [userId],
  );

  const logsQueryKey = useMemo(
    () => [HABIT_LOGS_QUERY_KEY, userId, weekStartKey, weekEndKey],
    [userId, weekStartKey, weekEndKey],
  );

  // --- Fetch habits ---
  const habitsQuery = useQuery({
    queryKey: habitsQueryKey,
    queryFn: async () => {
      const { data, error } = await runWithAuthRetry(() =>
        supabase
          .from('habits')
          .select('id, name, icon, color, sort_order, archived')
          .eq('archived', false)
          .order('sort_order', { ascending: true }),
      );
      if (error) {
        console.error('Fetch habits failed', error);
        return [];
      }
      return (data as HabitRow[]).map(mapHabitRow);
    },
    enabled: !!userId,
  });

  // --- Fetch logs for date range ---
  const logsQuery = useQuery({
    queryKey: logsQueryKey,
    queryFn: async () => {
      const { data, error } = await runWithAuthRetry(() =>
        supabase
          .from('habit_logs')
          .select('id, habit_id, date')
          .gte('date', weekStartKey)
          .lte('date', weekEndKey),
      );
      if (error) {
        console.error('Fetch habit logs failed', error);
        return [];
      }
      return (data as HabitLogRow[]).map(mapLogRow);
    },
    enabled: !!userId,
  });

  const habits = habitsQuery.data ?? [];
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  // --- Add habit ---
  const addHabitMutation = useMutation({
    mutationFn: async (params: { name: string; icon: string; color: string }) => {
      const nextOrder = habits.length;
      const { data, error } = await runWithAuthRetry(() =>
        supabase
          .from('habits')
          .insert({ name: params.name, icon: params.icon, color: params.color, sort_order: nextOrder })
          .select('id, name, icon, color, sort_order, archived')
          .single(),
      );
      if (error) throw error;
      return mapHabitRow(data as HabitRow);
    },
    onSuccess: (newHabit) => {
      queryClient.setQueryData<Habit[]>(habitsQueryKey, (old) => [...(old ?? []), newHabit]);
    },
  });

  // --- Delete habit ---
  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await runWithAuthRetry(() =>
        supabase.from('habits').delete().eq('id', habitId),
      );
      if (error) throw error;
      return habitId;
    },
    onSuccess: (habitId) => {
      queryClient.setQueryData<Habit[]>(habitsQueryKey, (old) =>
        (old ?? []).filter((h) => h.id !== habitId),
      );
      queryClient.setQueryData<HabitLog[]>(logsQueryKey, (old) =>
        (old ?? []).filter((l) => l.habitId !== habitId),
      );
    },
  });

  // --- Toggle log ---
  const toggleLogMutation = useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      const existing = logs.find((l) => l.habitId === habitId && l.date === date);
      if (existing) {
        const { error } = await runWithAuthRetry(() =>
          supabase.from('habit_logs').delete().eq('id', existing.id),
        );
        if (error) throw error;
        return { action: 'removed' as const, habitId, date, logId: existing.id };
      } else {
        const { data, error } = await runWithAuthRetry(() =>
          supabase
            .from('habit_logs')
            .insert({ habit_id: habitId, date })
            .select('id, habit_id, date')
            .single(),
        );
        if (error) throw error;
        return { action: 'added' as const, log: mapLogRow(data as HabitLogRow) };
      }
    },
    onMutate: async ({ habitId, date }) => {
      await queryClient.cancelQueries({ queryKey: logsQueryKey });
      const prev = queryClient.getQueryData<HabitLog[]>(logsQueryKey) ?? [];
      const existing = prev.find((l) => l.habitId === habitId && l.date === date);
      if (existing) {
        queryClient.setQueryData<HabitLog[]>(logsQueryKey, prev.filter((l) => l.id !== existing.id));
      } else {
        queryClient.setQueryData<HabitLog[]>(logsQueryKey, [
          ...prev,
          { id: `temp-${Date.now()}`, habitId, date },
        ]);
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData<HabitLog[]>(logsQueryKey, context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: logsQueryKey });
    },
  });

  const addHabit = useCallback(
    (name: string, icon: string, color: string) => addHabitMutation.mutate({ name, icon, color }),
    [addHabitMutation],
  );

  const deleteHabit = useCallback(
    (habitId: string) => deleteHabitMutation.mutate(habitId),
    [deleteHabitMutation],
  );

  const toggleLog = useCallback(
    (habitId: string, date: string) => toggleLogMutation.mutate({ habitId, date }),
    [toggleLogMutation],
  );

  const isChecked = useCallback(
    (habitId: string, date: string) => logs.some((l) => l.habitId === habitId && l.date === date),
    [logs],
  );

  return {
    habits,
    logs,
    isLoading: habitsQuery.isLoading || logsQuery.isLoading,
    addHabit,
    deleteHabit,
    toggleLog,
    isChecked,
  };
}
