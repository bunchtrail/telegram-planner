import { describe, expect, test } from 'vitest';
import { createDevPlannerMockState } from '../app/hooks/useDevPlannerMock';
import { formatDateOnly } from '../app/lib/task-utils';

describe('createDevPlannerMockState', () => {
	test('seeds visible tasks and habits for the local dev browser', () => {
		const state = createDevPlannerMockState(
			new Date(2026, 3, 24),
			new Date(2026, 3, 24, 10, 42, 18),
		);
		const selectedDateKey = '2026-04-24';

		const selectedDateTasks = state.tasks.filter(
			(task) => formatDateOnly(task.date) === selectedDateKey,
		);

		expect(selectedDateTasks.length).toBeGreaterThan(6);
		expect(
			selectedDateTasks.some(
				(task) =>
					task.title === 'Подготовить презентацию Q2' &&
					task.activeStartedAt &&
					!task.completed,
			),
		).toBe(true);
		expect(state.habits.map((habit) => habit.name)).toContain('Вода');
		expect(
			state.logs.some(
				(log) =>
					log.habitId === 'mock-habit-water' &&
					log.date === selectedDateKey,
			),
		).toBe(true);
	});
});
