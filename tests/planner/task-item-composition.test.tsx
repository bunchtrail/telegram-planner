import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Reorder } from 'framer-motion';
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from 'vitest';
import TaskItem from '@/app/components/TaskItem';
import ChecklistEditor from '@/app/components/planner/shared/task/ChecklistEditor';
import TaskCard from '@/app/components/planner/shared/task/TaskCard';
import TaskCardActions from '@/app/components/planner/shared/task/TaskCardActions';
import TaskCardHeader from '@/app/components/planner/shared/task/TaskCardHeader';
import TaskCardMeta from '@/app/components/planner/shared/task/TaskCardMeta';
import type { Task } from '@/app/types/task';

const { impactMock, notificationMock, selectionMock } = vi.hoisted(() => ({
	impactMock: vi.fn(),
	notificationMock: vi.fn(),
	selectionMock: vi.fn(),
}));

vi.mock('@/app/hooks/useHaptic', () => ({
	useHaptic: () => ({
		impact: impactMock,
		notification: notificationMock,
		selection: selectionMock,
	}),
}));

class ResizeObserverStub {
	observe() {}

	unobserve() {}

	disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver;

const createTask = (overrides?: Partial<Task>): Task => ({
	clientId: 'task-1',
	id: 'task-1',
	title: 'Подготовить релиз',
	duration: 45,
	date: new Date('2026-04-17T00:00:00.000Z'),
	completed: false,
	position: 0,
	seriesId: null,
	elapsedMs: 0,
	activeStartedAt: null,
	color: '#ff9f0a',
	isPinned: false,
	checklist: [
		{ text: 'Проверить smoke', done: false },
		{ text: 'Обновить changelog', done: true },
	],
	startMinutes: 9 * 60,
	remindBeforeMinutes: 10,
	...overrides,
});

beforeAll(() => {
	globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;
});

afterAll(() => {
	globalThis.ResizeObserver = originalResizeObserver;
});

beforeEach(() => {
	impactMock.mockReset();
	notificationMock.mockReset();
	selectionMock.mockReset();
});

describe('task item shared composition', () => {
	test('shared task card primitives compose a reusable shell and task-aware meta outside TaskItem', () => {
		const task = createTask({
			elapsedMs: 5 * 60 * 1000,
			isPinned: true,
		});

		render(
			<Reorder.Group axis="y" values={['task-1']} onReorder={() => undefined}>
				<TaskCard
					overlay={<div data-testid="task-overlay">overlay</div>}
					surfaceStyle={{
						background: 'color-mix(in srgb, #ff9f0a 5%, var(--surface))',
					}}
				>
					<TaskCardHeader
						actions={
							<TaskCardActions isDesktop={false} variant="header">
								<button type="button" aria-label="Запустить таймер">
									Старт
								</button>
							</TaskCardActions>
						}
						checkbox={
							<button type="button" aria-label="Отметить задачу выполненной">
								check
							</button>
						}
						isDesktop={false}
						isExpanded={false}
						meta={
							<TaskCardMeta
								isActive={false}
								isDesktop={false}
								isExpanded={false}
								task={task}
								elapsedMs={task.elapsedMs}
							/>
						}
						onToggleExpand={() => undefined}
						title={task.title}
						titleSuffix={<TaskCardHeaderPinProbe />}
					/>
				</TaskCard>
			</Reorder.Group>,
		);

		expect(screen.getByTestId('task-overlay')).toBeInTheDocument();
		expect(
			screen.getByRole('button', {
				name: 'Отметить задачу выполненной',
			}),
		).toBeInTheDocument();
		expect(screen.getByText(task.title)).toBeInTheDocument();
		expect(screen.getByTestId('pin-probe')).toBeInTheDocument();
		expect(screen.getByText('09:00')).toBeInTheDocument();
		expect(screen.getByText('45 мин')).toBeInTheDocument();
		expect(screen.getByText('1/2')).toBeInTheDocument();
		expect(screen.getByText('Факт: 5:00')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Запустить таймер' }),
		).toBeInTheDocument();
	});

	test('ChecklistEditor updates checklist state through its callbacks', async () => {
		const user = userEvent.setup();
		const onAddItem = vi.fn();
		const onDeleteItem = vi.fn();
		const onToggleItem = vi.fn();

		render(
			<ChecklistEditor
				items={createTask().checklist}
				onAddItem={onAddItem}
				onDeleteItem={onDeleteItem}
				onToggleItem={onToggleItem}
				reduceMotion
				taskColor="#ff9f0a"
				taskId="task-1"
			/>,
		);

		await user.click(
			screen.getByRole('button', {
				name: 'Переключить шаг Проверить smoke',
			}),
		);
		await user.click(
			screen.getByRole('button', { name: /Удалить шаг Проверить smoke/i }),
		);
		await user.type(
			screen.getByRole('textbox', { name: 'Добавить шаг' }),
			'Сверить аналитику',
		);
		await user.click(screen.getByRole('button', { name: 'Добавить шаг' }));

		expect(onToggleItem).toHaveBeenCalledWith(0);
		expect(onDeleteItem).toHaveBeenCalledWith(0);
		expect(onAddItem).toHaveBeenCalledWith('Сверить аналитику');
	});

	test('TaskItem keeps timer, move, checklist and delete interactions wired through shared blocks', async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		const onEdit = vi.fn();
		const onMove = vi.fn();
		const onToggle = vi.fn();
		const onToggleActive = vi.fn();
		const updateTask = vi.fn();
		const task = createTask();

		render(
			<Reorder.Group
				axis="y"
				values={[task.clientId]}
				onReorder={() => undefined}
			>
				<TaskItem
					task={task}
					onDelete={onDelete}
					onEdit={onEdit}
					onMove={onMove}
					onToggle={onToggle}
					onToggleActive={onToggleActive}
					updateTask={updateTask}
				/>
			</Reorder.Group>,
		);

		await user.click(screen.getByRole('button', { name: 'Запустить таймер' }));
		await user.click(screen.getByRole('button', { name: 'Открыть задачу Подготовить релиз' }));
		await user.click(screen.getByRole('button', { name: 'Перенести на завтра' }));
		await user.click(
			screen.getByRole('button', {
				name: 'Переключить шаг Проверить smoke',
			}),
		);
		await user.type(
			screen.getByRole('textbox', { name: 'Добавить шаг' }),
			'Согласовать релиз',
		);
		await user.click(screen.getAllByRole('button', { name: 'Добавить шаг' })[0]);
		await user.click(screen.getByRole('button', { name: 'Удалить задачу' }));

		expect(onToggleActive).toHaveBeenCalledWith(task.id);
		expect(onMove).toHaveBeenCalledWith(task.id, '2026-04-18');
		expect(updateTask).toHaveBeenNthCalledWith(1, task.id, {
			checklist: [
				{ text: 'Проверить smoke', done: true },
				{ text: 'Обновить changelog', done: true },
			],
		});
		expect(updateTask).toHaveBeenNthCalledWith(2, task.id, {
			checklist: [
				{ text: 'Проверить smoke', done: false },
				{ text: 'Обновить changelog', done: true },
				{ text: 'Согласовать релиз', done: false },
			],
		});
		expect(onDelete).toHaveBeenCalledWith(task.id);
		expect(onEdit).not.toHaveBeenCalled();
		expect(onToggle).not.toHaveBeenCalled();
	});

	test('TaskItem hides collapsed details from accessible queries until expanded', async () => {
		const user = userEvent.setup();
		const task = createTask();

		renderTaskItem(task);

		expect(
			screen.queryByRole('textbox', { name: 'Добавить шаг' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Перенести на завтра' }),
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole('button', {
				name: 'Открыть задачу Подготовить релиз',
			}),
		);

		expect(
			screen.getByRole('textbox', { name: 'Добавить шаг' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Перенести на завтра' }),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole('button', {
				name: 'Открыть задачу Подготовить релиз',
			}),
		);

		expect(
			screen.queryByRole('textbox', { name: 'Добавить шаг' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Перенести на завтра' }),
		).not.toBeInTheDocument();
	});

	test('desktop completed task keeps delete action available while drag handle stays out of the accessibility tree', async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		const task = createTask({ completed: true });

		renderTaskItem(task, {
			isDesktop: true,
			onDelete,
		});

		expect(
			screen.queryByRole('button', { name: 'Перетащить' }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole('button', {
				name: 'Удалить задачу',
			}),
		);
		await user.click(screen.getByRole('button', { name: 'Удалить задачу' }));

		expect(onDelete).toHaveBeenCalledWith(task.id);
	});

	test('desktop header actions keep hover behavior and add keyboard-visible styles', () => {
		const task = createTask();

		renderTaskItem(task, {
			isDesktop: true,
		});

		expect(
			screen.getByRole('button', { name: 'Изменить задачу' }),
		).toHaveClass(
			'opacity-0',
			'group-hover:opacity-100',
			'group-focus-within:opacity-100',
			'focus-visible:opacity-100',
		);
		expect(
			screen.getByRole('button', { name: 'Перенести на завтра' }),
		).toHaveClass(
			'opacity-0',
			'group-hover:opacity-100',
			'group-focus-within:opacity-100',
			'focus-visible:opacity-100',
		);
		expect(
			screen.getByRole('button', { name: 'Удалить задачу' }),
		).toHaveClass(
			'opacity-0',
			'group-hover:opacity-100',
			'group-focus-within:opacity-100',
			'focus-visible:opacity-100',
		);
	});
});

function TaskCardHeaderPinProbe() {
	return <span data-testid="pin-probe">pin</span>;
}

function renderTaskItem(task: Task, overrides?: Partial<ComponentProps<typeof TaskItem>>) {
	const props: ComponentProps<typeof TaskItem> = {
		task,
		onDelete: vi.fn(),
		onEdit: vi.fn(),
		onMove: vi.fn(),
		onToggle: vi.fn(),
		onToggleActive: vi.fn(),
		updateTask: vi.fn(),
		...overrides,
	};

	return render(
		<Reorder.Group axis="y" values={[task.clientId]} onReorder={() => undefined}>
			<TaskItem {...props} />
		</Reorder.Group>,
	);
}
