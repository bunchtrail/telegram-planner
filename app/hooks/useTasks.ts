import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, addWeeks, getDay, isSameDay } from 'date-fns';
import { DEFAULT_TASK_COLOR } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { Task, TaskRepeat } from '../types/task';
import type { TaskSeriesRow, TaskSeriesSkipRow } from './usePlanner';
import {
	type TaskRow,
	type ReorderTaskUpdate,
	type SupabaseErrorLike,
	formatDateOnly,
	parseDateOnly,
	parseSmallInt,
	parseRemindBefore,
	parseChecklist,
	normalizeTaskTitle,
	isTaskTitleValid,
	normalizeTaskDuration,
	computeRemindAtIso,
	areChecklistsEqual,
	normalizeHex,
	isUuid,
	mapTaskRow,
	DEFAULT_DURATION,
} from '../lib/task-utils';

export const TASKS_QUERY_KEY = 'tasks';

type UseTasksConfig = {
	userId: string | null;
	monthStartKey: string;
	monthEndKey: string;
	selectedDate: Date;
	activeMonthKey: string;
	runWithAuthRetry: <
		T extends { error: SupabaseErrorLike | null | undefined },
	>(
		operation: () => PromiseLike<T> | T,
	) => Promise<T>;
};

const isDateInMonth = (
	value: string | Date | null | undefined,
	monthKey: string,
) => {
	if (!value) return false;
	if (typeof value === 'string') return value.slice(0, 7) === monthKey;
	const y = value.getFullYear();
	const m = String(value.getMonth() + 1).padStart(2, '0');
	return `${y}-${m}` === monthKey;
};

