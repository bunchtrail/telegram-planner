import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SupabaseErrorLike } from '../lib/task-utils';

const POMODORO_STATS_QUERY_KEY = 'pomodoro_stats';

type WeeklyFocusRow = {
	total_pomodoros: number;
	total_focus_minutes: number;
	day_date: string;
	day_pomodoros: number;
};

export type PomodoroWeeklyStats = {
	totalPomodoros: number;
	totalFocusMinutes: number;
	totalFocusHours: number;
	days: { date: string; pomodoros: number }[];
};

type UsePomodoroStatsConfig = {
	userId: string | null;
	weekEndDate?: string; // yyyy-MM-dd
	runWithAuthRetry: <
		T extends { error: SupabaseErrorLike | null | undefined },
	>(
		operation: () => PromiseLike<T> | T,
	) => Promise<T>;
};

export function usePomodoroStats({
	userId,
	weekEndDate,
	runWithAuthRetry,
}: UsePomodoroStatsConfig) {
	const queryKey = useMemo(
		() => [POMODORO_STATS_QUERY_KEY, userId, weekEndDate],
		[userId, weekEndDate],
	);

	const query = useQuery({
		queryKey,
		queryFn: async (): Promise<PomodoroWeeklyStats> => {
			const params: Record<string, string> = {};
			if (weekEndDate) params.week_end_date = weekEndDate;

			const { data, error } = await runWithAuthRetry(() =>
				supabase.rpc('get_weekly_focus_stats', params),
			);

			if (error || !data || !Array.isArray(data) || data.length === 0) {
				return {
					totalPomodoros: 0,
					totalFocusMinutes: 0,
					totalFocusHours: 0,
					days: [],
				};
			}

			const rows = data as WeeklyFocusRow[];
			const totalPomodoros = rows[0]?.total_pomodoros ?? 0;
			const totalFocusMinutes = rows[0]?.total_focus_minutes ?? 0;

			return {
				totalPomodoros,
				totalFocusMinutes,
				totalFocusHours: totalFocusMinutes / 60,
				days: rows.map((r) => ({
					date: r.day_date,
					pomodoros: r.day_pomodoros,
				})),
			};
		},
		enabled: !!userId,
	});

	return (
		query.data ?? {
			totalPomodoros: 0,
			totalFocusMinutes: 0,
			totalFocusHours: 0,
			days: [],
		}
	);
}
