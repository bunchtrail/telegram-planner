import { act, renderHook, waitFor } from '@testing-library/react';
import {
	QueryClient,
	QueryClientProvider,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useTasks } from '../app/hooks/useTasks';
import type { TaskRow } from '../app/lib/task-utils';

type Deferred<T> = {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
};

const supabaseState = vi.hoisted(() => ({
	tasksRows: [] as TaskRow[],
	taskSeriesRows: [] as Array<Record<string, unknown>>,
	taskSeriesSkipRows: [] as Array<Record<string, unknown>>,
	updateCalls: [] as Array<{
		table: string;
		values: Record<string, unknown>;
		filters: Array<{ field: string; value: unknown }>;
	}>,
	insertCalls: [] as Array<{
		table: string;
		values: Record<string, unknown>;
	}>,
	taskChangeHandler: null as ((payload: unknown) => void) | null,
	insertDeferred: null as Deferred<{
		data: TaskRow | null;
		error: null;
	}> | null,
}));

vi.mock('../app/lib/supabase', () => {
	const matchesFilters = (
		row: Record<string, unknown>,
		filters: Array<{ field: string; value: unknown }>,
	) => filters.every((filter) => row[filter.field] === filter.value);

	const createBuilder = (table: string) => {
		let mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
		let payload: Record<string, unknown> | null = null;
		const filters: Array<{ field: string; value: unknown }> = [];
		let gteFilter: { field: string; value: string } | null = null;
		let lteFilter: { field: string; value: string } | null = null;
		const orderBy: Array<{ field: string; ascending: boolean }> = [];

		const builder = {
			select: () => builder,
			insert: (values: Record<string, unknown>) => {
				mode = 'insert';
				payload = values;
				return builder;
			},
			update: (values: Record<string, unknown>) => {
				mode = 'update';
				payload = values;
				return builder;
			},
			upsert: (values: Record<string, unknown>) => {
				mode = 'upsert';
				payload = values;
				return builder;
			},
			delete: () => {
				mode = 'delete';
				return builder;
			},
			single: () => builder,
			eq: (field: string, value: unknown) => {
				filters.push({ field, value });
				return builder;
			},
			gte: (field: string, value: string) => {
				gteFilter = { field, value };
				return builder;
			},
			lte: (field: string, value: string) => {
				lteFilter = { field, value };
				return builder;
			},
			or: () => builder,
			order: (field: string, options?: { ascending?: boolean }) => {
				orderBy.push({ field, ascending: options?.ascending !== false });
				return builder;
			},
			then: (
				onFulfilled?: (value: unknown) => unknown,
				onRejected?: (reason: unknown) => unknown,
			) =>
				Promise.resolve().then(async () => {
					if (mode === 'select') {
						const rows =
							table === 'tasks'
								? supabaseState.tasksRows
								: table === 'task_series'
									? supabaseState.taskSeriesRows
									: supabaseState.taskSeriesSkipRows;
						let nextRows = [...rows];
						if (gteFilter) {
							nextRows = nextRows.filter((row) => {
								const value = row[gteFilter.field];
								return typeof value === 'string' && value >= gteFilter.value;
							});
						}
						if (lteFilter) {
							nextRows = nextRows.filter((row) => {
								const value = row[lteFilter.field];
								return typeof value === 'string' && value <= lteFilter.value;
							});
						}
						if (filters.length > 0) {
							nextRows = nextRows.filter((row) =>
								matchesFilters(
									row as Record<string, unknown>,
									filters,
								),
							);
						}
						nextRows.sort((left, right) => {
							for (const rule of orderBy) {
								const a = left[rule.field];
								const b = right[rule.field];
								if (a === b) continue;
								if (a == null) return rule.ascending ? -1 : 1;
								if (b == null) return rule.ascending ? 1 : -1;
								if (a < b) return rule.ascending ? -1 : 1;
								if (a > b) return rule.ascending ? 1 : -1;
							}
							return 0;
						});
						return { data: nextRows, error: null };
					}

					if (mode === 'insert') {
						if (payload) {
							supabaseState.insertCalls.push({
								table,
								values: payload,
							});
						}
						if (table === 'tasks' && supabaseState.insertDeferred) {
							return supabaseState.insertDeferred.promise;
						}
						return {
							data: payload ? ({ id: 'generated-id', ...payload } as TaskRow) : null,
							error: null,
						};
					}

					if (mode === 'update') {
						supabaseState.updateCalls.push({
							table,
							values: payload ?? {},
							filters,
						});
						if (table === 'tasks' && payload) {
							supabaseState.tasksRows = supabaseState.tasksRows.map((row) =>
								matchesFilters(row as Record<string, unknown>, filters)
									? ({ ...row, ...payload } as TaskRow)
									: row,
							);
						}
						return { data: null, error: null };
					}

					if (mode === 'upsert') {
						return { data: payload, error: null };
					}

					return { data: null, error: null };
				}).then(onFulfilled, onRejected),
		};

		return builder;
	};

	const supabase = {
		from: vi.fn((table: string) => createBuilder(table)),
		channel: vi.fn(() => {
			const channel = {
				on: vi.fn(
					(
						_event: string,
						filter: { table?: string },
						callback: (payload: unknown) => void,
					) => {
						if (filter.table === 'tasks') {
							supabaseState.taskChangeHandler = callback;
						}
						return channel;
					},
				),
				subscribe: vi.fn(() => channel),
			};
			return channel;
		}),
		removeChannel: vi.fn(),
		realtime: {
			setAuth: vi.fn(),
		},
		rpc: vi.fn(),
	};

	return {
		supabase,
		setSupabaseAccessToken: vi.fn(),
	};
});

