import { useCallback, useMemo, useRef, useState } from 'react';
import { addDays, startOfDay, startOfWeek } from 'date-fns';
import { DEFAULT_TASK_COLOR } from '../lib/constants';
import {
	DEFAULT_DURATION,
	formatDateOnly,
	isTaskTitleValid,
	normalizeHex,
	normalizeTaskDuration,
	normalizeTaskTitle,
	parseDateOnly,
	parseRemindBefore,
	parseSmallInt,
} from '../lib/task-utils';
import type { PomodoroWeeklyStats } from './usePomodoroStats';
import type { Habit, HabitLog } from '../types/habit';
import type { Task, TaskRepeat } from '../types/task';

export const DEV_PLANNER_MOCK_USER_ID = 'dev-mock-user';

type DevPlannerMockState = {
	tasks: Task[];
	habits: Habit[];
	logs: HabitLog[];
};

type SeedTaskInput = {
	title: string;
	date: Date;
	duration: number;
	color: string;
	completed?: boolean;
	elapsedMs?: number;
	activeStartedAt?: Date | null;
	checklist?: Task['checklist'];
	startMinutes?: number | null;
};

const TASK_COLORS = {
	blue: '#3b82f6',
	orange: '#ff9f0a',
	green: '#34c759',
	yellow: '#facc15',
	purple: '#af52de',
	red: '#ef4444',
};

const buildHabitLogKey = (habitId: string, date: string) =>
	`${habitId}:${date}`;

