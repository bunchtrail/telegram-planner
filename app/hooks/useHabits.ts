import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Habit, HabitLog } from '../types/habit';
import type { SupabaseErrorLike } from '../lib/task-utils';

const HABITS_QUERY_KEY = 'habits';
const HABIT_LOGS_QUERY_KEY = 'habit_logs';

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

const buildHabitLogKey = (habitId: string, date: string) =>
	`${habitId}:${date}`;

const sortHabits = (habits: Habit[]) =>
	[...habits].sort(
		(left, right) =>
			left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
	);

type UseHabitsConfig = {
	userId: string | null;
	weekStartKey: string; // yyyy-MM-dd
	weekEndKey: string; // yyyy-MM-dd
	runWithAuthRetry: <
		T extends { error: SupabaseErrorLike | null | undefined },
	>(
		operation: () => PromiseLike<T> | T,
	) => Promise<T>;
};

export function useHabits({
	userId,
	weekStartKey,
	weekEndKey,
	runWithAuthRetry,
}: UseHabitsConfig) {
	const queryClient = useQueryClient();
	const logMutationQueueRef = useRef(new Map<string, Promise<void>>());
	const pendingLogKeysRef = useRef(new Set<string>());
	const [pendingLogKeys, setPendingLogKeys] = useState<Set<string>>(
		() => new Set(),
	);
	const [syncError, setSyncError] = useState<string | null>(null);

	const habitsQueryKey = useMemo(() => [HABITS_QUERY_KEY, userId], [userId]);

	const logsQueryKey = useMemo(
		() => [HABIT_LOGS_QUERY_KEY, userId, weekStartKey, weekEndKey],
		[userId, weekStartKey, weekEndKey],
	);

	const isDateInRange = useCallback(
		(date: string) => date >= weekStartKey && date <= weekEndKey,
		[weekStartKey, weekEndKey],
	);

	const setLogPending = useCallback((key: string, pending: boolean) => {
		const pendingKeys = pendingLogKeysRef.current;
		if (pending) {
			if (pendingKeys.has(key)) return;
			pendingKeys.add(key);
			setPendingLogKeys(new Set(pendingKeys));
			return;
		}
		if (!pendingKeys.delete(key)) return;
		setPendingLogKeys(new Set(pendingKeys));
	}, []);

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
				setSyncError('Не удалось загрузить привычки');
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
				setSyncError('Не удалось загрузить отметки привычек');
				return [];
			}
			return (data as HabitLogRow[]).map(mapLogRow);
		},
		enabled: !!userId,
	});

	const habits = habitsQuery.data ?? [];
	const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
	const logsIndex = useMemo(
		() =>
			new Set(logs.map((entry) => buildHabitLogKey(entry.habitId, entry.date))),
		[logs],
	);

	const persistHabitLogState = useCallback(
		async (habitId: string, date: string, checked: boolean) => {
			if (checked) {
				const { error } = await runWithAuthRetry(() =>
					supabase.from('habit_logs').upsert(
						{ habit_id: habitId, date },
						{
							onConflict: 'habit_id,date',
							ignoreDuplicates: false,
						},
					),
				);
				if (error) throw error;
				return;
			}

			const { error } = await runWithAuthRetry(() =>
				supabase
					.from('habit_logs')
					.delete()
					.eq('habit_id', habitId)
					.eq('date', date),
			);
			if (error) throw error;
		},
		[runWithAuthRetry],
	);

	const enqueueHabitLogPersist = useCallback(
		(habitId: string, date: string, checked: boolean) => {
			const key = buildHabitLogKey(habitId, date);
			const previous =
				logMutationQueueRef.current.get(key) ?? Promise.resolve();

			// Keep server writes for the same habit/day strictly ordered.
			const next = previous
				.catch(() => undefined)
				.then(() => persistHabitLogState(habitId, date, checked))
				.then(() => {
					setSyncError(null);
				})
				.catch((error: unknown) => {
					console.error('Persist habit log failed', error);
					setSyncError('Не удалось синхронизировать привычку');
					void queryClient.invalidateQueries({ queryKey: logsQueryKey });
				})
				.finally(() => {
					setLogPending(key, false);
					if (logMutationQueueRef.current.get(key) === next) {
						logMutationQueueRef.current.delete(key);
					}
				});

			logMutationQueueRef.current.set(key, next);
		},
		[persistHabitLogState, queryClient, logsQueryKey, setLogPending],
	);

	// --- Add habit ---
	const addHabitMutation = useMutation({
		mutationFn: async (params: {
			name: string;
			icon: string;
			color: string;
		}) => {
			const nextOrder = habits.length;
			const { data, error } = await runWithAuthRetry(() =>
				supabase
					.from('habits')
					.insert({
						name: params.name,
						icon: params.icon,
						color: params.color,
						sort_order: nextOrder,
					})
					.select('id, name, icon, color, sort_order, archived')
					.single(),
			);
			if (error) throw error;
			return mapHabitRow(data as HabitRow);
		},
		onSuccess: (newHabit) => {
			queryClient.setQueryData<Habit[]>(habitsQueryKey, (old) => [
				...sortHabits([...(old ?? []), newHabit]),
			]);
			setSyncError(null);
		},
		onError: () => {
			setSyncError('Не удалось добавить привычку');
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
			setSyncError(null);
		},
		onError: () => {
			setSyncError('Не удалось удалить привычку');
		},
	});

	const addHabit = useCallback(
		(name: string, icon: string, color: string) =>
			addHabitMutation.mutate({ name, icon, color }),
		[addHabitMutation],
	);

	const deleteHabit = useCallback(
		(habitId: string) => deleteHabitMutation.mutate(habitId),
		[deleteHabitMutation],
	);

	const toggleLog = useCallback(
		(habitId: string, date: string) => {
			const key = buildHabitLogKey(habitId, date);
			if (pendingLogKeysRef.current.has(key)) return;

			setLogPending(key, true);
			void queryClient.cancelQueries({ queryKey: logsQueryKey });
			const prev =
				queryClient.getQueryData<HabitLog[]>(logsQueryKey) ?? [];
			const existing = prev.find(
				(l) => l.habitId === habitId && l.date === date,
			);
			const nextChecked = !existing;

			queryClient.setQueryData<HabitLog[]>(
				logsQueryKey,
				existing
					? prev.filter(
							(l) =>
								!(
									l.habitId === habitId && l.date === date
								),
						)
					: [
							...prev,
							{
								id: `temp-${habitId}-${date}-${Date.now()}`,
								habitId,
								date,
							},
						],
			);

			enqueueHabitLogPersist(habitId, date, nextChecked);
		},
		[queryClient, logsQueryKey, enqueueHabitLogPersist, setLogPending],
	);

	const isChecked = useCallback(
		(habitId: string, date: string) =>
			logsIndex.has(buildHabitLogKey(habitId, date)),
		[logsIndex],
	);

	const isLogPending = useCallback(
		(habitId: string, date: string) =>
			pendingLogKeys.has(buildHabitLogKey(habitId, date)),
		[pendingLogKeys],
	);

	useEffect(() => {
		if (!userId) return;

		const channel = supabase
			.channel(`habits-${userId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'habits',
					filter: `telegram_id=eq.${userId}`,
				},
				(payload) => {
					if (payload.eventType === 'DELETE') {
						const oldRow = payload.old as HabitRow;
						if (!oldRow?.id) return;
						queryClient.setQueryData<Habit[]>(habitsQueryKey, (old) =>
							(old ?? []).filter((habit) => habit.id !== oldRow.id),
						);
						return;
					}

					const row = payload.new as HabitRow;
					if (!row?.id) return;
					if (row.archived) {
						queryClient.setQueryData<Habit[]>(habitsQueryKey, (old) =>
							(old ?? []).filter((habit) => habit.id !== row.id),
						);
						return;
					}
					const mapped = mapHabitRow(row);
					queryClient.setQueryData<Habit[]>(habitsQueryKey, (old) => {
						const withoutCurrent = (old ?? []).filter(
							(habit) => habit.id !== row.id,
						);
						return sortHabits([...withoutCurrent, mapped]);
					});
				},
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'habit_logs',
					filter: `telegram_id=eq.${userId}`,
				},
				(payload) => {
					if (payload.eventType === 'DELETE') {
						const oldRow = payload.old as HabitLogRow;
						if (!oldRow?.id || !isDateInRange(oldRow.date)) return;
						queryClient.setQueryData<HabitLog[]>(logsQueryKey, (old) =>
							(old ?? []).filter((log) => log.id !== oldRow.id),
						);
						return;
					}

					const row = payload.new as HabitLogRow;
					if (!row?.id || !isDateInRange(row.date)) return;
					const mapped = mapLogRow(row);

					queryClient.setQueryData<HabitLog[]>(logsQueryKey, (old) => {
						const withoutCurrent = (old ?? []).filter(
							(log) =>
								!(
									log.id === row.id ||
									(log.habitId === mapped.habitId &&
										log.date === mapped.date)
								),
						);
						return [...withoutCurrent, mapped];
					});
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [
		userId,
		queryClient,
		habitsQueryKey,
		logsQueryKey,
		isDateInRange,
	]);

	const isSyncing =
		habitsQuery.isFetching ||
		logsQuery.isFetching ||
		addHabitMutation.isPending ||
		deleteHabitMutation.isPending ||
		pendingLogKeys.size > 0;

	const clearSyncError = useCallback(() => setSyncError(null), []);

	return {
		habits,
		logs,
		isLoading: habitsQuery.isLoading || logsQuery.isLoading,
		isSyncing,
		syncError,
		clearSyncError,
		addHabit,
		deleteHabit,
		toggleLog,
		isChecked,
		isLogPending,
	};
}
