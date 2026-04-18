import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { POMODORO_FOCUS_MS } from '../app/types/pomodoro';
import { usePomodoro } from '../app/hooks/usePomodoro';

const insertMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());

vi.mock('../app/lib/supabase', () => ({
	supabase: {
		from: fromMock,
	},
	setSupabaseAccessToken: vi.fn(),
}));

describe('usePomodoro', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		insertMock.mockReset();
		fromMock.mockReset();
		fromMock.mockReturnValue({
			insert: insertMock,
		});
		insertMock.mockResolvedValue({
			data: null,
			error: null,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('logs completed focus sessions with the logical session date', async () => {
		const runWithAuthRetry = vi.fn(
			async <T extends { error: unknown }>(operation: () => PromiseLike<T> | T) =>
				await operation(),
		);

		const { result } = renderHook(() =>
			usePomodoro({
				taskId: 'task-1',
				sessionDate: '2026-04-17',
				runWithAuthRetry,
			}),
		);

		act(() => {
			result.current.toggle();
		});

		await act(async () => {
			vi.advanceTimersByTime(POMODORO_FOCUS_MS + 1000);
			await Promise.resolve();
		});

		expect(fromMock).toHaveBeenCalledWith('pomodoro_sessions');
		expect(insertMock).toHaveBeenCalledWith({
			task_id: 'task-1',
			session_date: '2026-04-17',
			duration_minutes: 25,
			type: 'focus',
		});
	});
});