const createDeferred = <T,>(): Deferred<T> => {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

const createTaskRow = (overrides: Partial<TaskRow> = {}): TaskRow => ({
	id: crypto.randomUUID(),
	title: 'Task',
	duration: 30,
	date: '2026-04-17',
	completed: false,
	position: 0,
	series_id: null,
	elapsed_ms: 0,
	active_started_at: null,
	color: '#ff9f0a',
	is_pinned: false,
	checklist: [],
	start_minutes: null,
	remind_before_minutes: 0,
	remind_at: null,
	...overrides,
});

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
};

const renderUseTasks = () =>
	renderHook(
		() =>
			useTasks({
				userId: 'telegram-user',
				monthStartKey: '2026-04-01',
				monthEndKey: '2026-04-30',
				selectedDate: new Date('2026-04-17T00:00:00.000Z'),
				activeMonthKey: '2026-04',
				runWithAuthRetry: async (operation) => await operation(),
			}),
		{ wrapper: createWrapper() },
	);

const getTask = (
	rows: ReturnType<typeof renderUseTasks>['result']['current']['tasks'],
	title: string,
) => {
	const task = rows.find((entry) => entry.title === title);
	expect(task).toBeDefined();
	return task!;
};

const emitTaskInsert = (row: TaskRow) => {
	expect(supabaseState.taskChangeHandler).toBeTypeOf('function');
	supabaseState.taskChangeHandler?.({
		eventType: 'INSERT',
		new: row,
	});
};

beforeEach(() => {
	supabaseState.tasksRows = [];
	supabaseState.taskSeriesRows = [];
	supabaseState.taskSeriesSkipRows = [];
	supabaseState.updateCalls = [];
	supabaseState.insertCalls = [];
	supabaseState.taskChangeHandler = null;
	supabaseState.insertDeferred = null;
});