export function useTasks(config: UseTasksConfig) {
	const {
		userId,
		monthStartKey,
		monthEndKey,
		selectedDate,
		activeMonthKey,
		runWithAuthRetry,
	} = config;

	const queryClient = useQueryClient();
	const pendingInsertRef = useRef(new Map<string, TaskRow>());
	const pendingMutationRef = useRef(
		new Map<string, Record<string, unknown>>(),
	);
	const pendingReorderUpdatesRef = useRef(
		new Map<string, ReorderTaskUpdate>(),
	);
	const reorderPersistTimerRef = useRef<number | null>(null);

	const queryKey = useMemo(
		() => [TASKS_QUERY_KEY, userId, monthStartKey, monthEndKey],
		[userId, monthStartKey, monthEndKey],
	);

	// --- Helpers ---

	const getTasksSnapshot = useCallback(
		(): Task[] => queryClient.getQueryData<Task[]>(queryKey) ?? [],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[queryClient, userId, monthStartKey, monthEndKey],
	);

	const setTasksCache = useCallback(
		(updater: (prev: Task[]) => Task[]) => {
			queryClient.setQueryData<Task[]>(queryKey, (old) =>
				updater(old ?? []),
			);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[queryClient, userId, monthStartKey, monthEndKey],
	);

	// --- Pending mutation helpers ---

	const queuePendingMutation = useCallback(
		(tempId: string, updates: Record<string, unknown>) => {
			if (!updates || Object.keys(updates).length === 0) return;
			const existing = pendingMutationRef.current.get(tempId) ?? {};
			pendingMutationRef.current.set(tempId, { ...existing, ...updates });
		},
		[],
	);

	const flushPendingMutation = useCallback(
		async (tempId: string, id: string) => {
			const updates = pendingMutationRef.current.get(tempId);
			if (!updates || Object.keys(updates).length === 0) {
				pendingMutationRef.current.delete(tempId);
				return;
			}
			pendingMutationRef.current.delete(tempId);
			const { error } = await runWithAuthRetry(() =>
				supabase.from('tasks').update(updates).eq('id', id),
			);
			if (error)
				console.error('Flush pending task mutation failed', error);
		},
		[runWithAuthRetry],
	);

	const flushPendingReorder = useCallback(async () => {
		if (!userId) {
			pendingReorderUpdatesRef.current.clear();
			return;
		}
		const updates = Array.from(pendingReorderUpdatesRef.current.values());
		pendingReorderUpdatesRef.current.clear();
		if (updates.length === 0) return;

		const { error } = await runWithAuthRetry(() =>
			supabase.from('tasks').upsert(updates, { onConflict: 'id' }),
		);
		if (error) console.error('Reorder failed', error);
	}, [userId, runWithAuthRetry]);

	const scheduleReorderPersist = useCallback(() => {
		if (!userId || pendingReorderUpdatesRef.current.size === 0) return;
		if (reorderPersistTimerRef.current != null)
			window.clearTimeout(reorderPersistTimerRef.current);

		reorderPersistTimerRef.current = window.setTimeout(() => {
			reorderPersistTimerRef.current = null;
			void flushPendingReorder();
		}, 160);
	}, [userId, flushPendingReorder]);

	// Clean up reorder timer
	useEffect(() => {
		return () => {
			if (reorderPersistTimerRef.current != null)
				window.clearTimeout(reorderPersistTimerRef.current);
		};
	}, []);

	// --- Series helper ---

	const ensureSeriesInstancesForMonth = useCallback(
		async (
			series: TaskSeriesRow,
			mStartKey: string,
			mEndKey: string,
			existingKeys: Set<string>,
			skipKeys: Set<string>,
			positionByDate: Map<string, number>,
		) => {
			if (!userId) return;
			const seriesStart = parseDateOnly(series.start_date);
			const monthStartDate = parseDateOnly(mStartKey);
			const monthEndDate = parseDateOnly(mEndKey);
			const seriesEndDate = series.end_date
				? parseDateOnly(series.end_date)
				: null;

			const rangeStart =
				seriesStart > monthStartDate ? seriesStart : monthStartDate;
			const rangeEnd =
				seriesEndDate && seriesEndDate < monthEndDate
					? seriesEndDate
					: monthEndDate;
			if (rangeStart > rangeEnd) return;

			const weeklyDay =
				series.repeat === 'weekly'
					? (series.weekday ?? getDay(seriesStart))
					: null;

			const rows: Array<Record<string, unknown>> = [];
			const seriesStartMinutes = parseSmallInt(
				series.start_minutes ?? null,
			);
			const seriesRemindBefore = parseRemindBefore(
				series.remind_before_minutes ?? 0,
			);

			for (
				let cursor = rangeStart;
				cursor <= rangeEnd;
				cursor = addDays(cursor, 1)
			) {
				const dateKey = formatDateOnly(cursor);
				const key = `${series.id}:${dateKey}`;
				if (existingKeys.has(key) || skipKeys.has(key)) continue;
				if (series.repeat === 'weekly' && weeklyDay != null) {
					if (getDay(cursor) !== weeklyDay) continue;
				}

				const nextPosition = (positionByDate.get(dateKey) ?? -1) + 1;
				positionByDate.set(dateKey, nextPosition);

				rows.push({
					title: series.title,
					duration: series.duration,
					date: dateKey,
					completed: false,
					telegram_id: userId,
					series_id: series.id,
					position: nextPosition,
					start_minutes: seriesStartMinutes,
					remind_before_minutes: seriesRemindBefore,
					remind_at: computeRemindAtIso(
						cursor,
						seriesStartMinutes,
						seriesRemindBefore,
					),
				});
			}

			if (rows.length > 0) {
				const { error } = await runWithAuthRetry(() =>
					supabase.from('tasks').upsert(rows, {
						onConflict: 'series_id,date',
						ignoreDuplicates: true,
					}),
				);
				if (error)
					console.error('Series instance upsert failed', error);
			}
		},
		[userId, runWithAuthRetry],
	);

	// --- Main tasks query ---

	const tasksQuery = useQuery<Task[]>({
		queryKey,
		queryFn: async () => {
			const { data: tasksData, error: tasksError } =
				await runWithAuthRetry(() =>
					supabase
						.from('tasks')
						.select('*')
						.gte('date', monthStartKey)
						.lte('date', monthEndKey)
						.order('date', { ascending: true })
						.order('position', { ascending: true })
						.order('created_at', { ascending: true }),
				);

			if (tasksError || !tasksData) return [];

			const fetchedTasks = tasksData.map((t: TaskRow) => mapTaskRow(t));

			// Merge pending inserts
			const pendingIds = new Set(pendingInsertRef.current.keys());
			if (pendingIds.size > 0) {
				const prev = getTasksSnapshot();
				const pendingTasks = prev.filter(
					(task) =>
						pendingIds.has(task.id) &&
						isDateInMonth(task.date, activeMonthKey),
				);
				if (pendingTasks.length > 0) {
					return [...fetchedTasks, ...pendingTasks];
				}
			}

			// After fetch: ensure series instances
			const existingKeys = new Set<string>();
			const positionByDate = new Map<string, number>();
			tasksData.forEach((row: TaskRow) => {
				const rowDate = row.date;
				const rowPosition = Number(row.position ?? 0);
				positionByDate.set(
					rowDate,
					Math.max(positionByDate.get(rowDate) ?? -1, rowPosition),
				);
				if (row.series_id)
					existingKeys.add(`${row.series_id}:${rowDate}`);
			});

			const { data: skipsData } = await runWithAuthRetry(() =>
				supabase
					.from('task_series_skips')
					.select('series_id,date')
					.gte('date', monthStartKey)
					.lte('date', monthEndKey),
			);

			const skipKeys = new Set(
				(skipsData ?? []).map(
					(skip: TaskSeriesSkipRow) =>
						`${skip.series_id}:${skip.date}`,
				),
			);

			const { data: seriesData } = await runWithAuthRetry(() =>
				supabase
					.from('task_series')
					.select(
						'id,title,duration,repeat,weekday,start_minutes,remind_before_minutes,start_date,end_date',
					)
					.lte('start_date', monthEndKey)
					.or(`end_date.is.null,end_date.gte.${monthStartKey}`),
			);

			for (const series of seriesData ?? []) {
				await ensureSeriesInstancesForMonth(
					series as TaskSeriesRow,
					monthStartKey,
					monthEndKey,
					existingKeys,
					skipKeys,
					positionByDate,
				);
			}

			return fetchedTasks;
		},
		enabled: !!userId,
	});

	const tasks = tasksQuery.data ?? [];

	// --- Realtime subscription ---

	useEffect(() => {
		if (!userId) return;

		const channel = supabase
			.channel(`tasks-${userId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'tasks',
					filter: `telegram_id=eq.${userId}`,
				},
				(payload) => {
					if (payload.eventType === 'INSERT') {
						const row = payload.new as TaskRow;
						if (
							!row?.id ||
							!isDateInMonth(row.date, activeMonthKey)
						)
							return;
						const rowPosition = Number(row.position ?? 0);
						const rowSeriesId = row.series_id ?? null;
						const rowColor =
							normalizeHex(row.color) ?? DEFAULT_TASK_COLOR;
						const rowPinned = row.is_pinned ?? false;
						const rowChecklist = parseChecklist(row.checklist);
						const rowStartMinutes = parseSmallInt(
							row.start_minutes,
						);
						const rowRemindBefore = parseRemindBefore(
							row.remind_before_minutes,
						);

						setTasksCache((prev) => {
							if (prev.some((task) => task.id === row.id))
								return prev;

							let pendingMatchId: string | null = null;
							for (const [
								tempId,
								pending,
							] of pendingInsertRef.current) {
								const pendingColor =
									normalizeHex(pending.color) ??
									DEFAULT_TASK_COLOR;
								const pendingPinned =
									pending.is_pinned ?? false;
								const pendingChecklist = parseChecklist(
									pending.checklist,
								);
								const pendingStartMinutes = parseSmallInt(
									pending.start_minutes,
								);
								const pendingRemindBefore = parseRemindBefore(
									pending.remind_before_minutes,
								);
								if (
									pending.title === row.title &&
									pending.duration === row.duration &&
									pending.date === row.date &&
									pending.completed === row.completed &&
									(pending.position ?? 0) === rowPosition &&
									(pending.series_id ?? null) ===
										rowSeriesId &&
									pendingColor === rowColor &&
									pendingPinned === rowPinned &&
									areChecklistsEqual(
										pendingChecklist,
										rowChecklist,
									) &&
									pendingStartMinutes === rowStartMinutes &&
									pendingRemindBefore === rowRemindBefore
								) {
									pendingMatchId = tempId;
									break;
								}
							}

							if (pendingMatchId) {
								pendingInsertRef.current.delete(pendingMatchId);
								return prev.map((task) =>
									task.id === pendingMatchId
										? mapTaskRow(row, task.clientId)
										: task,
								);
							}

							return [...prev, mapTaskRow(row)];
						});
					}

					if (payload.eventType === 'UPDATE') {
						const row = payload.new as TaskRow;
						if (!row?.id) return;
						const inMonth = isDateInMonth(row.date, activeMonthKey);

						setTasksCache((prev) => {
							const exists = prev.some(
								(task) => task.id === row.id,
							);
							if (inMonth) {
								if (exists) {
									return prev.map((task) =>
										task.id === row.id
											? mapTaskRow(row, task.clientId)
											: task,
									);
								}
								return [...prev, mapTaskRow(row)];
							}
							if (!exists) return prev;
							return prev.filter((task) => task.id !== row.id);
						});
					}

					if (payload.eventType === 'DELETE') {
						const row = payload.old as TaskRow;
						if (!row?.id) return;
						setTasksCache((prev) =>
							prev.filter((task) => task.id !== row.id),
						);
					}
				},
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'task_series',
					filter: `telegram_id=eq.${userId}`,
				},
				() => {
					void queryClient.invalidateQueries({ queryKey });
				},
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'task_series_skips',
					filter: `telegram_id=eq.${userId}`,
				},
				() => {
					void queryClient.invalidateQueries({ queryKey });
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, activeMonthKey]);

	// --- Mutations ---

	const toggleActiveTaskMutation = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await runWithAuthRetry(() =>
				supabase.rpc('toggle_task_timer', { task_id: id }),
			);
			if (error) throw error;
		},
		onMutate: async (id: string) => {
			const snapshot = getTasksSnapshot();
			const target = snapshot.find((t) => t.id === id);
			if (!target || target.completed) return { snapshot };

			const now = Date.now();
			const isTargetActive = Boolean(target.activeStartedAt);

			setTasksCache((prev) =>
				prev.map((task) => {
					if (task.activeStartedAt) {
						const elapsed =
							task.elapsedMs +
							Math.max(0, now - task.activeStartedAt.getTime());
						if (task.id === id) {
							return isTargetActive
								? {
										...task,
										elapsedMs: elapsed,
										activeStartedAt: null,
									}
								: {
										...task,
										elapsedMs: elapsed,
										activeStartedAt: new Date(now),
									};
						}
						return {
							...task,
							elapsedMs: elapsed,
							activeStartedAt: null,
						};
					}
					if (task.id === id && !isTargetActive) {
						return { ...task, activeStartedAt: new Date(now) };
					}
					return task;
				}),
			);

			return { snapshot };
		},
		onError: (_err, _id, context) => {
			if (context?.snapshot) {
				queryClient.setQueryData<Task[]>(queryKey, context.snapshot);
			}
		},
	});

	const toggleTaskMutation = useMutation({
		mutationFn: async ({
			id,
			newStatus,
		}: {
			id: string;
			newStatus: boolean;
		}) => {
			const { error } = await runWithAuthRetry(() =>
				supabase
					.from('tasks')
					.update({ completed: newStatus })
					.eq('id', id),
			);
			if (error) throw error;
		},
		onMutate: async ({
			id,
			newStatus,
		}: {
			id: string;
			newStatus: boolean;
		}) => {
			const snapshot = getTasksSnapshot();
			const target = snapshot.find((t) => t.id === id);
			if (!target) return { snapshot };

			const wasActive = Boolean(target.activeStartedAt);
			const completionElapsed = wasActive
				? target.elapsedMs +
					Math.max(0, Date.now() - target.activeStartedAt!.getTime())
				: target.elapsedMs;

			setTasksCache((prev) =>
				prev.map((task) =>
					task.id === id
						? {
								...task,
								completed: newStatus,
								activeStartedAt: newStatus
									? null
									: task.activeStartedAt,
								elapsedMs: newStatus
									? completionElapsed
									: task.elapsedMs,
							}
						: task,
				),
			);

			return { snapshot };
		},
		onError: (_err, _vars, context) => {
			if (context?.snapshot) {
				queryClient.setQueryData<Task[]>(queryKey, context.snapshot);
			}
		},
	});

	const deleteTaskMutation = useMutation({
		mutationFn: async (task: Task) => {
			if (task.seriesId && userId) {
				const dateKey = formatDateOnly(task.date);
				const { error: skipError } = await runWithAuthRetry(() =>
					supabase.from('task_series_skips').upsert(
						{
							series_id: task.seriesId,
							telegram_id: userId,
							date: dateKey,
						},
						{
							onConflict: 'series_id,date',
							ignoreDuplicates: true,
						},
					),
				);
				if (skipError) throw skipError;

				const { error: deleteError } = await runWithAuthRetry(() =>
					supabase.from('tasks').delete().eq('id', task.id),
				);
				if (deleteError) {
					await runWithAuthRetry(() =>
						supabase
							.from('task_series_skips')
							.delete()
							.eq('series_id', task.seriesId)
							.eq('date', dateKey),
					);
					throw deleteError;
				}
			} else {
				const { error } = await runWithAuthRetry(() =>
					supabase.from('tasks').delete().eq('id', task.id),
				);
				if (error) throw error;
			}
			return task;
		},
		onMutate: async (task: Task) => {
			const snapshot = getTasksSnapshot();
			setTasksCache((prev) => prev.filter((t) => t.id !== task.id));
			return { snapshot };
		},
		onError: (_err, _task, context) => {
			if (context?.snapshot) {
				queryClient.setQueryData<Task[]>(queryKey, context.snapshot);
			}
		},
	});

	// --- Imperative task operations ---

	const toggleActiveTask = useCallback(
		async (id: string) => {
			if (!userId || !isUuid(id)) return;
			const snapshot = getTasksSnapshot();
			const target = snapshot.find((t) => t.id === id);
			if (!target || target.completed) return;
			toggleActiveTaskMutation.mutate(id);
		},
		[userId, getTasksSnapshot, toggleActiveTaskMutation],
	);

	const toggleTask = useCallback(
		async (id: string) => {
			const snapshot = getTasksSnapshot();
			const target = snapshot.find((t) => t.id === id);
			if (!target) return;

			const newStatus = !target.completed;

			if (!isUuid(id)) {
				setTasksCache((prev) =>
					prev.map((task) =>
						task.id === id
							? { ...task, completed: newStatus }
							: task,
					),
				);
				queuePendingMutation(id, { completed: newStatus });
				return;
			}

			toggleTaskMutation.mutate({ id, newStatus });
		},
		[
			getTasksSnapshot,
			setTasksCache,
			queuePendingMutation,
			toggleTaskMutation,
		],
	);

	const deleteTask = useCallback(
		async (id: string): Promise<Task | null> => {
			const snapshot = getTasksSnapshot();
			const taskToDelete = snapshot.find((t) => t.id === id);
			if (!taskToDelete) return null;

			try {
				await deleteTaskMutation.mutateAsync(taskToDelete);
				return taskToDelete;
			} catch {
				return null;
			}
		},
		[getTasksSnapshot, deleteTaskMutation],
	);

	const addTask = useCallback(
		async (
			title: string,
			duration = DEFAULT_DURATION,
			repeat: TaskRepeat = 'none',
			repeatCount = 1,
			color: Task['color'] = DEFAULT_TASK_COLOR,
			startMinutes: number | null = null,
			remindBeforeMinutes = 0,
		) => {
			const trimmedTitle = normalizeTaskTitle(title);
			if (!isTaskTitleValid(trimmedTitle) || !userId) return;

			const normalizedDuration = normalizeTaskDuration(duration);
			const resolvedColor = normalizeHex(color) ?? DEFAULT_TASK_COLOR;
			const normalizedStartMinutes = parseSmallInt(startMinutes);
			const normalizedRemindBefore =
				parseRemindBefore(remindBeforeMinutes);
			const remindAt = computeRemindAtIso(
				selectedDate,
				normalizedStartMinutes,
				normalizedRemindBefore,
			);

			const selectedDateKey = formatDateOnly(selectedDate);
			const currentTasks = getTasksSnapshot();
			const nextPosition =
				currentTasks
					.filter((task) => isSameDay(task.date, selectedDate))
					.reduce(
						(max, task) => Math.max(max, task.position ?? 0),
						-1,
					) + 1;

			if (repeat === 'none') {
				const tempId = Math.random().toString(36).substring(2, 9);
				const pendingRow: TaskRow = {
					id: tempId,
					title: trimmedTitle,
					duration: normalizedDuration,
					date: selectedDateKey,
					completed: false,
					position: nextPosition,
					series_id: null,
					color: resolvedColor,
					is_pinned: false,
					checklist: [],
					start_minutes: normalizedStartMinutes,
					remind_before_minutes: normalizedRemindBefore,
					remind_at: remindAt,
				};
				pendingInsertRef.current.set(tempId, pendingRow);

				const newTask: Task = {
					clientId: tempId,
					id: tempId,
					title: trimmedTitle,
					duration: normalizedDuration,
					date: selectedDate,
					completed: false,
					position: nextPosition,
					seriesId: null,
					elapsedMs: 0,
					activeStartedAt: null,
					color: resolvedColor,
					isPinned: false,
					checklist: [],
					startMinutes: normalizedStartMinutes,
					remindBeforeMinutes: normalizedRemindBefore,
				};

				setTasksCache((prev) => [...prev, newTask]);

				const { data, error } = await runWithAuthRetry(() =>
					supabase
						.from('tasks')
						.insert({
							title: newTask.title,
							duration: newTask.duration,
							date: formatDateOnly(newTask.date),
							completed: false,
							telegram_id: userId,
							position: newTask.position,
							series_id: null,
							color: resolvedColor,
							is_pinned: false,
							checklist: [],
							start_minutes: normalizedStartMinutes,
							remind_before_minutes: normalizedRemindBefore,
							remind_at: remindAt,
						})
						.select()
						.single(),
				);

				pendingInsertRef.current.delete(tempId);

				if (error) {
					console.error('Add task failed', error);
					pendingMutationRef.current.delete(tempId);
					setTasksCache((prev) =>
						prev.filter((t) => t.id !== tempId),
					);
					void queryClient.invalidateQueries({ queryKey });
				} else if (data) {
					setTasksCache((prev) =>
						prev.map((t) =>
							t.id === tempId ? { ...t, id: data.id } : t,
						),
					);
					await flushPendingMutation(tempId, data.id);
				}
				return;
			}

			// Recurring task creation
			const normalizedRepeatCount = Math.max(
				1,
				Math.floor(repeatCount || 1),
			);
			const endDate =
				repeat === 'weekly'
					? addWeeks(selectedDate, normalizedRepeatCount - 1)
					: addDays(selectedDate, normalizedRepeatCount - 1);
			const endDateKey = formatDateOnly(endDate);

			const { data: seriesData, error: seriesError } =
				await runWithAuthRetry(() =>
					supabase
						.from('task_series')
						.insert({
							telegram_id: userId,
							title: trimmedTitle,
							duration: normalizedDuration,
							repeat: repeat === 'daily' ? 'daily' : 'weekly',
							weekday:
								repeat === 'weekly'
									? getDay(selectedDate)
									: null,
							start_date: selectedDateKey,
							end_date: endDateKey,
							start_minutes: normalizedStartMinutes,
							remind_before_minutes: normalizedRemindBefore,
						})
						.select()
						.single(),
				);

			if (seriesError || !seriesData) return;

			const series = seriesData as TaskSeriesRow;
			const seriesId = series.id;
			const tempId = Math.random().toString(36).substring(2, 9);
			const pendingRow: TaskRow = {
				id: tempId,
				title: trimmedTitle,
				duration: normalizedDuration,
				date: selectedDateKey,
				completed: false,
				position: nextPosition,
				series_id: seriesId,
				color: resolvedColor,
				is_pinned: false,
				checklist: [],
				start_minutes: normalizedStartMinutes,
				remind_before_minutes: normalizedRemindBefore,
				remind_at: remindAt,
			};
			pendingInsertRef.current.set(tempId, pendingRow);

			const newTask: Task = {
				clientId: tempId,
				id: tempId,
				title: trimmedTitle,
				duration: normalizedDuration,
				date: selectedDate,
				completed: false,
				position: nextPosition,
				seriesId,
				elapsedMs: 0,
				activeStartedAt: null,
				color: resolvedColor,
				isPinned: false,
				checklist: [],
				startMinutes: normalizedStartMinutes,
				remindBeforeMinutes: normalizedRemindBefore,
			};

			setTasksCache((prev) => [...prev, newTask]);

			const { data, error } = await runWithAuthRetry(() =>
				supabase
					.from('tasks')
					.insert({
						title: newTask.title,
						duration: newTask.duration,
						date: selectedDateKey,
						completed: false,
						telegram_id: userId,
						position: newTask.position,
						series_id: seriesId,
						color: resolvedColor,
						is_pinned: false,
						checklist: [],
						start_minutes: normalizedStartMinutes,
						remind_before_minutes: normalizedRemindBefore,
						remind_at: remindAt,
					})
					.select()
					.single(),
			);

			pendingInsertRef.current.delete(tempId);

			if (error) {
				console.error('Add recurring task instance failed', error);
				pendingMutationRef.current.delete(tempId);
				setTasksCache((prev) => prev.filter((t) => t.id !== tempId));
				await runWithAuthRetry(() =>
					supabase.from('task_series').delete().eq('id', seriesId),
				);
				void queryClient.invalidateQueries({ queryKey });
				return;
			}

			if (data) {
				setTasksCache((prev) =>
					prev.map((t) =>
						t.id === tempId ? { ...t, id: data.id } : t,
					),
				);
				await flushPendingMutation(tempId, data.id);
			}

			const existingKeys = new Set<string>();
			const positionByDate = new Map<string, number>();
			const currentSnapshot = getTasksSnapshot();
			currentSnapshot.forEach((task) => {
				const dateKey = formatDateOnly(task.date);
				positionByDate.set(
					dateKey,
					Math.max(
						positionByDate.get(dateKey) ?? -1,
						task.position ?? 0,
					),
				);
				if (task.seriesId)
					existingKeys.add(`${task.seriesId}:${dateKey}`);
			});
			existingKeys.add(`${seriesId}:${selectedDateKey}`);
			positionByDate.set(
				selectedDateKey,
				Math.max(
					positionByDate.get(selectedDateKey) ?? -1,
					nextPosition,
				),
			);

			void ensureSeriesInstancesForMonth(
				series,
				monthStartKey,
				monthEndKey,
				existingKeys,
				new Set(),
				positionByDate,
			);
		},
		[
			userId,
			selectedDate,
			getTasksSnapshot,
			setTasksCache,
			runWithAuthRetry,
			flushPendingMutation,
			ensureSeriesInstancesForMonth,
			monthStartKey,
			monthEndKey,
			queryClient,
			queryKey,
		],
	);

	const updateTask = useCallback(
		async (id: string, updates: Partial<Task>) => {
			const snapshot = getTasksSnapshot();
			const existingTask = snapshot.find((task) => task.id === id);
			if (!existingTask) return;

			const appliedUpdates: Partial<Task> = {};
			if (updates.title !== undefined) {
				const normalizedTitle = normalizeTaskTitle(updates.title);
				if (!isTaskTitleValid(normalizedTitle)) return;
				appliedUpdates.title = normalizedTitle;
			}
			if (updates.duration !== undefined)
				appliedUpdates.duration = normalizeTaskDuration(
					updates.duration,
				);
			if (updates.color !== undefined)
				appliedUpdates.color =
					normalizeHex(updates.color) ?? DEFAULT_TASK_COLOR;
			if (updates.isPinned !== undefined)
				appliedUpdates.isPinned = updates.isPinned;
			if (updates.checklist !== undefined)
				appliedUpdates.checklist = Array.isArray(updates.checklist)
					? updates.checklist
					: [];
			if (updates.startMinutes !== undefined)
				appliedUpdates.startMinutes = parseSmallInt(
					updates.startMinutes,
				);
			if (updates.remindBeforeMinutes !== undefined)
				appliedUpdates.remindBeforeMinutes = parseRemindBefore(
					updates.remindBeforeMinutes,
				);
			if (updates.date !== undefined) appliedUpdates.date = updates.date;

			if (Object.keys(appliedUpdates).length === 0) return;

			setTasksCache((prev) =>
				prev.map((task) =>
					task.id === id ? { ...task, ...appliedUpdates } : task,
				),
			);

			const dbUpdates: Record<string, unknown> = {};
			if (appliedUpdates.title !== undefined)
				dbUpdates.title = appliedUpdates.title;
			if (appliedUpdates.duration !== undefined)
				dbUpdates.duration = appliedUpdates.duration;
			if (appliedUpdates.color !== undefined)
				dbUpdates.color = appliedUpdates.color;
			if (appliedUpdates.isPinned !== undefined)
				dbUpdates.is_pinned = appliedUpdates.isPinned;
			if (appliedUpdates.checklist !== undefined)
				dbUpdates.checklist = appliedUpdates.checklist;
			if (appliedUpdates.startMinutes !== undefined)
				dbUpdates.start_minutes = appliedUpdates.startMinutes;
			if (appliedUpdates.remindBeforeMinutes !== undefined)
				dbUpdates.remind_before_minutes =
					appliedUpdates.remindBeforeMinutes;
			if (appliedUpdates.date !== undefined)
				dbUpdates.date = formatDateOnly(appliedUpdates.date);

			if (
				appliedUpdates.startMinutes !== undefined ||
				appliedUpdates.remindBeforeMinutes !== undefined ||
				appliedUpdates.date !== undefined
			) {
				const nextDate = appliedUpdates.date ?? existingTask.date;
				const nextStart =
					appliedUpdates.startMinutes ?? existingTask.startMinutes;
				const nextBefore =
					appliedUpdates.remindBeforeMinutes ??
					existingTask.remindBeforeMinutes;
				dbUpdates.remind_at = computeRemindAtIso(
					nextDate,
					nextStart,
					nextBefore,
				);
				dbUpdates.reminder_sent_at = null;
			}

			if (!isUuid(id)) {
				queuePendingMutation(id, dbUpdates);
				return;
			}

			const { error } = await runWithAuthRetry(() =>
				supabase.from('tasks').update(dbUpdates).eq('id', id),
			);

			if (error) {
				console.error('Update task failed', error);
				// Rollback
				setTasksCache((prev) =>
					prev.map((task) => {
						if (task.id !== id) return task;
						const rollback: Partial<Task> = {};
						if (appliedUpdates.title !== undefined)
							rollback.title = existingTask.title;
						if (appliedUpdates.duration !== undefined)
							rollback.duration = existingTask.duration;
						if (appliedUpdates.color !== undefined)
							rollback.color = existingTask.color;
						if (appliedUpdates.isPinned !== undefined)
							rollback.isPinned = existingTask.isPinned;
						if (appliedUpdates.checklist !== undefined)
							rollback.checklist = existingTask.checklist;
						if (appliedUpdates.startMinutes !== undefined)
							rollback.startMinutes = existingTask.startMinutes;
						if (appliedUpdates.remindBeforeMinutes !== undefined)
							rollback.remindBeforeMinutes =
								existingTask.remindBeforeMinutes;
						if (appliedUpdates.date !== undefined)
							rollback.date = existingTask.date;
						return { ...task, ...rollback };
					}),
				);
			}
		},
		[
			getTasksSnapshot,
			setTasksCache,
			queuePendingMutation,
			runWithAuthRetry,
		],
	);

	const moveTask = useCallback(
		async (id: string, nextDateKey: string) => {
			const snapshot = getTasksSnapshot();
			const taskToMove = snapshot.find((task) => task.id === id);
			if (!taskToMove) return;

			const currentDateKey = formatDateOnly(taskToMove.date);
			if (!nextDateKey || nextDateKey === currentDateKey) return;

			const nextPosition =
				snapshot
					.filter(
						(task) =>
							formatDateOnly(task.date) === nextDateKey &&
							task.id !== id,
					)
					.reduce(
						(max, task) => Math.max(max, task.position ?? 0),
						-1,
					) + 1;

			const nextDate = parseDateOnly(nextDateKey);
			const isNextInMonth = isDateInMonth(nextDateKey, activeMonthKey);
			const remindAt = computeRemindAtIso(
				nextDate,
				taskToMove.startMinutes,
				taskToMove.remindBeforeMinutes,
			);
			const updatedTask: Task = {
				...taskToMove,
				date: nextDate,
				position: nextPosition,
				seriesId: taskToMove.seriesId ? null : taskToMove.seriesId,
			};

			setTasksCache((prev) => {
				const next = prev.filter((task) => task.id !== id);
				if (isNextInMonth) next.push(updatedTask);
				return next;
			});

			if (!isUuid(id)) {
				queuePendingMutation(id, {
					date: nextDateKey,
					position: nextPosition,
					series_id: taskToMove.seriesId
						? null
						: (taskToMove.seriesId ?? null),
					remind_at: remindAt,
					reminder_sent_at: null,
				});
				return;
			}

			if (!userId) return;

			if (taskToMove.seriesId) {
				const { error: skipError } = await runWithAuthRetry(() =>
					supabase.from('task_series_skips').upsert(
						{
							series_id: taskToMove.seriesId,
							telegram_id: userId,
							date: currentDateKey,
						},
						{
							onConflict: 'series_id,date',
							ignoreDuplicates: true,
						},
					),
				);

				if (skipError) {
					setTasksCache((prev) => {
						const next = prev.filter((task) => task.id !== id);
						if (isDateInMonth(taskToMove.date, activeMonthKey))
							next.push(taskToMove);
						return next;
					});
					return;
				}
			}

			const { error } = await runWithAuthRetry(() =>
				supabase
					.from('tasks')
					.update({
						date: nextDateKey,
						position: nextPosition,
						series_id: taskToMove.seriesId
							? null
							: (taskToMove.seriesId ?? null),
						remind_at: remindAt,
						reminder_sent_at: null,
					})
					.eq('id', id),
			);

			if (error) {
				setTasksCache((prev) => {
					const next = prev.filter((task) => task.id !== id);
					if (isDateInMonth(taskToMove.date, activeMonthKey))
						next.push(taskToMove);
					return next;
				});
				if (taskToMove.seriesId) {
					await runWithAuthRetry(() =>
						supabase
							.from('task_series_skips')
							.delete()
							.eq('series_id', taskToMove.seriesId)
							.eq('date', currentDateKey),
					);
				}
			}
		},
		[
			userId,
			activeMonthKey,
			getTasksSnapshot,
			setTasksCache,
			queuePendingMutation,
			runWithAuthRetry,
		],
	);

	const restoreTask = useCallback(
		async (task: Task) => {
			if (!userId) return;

			setTasksCache((prev) => [...prev, task]);

			const dateKey = formatDateOnly(task.date);
			let skipRemoved = false;

			if (task.seriesId) {
				const { error: skipError } = await runWithAuthRetry(() =>
					supabase
						.from('task_series_skips')
						.delete()
						.eq('series_id', task.seriesId)
						.eq('date', dateKey),
				);
				skipRemoved = !skipError;
			}

			const remindAt = computeRemindAtIso(
				task.date,
				task.startMinutes,
				task.remindBeforeMinutes,
			);

			const { data, error } = await runWithAuthRetry(() =>
				supabase
					.from('tasks')
					.insert({
						title: task.title,
						duration: task.duration,
						date: dateKey,
						completed: task.completed,
						telegram_id: userId,
						position: task.position ?? 0,
						series_id: task.seriesId ?? null,
						elapsed_ms: task.elapsedMs ?? 0,
						active_started_at: null,
						color: task.color,
						is_pinned: task.isPinned,
						checklist: task.checklist,
						start_minutes: task.startMinutes,
						remind_before_minutes: task.remindBeforeMinutes,
						remind_at: remindAt,
						reminder_sent_at: null,
					})
					.select()
					.single(),
			);

			if (error) {
				setTasksCache((prev) => prev.filter((t) => t.id !== task.id));
				if (task.seriesId && skipRemoved) {
					await runWithAuthRetry(() =>
						supabase.from('task_series_skips').upsert(
							{
								series_id: task.seriesId,
								telegram_id: userId,
								date: dateKey,
							},
							{
								onConflict: 'series_id,date',
								ignoreDuplicates: true,
							},
						),
					);
				}
			} else if (data) {
				setTasksCache((prev) =>
					prev.map((t) =>
						t.id === task.id ? { ...t, id: data.id } : t,
					),
				);
			}
		},
		[userId, setTasksCache, runWithAuthRetry],
	);

	const handleReorder = useCallback(
		(nextOrder: Task[]) => {
			const selectedDateKey = formatDateOnly(selectedDate);
			const positionsById = new Map(
				nextOrder.map((task, index) => [task.id, index]),
			);

			setTasksCache((prev) => {
				if (positionsById.size === 0) return prev;
				return prev.map((task) => {
					if (formatDateOnly(task.date) !== selectedDateKey)
						return task;
					const nextPosition = positionsById.get(task.id);
					if (nextPosition == null || task.position === nextPosition)
						return task;
					return { ...task, position: nextPosition };
				});
			});

			if (!userId || positionsById.size === 0) return;

			const updates = nextOrder
				.filter((task) => isUuid(task.id))
				.map<ReorderTaskUpdate>((task) => ({
					id: task.id,
					title: task.title,
					duration: task.duration,
					date: formatDateOnly(task.date),
					completed: task.completed,
					telegram_id: userId,
					position: positionsById.get(task.id) ?? task.position ?? 0,
				}));

			if (updates.length === 0) return;

			updates.forEach((update) => {
				pendingReorderUpdatesRef.current.set(update.id, update);
			});
			scheduleReorderPersist();
		},
		[userId, selectedDate, setTasksCache, scheduleReorderPersist],
	);

	const refetchTasks = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryClient, userId, monthStartKey, monthEndKey]);

	return {
		tasks,
		isLoading: tasksQuery.isLoading,
		addTask,
		updateTask,
		deleteTask,
		toggleTask,
		moveTask,
		restoreTask,
		handleReorder,
		toggleActiveTask,
		refetchTasks,
		setTasksCache,
	};
}
