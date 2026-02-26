import { useCallback, useEffect, useRef, useState } from 'react';
import {
	type PomodoroPhase,
	type PomodoroState,
	POMODORO_FOCUS_MS,
	POMODORO_SHORT_BREAK_MS,
	POMODORO_LONG_BREAK_MS,
	POMODOROS_BEFORE_LONG_BREAK,
} from '../types/pomodoro';
import { supabase } from '../lib/supabase';
import type { SupabaseErrorLike } from '../lib/task-utils';

const phaseDuration = (phase: PomodoroPhase): number => {
	switch (phase) {
		case 'focus':
			return POMODORO_FOCUS_MS;
		case 'short_break':
			return POMODORO_SHORT_BREAK_MS;
		case 'long_break':
			return POMODORO_LONG_BREAK_MS;
	}
};

const phaseLabel = (phase: PomodoroPhase): string => {
	switch (phase) {
		case 'focus':
			return 'Фокус';
		case 'short_break':
			return 'Перерыв';
		case 'long_break':
			return 'Длинный перерыв';
	}
};

type UsePomodoroConfig = {
	taskId?: string;
	runWithAuthRetry: <
		T extends { error: SupabaseErrorLike | null | undefined },
	>(
		operation: () => PromiseLike<T> | T,
	) => Promise<T>;
};

const initialState: PomodoroState = {
	phase: 'focus',
	round: 1,
	timeLeftMs: POMODORO_FOCUS_MS,
	isRunning: false,
	totalPomodoros: 0,
};

export function usePomodoro({ taskId, runWithAuthRetry }: UsePomodoroConfig) {
	const [state, setState] = useState<PomodoroState>(initialState);
	const intervalRef = useRef<number | null>(null);
	const lastTickRef = useRef<number>(0);

	const clearTimer = useCallback(() => {
		if (intervalRef.current != null) {
			window.clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	const logSession = useCallback(
		async (type: PomodoroPhase) => {
			const durationMinutes =
				type === 'focus' ? 25 : type === 'short_break' ? 5 : 15;
			await runWithAuthRetry(() =>
				supabase.from('pomodoro_sessions').insert({
					task_id: taskId ?? null,
					duration_minutes: durationMinutes,
					type,
				}),
			);
		},
		[taskId, runWithAuthRetry],
	);

	const advancePhase = useCallback(() => {
		setState((prev) => {
			const wasFocus = prev.phase === 'focus';
			const newTotalPomodoros = wasFocus
				? prev.totalPomodoros + 1
				: prev.totalPomodoros;

			// Log completed phase
			void logSession(prev.phase);

			let nextPhase: PomodoroPhase;
			let nextRound = prev.round;

			if (wasFocus) {
				if (newTotalPomodoros % POMODOROS_BEFORE_LONG_BREAK === 0) {
					nextPhase = 'long_break';
				} else {
					nextPhase = 'short_break';
				}
			} else {
				nextPhase = 'focus';
				if (prev.phase !== 'focus') {
					nextRound =
						prev.round < POMODOROS_BEFORE_LONG_BREAK
							? prev.round + 1
							: 1;
				}
			}

			return {
				phase: nextPhase,
				round: nextRound,
				timeLeftMs: phaseDuration(nextPhase),
				isRunning: true,
				totalPomodoros: newTotalPomodoros,
			};
		});
	}, [logSession]);

	useEffect(() => {
		if (!state.isRunning) {
			clearTimer();
			return;
		}

		lastTickRef.current = Date.now();
		intervalRef.current = window.setInterval(() => {
			const now = Date.now();
			const delta = now - lastTickRef.current;
			lastTickRef.current = now;

			setState((prev) => {
				if (!prev.isRunning) return prev;
				const next = prev.timeLeftMs - delta;
				if (next <= 0) {
					// Schedule advance on next tick to avoid setState-in-setState
					queueMicrotask(() => advancePhase());
					return { ...prev, timeLeftMs: 0 };
				}
				return { ...prev, timeLeftMs: next };
			});
		}, 200);

		return clearTimer;
	}, [state.isRunning, clearTimer, advancePhase]);

	const toggle = useCallback(() => {
		setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
	}, []);

	const skip = useCallback(() => {
		advancePhase();
	}, [advancePhase]);

	const reset = useCallback(() => {
		clearTimer();
		setState(initialState);
	}, [clearTimer]);

	return {
		...state,
		phaseLabel: phaseLabel(state.phase),
		toggle,
		skip,
		reset,
	};
}
