import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SupabaseErrorLike } from '../lib/task-utils';

export const STREAK_QUERY_KEY = 'streak';

type UseStreakConfig = {
	userId: string | null;
	runWithAuthRetry: <
		T extends { error: SupabaseErrorLike | null | undefined },
	>(
		operation: () => PromiseLike<T> | T,
	) => Promise<T>;
};

export function useStreak(config: UseStreakConfig) {
	const { userId, runWithAuthRetry } = config;

	const streakQuery = useQuery({
		queryKey: [STREAK_QUERY_KEY, userId],
		queryFn: async () => {
			const { data, error } = await runWithAuthRetry(() =>
				supabase.rpc('get_user_streak', { user_telegram_id: userId! }),
			);
			if (error) {
				console.error('Fetch streak failed', error);
				return 0;
			}
			return typeof data === 'number' ? data : 0;
		},
		enabled: !!userId,
	});

	return streakQuery.data ?? 0;
}