export const createDevPlannerMockState = (
	anchorDate: Date = new Date(),
	now: Date = new Date(),
): DevPlannerMockState => {
	const today = startOfDay(anchorDate);
	const weekStart = startOfWeek(today, { weekStartsOn: 1 });
	const positionsByDate = new Map<string, number>();
	let taskIndex = 0;

	const nextPosition = (date: Date) => {
		const key = formatDateOnly(date);
		const next = positionsByDate.get(key) ?? 0;
		positionsByDate.set(key, next + 1);
		return next;
	};

	const createTask = (input: SeedTaskInput): Task => {
		const id = `mock-task-${String(taskIndex + 1).padStart(2, '0')}`;
		taskIndex += 1;

		return {
			clientId: id,
			id,
			title: input.title,
			duration: input.duration,
			date: input.date,
			completed: input.completed ?? false,
			position: nextPosition(input.date),
			seriesId: null,
			elapsedMs: input.elapsedMs ?? 0,
			activeStartedAt: input.activeStartedAt ?? null,
			color: input.color,
			isPinned: false,
			checklist: input.checklist ?? [],
			startMinutes: input.startMinutes ?? null,
			remindBeforeMinutes: 0,
		};
	};

	const tasks: Task[] = [
		createTask({
			title: 'Разобрать входящие',
			date: addDays(weekStart, 0),
			duration: 25,
			color: TASK_COLORS.blue,
			completed: true,
			startMinutes: 9 * 60,
		}),
		createTask({
			title: 'Проверить метрики',
			date: addDays(weekStart, 1),
			duration: 30,
			color: TASK_COLORS.green,
			startMinutes: 11 * 60,
		}),
		createTask({
			title: 'Синк с командой',
			date: addDays(weekStart, 2),
			duration: 45,
			color: TASK_COLORS.blue,
			startMinutes: 12 * 60,
		}),
		createTask({
			title: 'Брифинг продукта',
			date: addDays(weekStart, 2),
			duration: 20,
			color: TASK_COLORS.yellow,
			completed: true,
			startMinutes: 16 * 60,
		}),
		createTask({
			title: 'Подготовить презентацию Q2',
			date: today,
			duration: 60,
			color: TASK_COLORS.blue,
			elapsedMs: 42 * 60_000,
			activeStartedAt: new Date(now.getTime() - 18_000),
			checklist: [
				{ text: 'Собрать метрики', done: true },
				{ text: 'Обновить графики', done: true },
				{ text: 'Проверить выводы', done: false },
				{ text: 'Согласовать финал', done: false },
				{ text: 'Отправить PDF', done: false },
			],
			startMinutes: 9 * 60,
		}),
		createTask({
			title: 'Позвонить клиенту',
			date: today,
			duration: 30,
			color: TASK_COLORS.orange,
			startMinutes: 10 * 60,
		}),
		createTask({
			title: 'Написать статью',
			date: today,
			duration: 90,
			color: TASK_COLORS.green,
			checklist: [
				{ text: 'План', done: true },
				{ text: 'Черновик', done: true },
				{ text: 'Редактура', done: false },
				{ text: 'Обложка', done: false },
			],
			startMinutes: 11 * 60,
		}),
		createTask({
			title: 'Тренировка',
			date: today,
			duration: 60,
			color: TASK_COLORS.blue,
			startMinutes: 12 * 60 + 30,
		}),
		createTask({
			title: 'Изучить отчёт',
			date: today,
			duration: 45,
			color: TASK_COLORS.yellow,
			checklist: [
				{ text: 'Открыть отчёт', done: true },
				{ text: 'Выписать риски', done: false },
				{ text: 'Сформировать вопросы', done: false },
			],
			startMinutes: 14 * 60,
		}),
		createTask({
			title: 'Планирование недели',
			date: today,
			duration: 30,
			color: TASK_COLORS.purple,
			checklist: [
				{ text: 'Личные дела', done: false },
				{ text: 'Рабочие блоки', done: false },
			],
			startMinutes: 16 * 60,
		}),
		createTask({
			title: 'Разобрать почту',
			date: today,
			duration: 30,
			color: TASK_COLORS.green,
			completed: true,
			checklist: [
				{ text: 'Входящие', done: true },
				{ text: 'Ответы', done: true },
				{ text: 'Архив', done: true },
			],
			startMinutes: 8 * 60,
		}),
		createTask({
			title: 'Утренняя разминка',
			date: today,
			duration: 15,
			color: TASK_COLORS.green,
			completed: true,
			startMinutes: 8 * 60 + 30,
		}),
		createTask({
			title: 'Прочитать новости',
			date: today,
			duration: 20,
			color: TASK_COLORS.green,
			completed: true,
			checklist: [
				{ text: 'Главное', done: true },
				{ text: 'Сохранить ссылки', done: true },
			],
			startMinutes: 9 * 60 + 15,
		}),
		createTask({
			title: 'Кофе-брейк',
			date: today,
			duration: 15,
			color: TASK_COLORS.green,
			completed: true,
			startMinutes: 10 * 60 + 30,
		}),
		createTask({
			title: 'Дизайн-ревью',
			date: addDays(today, 1),
			duration: 40,
			color: TASK_COLORS.purple,
			startMinutes: 13 * 60,
		}),
		createTask({
			title: 'Итоги недели',
			date: addDays(today, 2),
			duration: 30,
			color: TASK_COLORS.red,
			startMinutes: 18 * 60,
		}),
	];

	const habits: Habit[] = [
		{
			id: 'mock-habit-water',
			name: 'Вода',
			icon: '💧',
			color: TASK_COLORS.blue,
			sortOrder: 0,
			archived: false,
		},
		{
			id: 'mock-habit-reading',
			name: 'Чтение',
			icon: '📖',
			color: TASK_COLORS.green,
			sortOrder: 1,
			archived: false,
		},
		{
			id: 'mock-habit-training',
			name: 'Тренировка',
			icon: '🏃',
			color: TASK_COLORS.orange,
			sortOrder: 2,
			archived: false,
		},
		{
			id: 'mock-habit-meditation',
			name: 'Медитация',
			icon: '🧘',
			color: TASK_COLORS.purple,
			sortOrder: 3,
			archived: false,
		},
		{
			id: 'mock-habit-sleep',
			name: 'Сон до 23:30',
			icon: '😴',
			color: TASK_COLORS.red,
			sortOrder: 4,
			archived: false,
		},
	];

	const logPlan: Array<{ habitId: string; dayOffsets: number[] }> = [
		{ habitId: 'mock-habit-water', dayOffsets: [0, 1, 2, 3, 4] },
		{ habitId: 'mock-habit-reading', dayOffsets: [0, 2, 4] },
		{ habitId: 'mock-habit-training', dayOffsets: [1, 3] },
		{ habitId: 'mock-habit-meditation', dayOffsets: [0, 1, 2, 4] },
		{ habitId: 'mock-habit-sleep', dayOffsets: [2, 3] },
	];

	const logs = logPlan.flatMap(({ habitId, dayOffsets }) =>
		dayOffsets.map((offset) => {
			const date = formatDateOnly(addDays(weekStart, offset));
			return {
				id: `mock-log-${habitId}-${date}`,
				habitId,
				date,
			};
		}),
	);

	return { tasks, habits, logs };
};

