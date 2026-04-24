import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vitest';
import DesktopTaskList from '../../app/components/planner/desktop/DesktopTaskList';
import type { Task } from '../../app/types/task';

const selectedDate = new Date('2026-04-24T12:00:00.000Z');

const createTask = (overrides: Partial<Task>): Task => ({
	clientId: overrides.id ?? 'task-1',
	id: overrides.id ?? 'task-1',
	title: overrides.title ?? 'Задача',
	duration: overrides.duration ?? 30,
	date: selectedDate,
	completed: false,
	position: 0,
	seriesId: null,
	elapsedMs: 0,
	activeStartedAt: null,
	color: '#3b82f6',
	isPinned: false,
	checklist: [],
	startMinutes: null,
	remindBeforeMinutes: 0,
	...overrides,
});

const renderDesktopTaskList = (
	overrides: Partial<ComponentProps<typeof DesktopTaskList>> = {},
) => {
	const props: ComponentProps<typeof DesktopTaskList> = {
		dateKey: '2026-04-24',
		tasks: [
			createTask({
				id: 'active-task',
				title: 'Подготовить презентацию Q2',
				duration: 60,
				elapsedMs: 42 * 60_000,
				activeStartedAt: new Date('2026-04-24T09:42:00.000Z'),
				checklist: [
					{ text: 'Один', done: true },
					{ text: 'Два', done: false },
				],
				startMinutes: 9 * 60,
			}),
			createTask({
				id: 'plan-task',
				title: 'Тренировка',
				duration: 60,
				position: 1,
				startMinutes: 12 * 60 + 30,
			}),
			createTask({
				id: 'done-task',
				title: 'Разобрать почту',
				completed: true,
				position: 2,
				startMinutes: 8 * 60,
			}),
		],
		onToggle: vi.fn(),
		onDelete: vi.fn(),
		onEdit: vi.fn(),
		onMove: vi.fn(),
		onAdd: vi.fn(),
		onReorder: vi.fn(),
		onToggleActive: vi.fn(),
		updateTask: vi.fn(),
		onQuickAdd: vi.fn(),
		...overrides,
	};

	return {
		props,
		...render(<DesktopTaskList {...props} />),
	};
};

describe('DesktopTaskList', () => {
	test('renders the mockup-style task board columns', () => {
		renderDesktopTaskList();

		const now = screen.getByRole('region', { name: 'Сейчас' });
		const plan = screen.getByRole('region', { name: 'План' });
		const done = screen.getByRole('region', { name: 'Готово' });

		expect(within(now).getByText('Подготовить презентацию Q2')).toBeInTheDocument();
		expect(within(plan).getByText('Тренировка')).toBeInTheDocument();
		expect(within(done).getByText('Разобрать почту')).toBeInTheDocument();
		expect(screen.getByLabelText('Новая задача')).toBeInTheDocument();
	});

	test('submits quick add with the mockup defaults', () => {
		const onQuickAdd = vi.fn();
		renderDesktopTaskList({ onQuickAdd });

		fireEvent.change(screen.getByLabelText('Новая задача'), {
			target: { value: 'Новая проверка' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

		expect(onQuickAdd).toHaveBeenCalledWith(
			'Новая проверка',
			45,
			'none',
			1,
			'#3b82f6',
			570,
			0,
		);
	});
});