describe('useTasks ordering', () => {
	test('keeps optimistic temp reorder after realtime insert reconciliation and flushes the new position', async () => {
		supabaseState.tasksRows = [
			createTaskRow({
				id: '11111111-1111-4111-8111-111111111111',
				title: 'Existing task',
				position: 0,
			}),
		];
		supabaseState.insertDeferred = createDeferred();

		const { result } = renderUseTasks();

		await waitFor(() => expect(result.current.tasks).toHaveLength(1));
		await waitFor(() =>
			expect(supabaseState.taskChangeHandler).toBeTypeOf('function'),
		);

		let addTaskPromise!: Promise<void>;
		await act(async () => {
			addTaskPromise = result.current.addTask('Temp task');
		});

		await waitFor(() => expect(result.current.tasks).toHaveLength(2));

		const existingTask = getTask(result.current.tasks, 'Existing task');
		const tempTask = getTask(result.current.tasks, 'Temp task');

		act(() => {
			result.current.handleReorder([tempTask, existingTask]);
		});

		await waitFor(() => {
			expect(getTask(result.current.tasks, 'Temp task').position).toBe(0);
			expect(getTask(result.current.tasks, 'Existing task').position).toBe(1);
		});

		const insertedRow = createTaskRow({
			id: '22222222-2222-4222-8222-222222222222',
			title: 'Temp task',
			position: 1,
		});

		act(() => {
			emitTaskInsert(insertedRow);
		});

		await waitFor(() => {
			const reconciledTask = getTask(result.current.tasks, 'Temp task');
			expect(reconciledTask.id).toBe(insertedRow.id);
			expect(reconciledTask.position).toBe(0);
		});

		await act(async () => {
			supabaseState.insertDeferred?.resolve({
				data: insertedRow,
				error: null,
			});
			await addTaskPromise;
		});

		expect(
			supabaseState.updateCalls.some(
				(call) =>
					call.table === 'tasks' &&
					call.values.position === 0 &&
					call.filters.some(
						(filter) =>
							filter.field === 'id' && filter.value === insertedRow.id,
					),
			),
		).toBe(true);
	});

	test('appends a normal task to the pinned tail when pinning', async () => {
		supabaseState.tasksRows = [
			createTaskRow({
				id: '11111111-1111-4111-8111-111111111111',
				title: 'Pinned first',
				is_pinned: true,
				position: 0,
			}),
			createTaskRow({
				id: '22222222-2222-4222-8222-222222222222',
				title: 'Pinned tail',
				is_pinned: true,
				position: 3,
			}),
			createTaskRow({
				id: '33333333-3333-4333-8333-333333333333',
				title: 'Normal target',
				position: 0,
			}),
		];

		const { result } = renderUseTasks();

		await waitFor(() => expect(result.current.tasks).toHaveLength(3));

		await act(async () => {
			await result.current.updateTask(
				'33333333-3333-4333-8333-333333333333',
				{ isPinned: true },
			);
		});

		const updatedTask = getTask(result.current.tasks, 'Normal target');
		expect(updatedTask.isPinned).toBe(true);
		expect(updatedTask.position).toBe(4);
		expect(
			supabaseState.updateCalls.some(
				(call) =>
					call.values.is_pinned === true &&
					call.values.position === 4 &&
					call.filters.some(
						(filter) =>
							filter.field === 'id' &&
							filter.value === '33333333-3333-4333-8333-333333333333',
					),
			),
		).toBe(true);
	});

	test('appends a pinned task to the normal tail when unpinning', async () => {
		supabaseState.tasksRows = [
			createTaskRow({
				id: '11111111-1111-4111-8111-111111111111',
				title: 'Normal first',
				position: 2,
			}),
			createTaskRow({
				id: '22222222-2222-4222-8222-222222222222',
				title: 'Normal tail',
				position: 7,
			}),
			createTaskRow({
				id: '33333333-3333-4333-8333-333333333333',
				title: 'Pinned target',
				is_pinned: true,
				position: 0,
			}),
		];

		const { result } = renderUseTasks();

		await waitFor(() => expect(result.current.tasks).toHaveLength(3));

		await act(async () => {
			await result.current.updateTask(
				'33333333-3333-4333-8333-333333333333',
				{ isPinned: false },
			);
		});

		const updatedTask = getTask(result.current.tasks, 'Pinned target');
		expect(updatedTask.isPinned).toBe(false);
		expect(updatedTask.position).toBe(8);
	});

	test('pins an active task using the future pinned-group tail position', async () => {
		supabaseState.tasksRows = [
			createTaskRow({
				id: '11111111-1111-4111-8111-111111111111',
				title: 'Pinned first',
				is_pinned: true,
				position: 1,
			}),
			createTaskRow({
				id: '22222222-2222-4222-8222-222222222222',
				title: 'Pinned tail',
				is_pinned: true,
				position: 4,
			}),
			createTaskRow({
				id: '33333333-3333-4333-8333-333333333333',
				title: 'Active target',
				position: 0,
				active_started_at: '2026-04-17T09:00:00.000Z',
			}),
		];

		const { result } = renderUseTasks();

		await waitFor(() => expect(result.current.tasks).toHaveLength(3));

		await act(async () => {
			await result.current.updateTask(
				'33333333-3333-4333-8333-333333333333',
				{ isPinned: true },
			);
		});

		const updatedTask = getTask(result.current.tasks, 'Active target');
		expect(updatedTask.isPinned).toBe(true);
		expect(updatedTask.position).toBe(5);
		expect(updatedTask.activeStartedAt).not.toBeNull();
	});
});