type UseDevPlannerMockConfig = {
	selectedDate: Date;
};

const createMockTaskId = (nextId: number) => `mock-task-new-${nextId}`;
const createMockHabitId = (nextId: number) => `mock-habit-new-${nextId}`;

export function useDevPlannerMock({ selectedDate }: UseDevPlannerMockConfig) {
	const idCounterRef = useRef(1_000);
	const [state, setState] = useState(() => createDevPlannerMockState());

	const setTasksCache = useCallback((updater: (prev: Task[]) => Task[]) => {
		setState((prev) => ({ ...prev, tasks: updater(prev.tasks) }));
	}, []);

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
			if (!isTaskTitleValid(trimmedTitle)) return;

			const normalizedDuration = normalizeTaskDuration(duration);
			const resolvedColor = normalizeHex(color) ?? DEFAULT_TASK_COLOR;
			const normalizedStartMinutes = parseSmallInt(startMinutes);
			const normalizedRemindBefore =
				parseRemindBefore(remindBeforeMinutes);
			const normalizedRepeatCount = Math.max(
				1,
				Math.floor(repeatCount || 1),
			);
			const instanceCount =
				repeat === 'none' ? 1 : normalizedRepeatCount;

			setState((prev) => {
				const nextTasks = [...prev.tasks];

				for (let index = 0; index < instanceCount; index += 1) {
					const taskDate =
						repeat === 'weekly'
							? addDays(selectedDate, index * 7)
							: addDays(selectedDate, index);
					const dateKey = formatDateOnly(taskDate);
					const nextPosition =
						nextTasks
							.filter((task) => formatDateOnly(task.date) === dateKey)
							.reduce(
								(max, task) =>
									Math.max(max, task.position ?? 0),
								-1,
							) + 1;
					const id = createMockTaskId(idCounterRef.current);
					idCounterRef.current += 1;

					nextTasks.push({
						clientId: id,
						id,
						title: trimmedTitle,
						duration: normalizedDuration,
						date: taskDate,
						completed: false,
						position: nextPosition,
						seriesId: repeat === 'none' ? null : `mock-series-${id}`,
						elapsedMs: 0,
						activeStartedAt: null,
						color: resolvedColor,
						isPinned: false,
						checklist: [],
						startMinutes: normalizedStartMinutes,
						remindBeforeMinutes: normalizedRemindBefore,
					});
				}

				return { ...prev, tasks: nextTasks };
			});
		},
		[selectedDate],
	);

	const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
		setState((prev) => {
			const existingTask = prev.tasks.find((task) => task.id === id);
			if (!existingTask) return prev;

			const appliedUpdates: Partial<Task> = {};
			if (updates.title !== undefined) {
				const normalizedTitle = normalizeTaskTitle(updates.title);
				if (!isTaskTitleValid(normalizedTitle)) return prev;
				appliedUpdates.title = normalizedTitle;
			}
			if (updates.duration !== undefined) {
				appliedUpdates.duration = normalizeTaskDuration(
					updates.duration,
				);
			}
			if (updates.color !== undefined) {
				appliedUpdates.color =
					normalizeHex(updates.color) ?? existingTask.color;
			}
			if (updates.isPinned !== undefined) {
				appliedUpdates.isPinned = updates.isPinned;
			}
			if (updates.checklist !== undefined) {
				appliedUpdates.checklist = Array.isArray(updates.checklist)
					? updates.checklist
					: [];
			}
			if (updates.startMinutes !== undefined) {
				appliedUpdates.startMinutes = parseSmallInt(
					updates.startMinutes,
				);
			}
			if (updates.remindBeforeMinutes !== undefined) {
				appliedUpdates.remindBeforeMinutes = parseRemindBefore(
					updates.remindBeforeMinutes,
				);
			}
			if (updates.date !== undefined) {
				appliedUpdates.date = updates.date;
			}
			if (updates.completed !== undefined) {
				appliedUpdates.completed = updates.completed;
				if (updates.completed) appliedUpdates.activeStartedAt = null;
			}

			return {
				...prev,
				tasks: prev.tasks.map((task) =>
					task.id === id ? { ...task, ...appliedUpdates } : task,
				),
			};
		});
	}, []);

	const toggleTask = useCallback(async (id: string) => {
		const now = Date.now();
		setState((prev) => ({
			...prev,
			tasks: prev.tasks.map((task) => {
				if (task.id !== id) return task;
				const nextCompleted = !task.completed;
				const elapsedMs =
					nextCompleted && task.activeStartedAt
						? task.elapsedMs +
							Math.max(0, now - task.activeStartedAt.getTime())
						: task.elapsedMs;

				return {
					...task,
					completed: nextCompleted,
					elapsedMs,
					activeStartedAt: nextCompleted
						? null
						: task.activeStartedAt,
				};
			}),
		}));
	}, []);

	const deleteTask = useCallback(async (id: string): Promise<Task | null> => {
		let deletedTask: Task | null = null;
		setState((prev) => {
			deletedTask = prev.tasks.find((task) => task.id === id) ?? null;
			if (!deletedTask) return prev;
			return {
				...prev,
				tasks: prev.tasks.filter((task) => task.id !== id),
			};
		});
		return deletedTask;
	}, []);

	const restoreTask = useCallback(async (task: Task) => {
		setState((prev) => {
			if (prev.tasks.some((current) => current.id === task.id))
				return prev;
			return { ...prev, tasks: [...prev.tasks, task] };
		});
	}, []);

	const moveTask = useCallback(async (id: string, nextDateKey: string) => {
		if (!nextDateKey) return;
		const nextDate = parseDateOnly(nextDateKey);

		setState((prev) => {
			const taskToMove = prev.tasks.find((task) => task.id === id);
			if (!taskToMove) return prev;
			if (formatDateOnly(taskToMove.date) === nextDateKey) return prev;

			const nextPosition =
				prev.tasks
					.filter(
						(task) =>
							task.id !== id &&
							formatDateOnly(task.date) === nextDateKey,
					)
					.reduce(
						(max, task) => Math.max(max, task.position ?? 0),
						-1,
					) + 1;

			return {
				...prev,
				tasks: prev.tasks.map((task) =>
					task.id === id
						? {
								...task,
								date: nextDate,
								position: nextPosition,
								seriesId: null,
							}
						: task,
				),
			};
		});
	}, []);

	const handleReorder = useCallback(
		(nextOrder: Task[]) => {
			const selectedDateKey = formatDateOnly(selectedDate);
			const positionsById = new Map(
				nextOrder.map((task, index) => [task.id, index]),
			);
			if (positionsById.size === 0) return;

			setState((prev) => ({
				...prev,
				tasks: prev.tasks.map((task) => {
					if (formatDateOnly(task.date) !== selectedDateKey)
						return task;
					const nextPosition = positionsById.get(task.id);
					if (nextPosition == null) return task;
					return { ...task, position: nextPosition };
				}),
			}));
		},
		[selectedDate],
	);

	const toggleActiveTask = useCallback(async (id: string) => {
		const now = Date.now();

		setState((prev) => {
			const target = prev.tasks.find((task) => task.id === id);
			if (!target || target.completed) return prev;
			const targetIsActive = Boolean(target.activeStartedAt);

			return {
				...prev,
				tasks: prev.tasks.map((task) => {
					if (task.activeStartedAt) {
						const elapsedMs =
							task.elapsedMs +
							Math.max(0, now - task.activeStartedAt.getTime());
						if (task.id === id) {
							return targetIsActive
								? {
										...task,
										elapsedMs,
										activeStartedAt: null,
									}
								: {
										...task,
										elapsedMs,
										activeStartedAt: new Date(now),
									};
						}
						return { ...task, elapsedMs, activeStartedAt: null };
					}

					if (task.id === id && !targetIsActive) {
						return { ...task, activeStartedAt: new Date(now) };
					}

					return task;
				}),
			};
		});
	}, []);

	const refetchTasks = useCallback(() => undefined, []);
	const clearSyncError = useCallback(() => undefined, []);

	const addHabit = useCallback((name: string, icon: string, color: string) => {
		const trimmedName = name.trim();
		if (!trimmedName) return;

		setState((prev) => {
			const id = createMockHabitId(idCounterRef.current);
			idCounterRef.current += 1;
			const newHabit: Habit = {
				id,
				name: trimmedName,
				icon: icon.trim() || '✨',
				color: normalizeHex(color) ?? DEFAULT_TASK_COLOR,
				sortOrder: prev.habits.length,
				archived: false,
			};

			return { ...prev, habits: [...prev.habits, newHabit] };
		});
	}, []);

	const deleteHabit = useCallback((habitId: string) => {
		setState((prev) => ({
			...prev,
			habits: prev.habits.filter((habit) => habit.id !== habitId),
			logs: prev.logs.filter((log) => log.habitId !== habitId),
		}));
	}, []);

	const toggleHabitLog = useCallback((habitId: string, date: string) => {
		setState((prev) => {
			const existingLog = prev.logs.find(
				(log) => log.habitId === habitId && log.date === date,
			);
			if (existingLog) {
				return {
					...prev,
					logs: prev.logs.filter((log) => log.id !== existingLog.id),
				};
			}

			return {
				...prev,
				logs: [
					...prev.logs,
					{
						id: `mock-log-${habitId}-${date}-${Date.now()}`,
						habitId,
						date,
					},
				],
			};
		});
	}, []);

	const habitLogsIndex = useMemo(
		() =>
			new Set(
				state.logs.map((log) => buildHabitLogKey(log.habitId, log.date)),
			),
		[state.logs],
	);

	const isHabitChecked = useCallback(
		(habitId: string, date: string) =>
			habitLogsIndex.has(buildHabitLogKey(habitId, date)),
		[habitLogsIndex],
	);

	const isHabitLogPending = useCallback(() => false, []);

	const pomodoroStats = useMemo<PomodoroWeeklyStats>(() => {
		const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
		const days = Array.from({ length: 7 }, (_, index) => ({
			date: formatDateOnly(addDays(weekStart, index)),
			pomodoros: [1, 0, 2, 1, 2, 0, 0][index] ?? 0,
		}));
		const totalPomodoros = days.reduce(
			(sum, day) => sum + day.pomodoros,
			0,
		);
		const totalFocusMinutes = totalPomodoros * 25;

		return {
			totalPomodoros,
			totalFocusMinutes,
			totalFocusHours: totalFocusMinutes / 60,
			days,
		};
	}, [selectedDate]);

	return {
		tasks: state.tasks,
		habits: state.habits,
		logs: state.logs,
		streak: 12,
		pomodoroStats,
		isLoading: false,
		isSyncing: false,
		syncError: null as string | null,
		clearSyncError,
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
		recurringTasks: [],
		recurringSkips: [],
		fetchRecurringTasks: refetchTasks,
		deleteTaskSeries: async () => undefined,
		skipTaskSeriesDate: async () => undefined,
		addHabit,
		deleteHabit,
		toggleHabitLog,
		isHabitChecked,
		isHabitLogPending,
	};
}
