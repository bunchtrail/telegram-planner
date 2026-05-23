import { errorNoStore, jsonNoStore } from '@/app/lib/api-response';
import { getReminderRunSecret } from '@/app/lib/reminders-config';
import { getSupabaseAdmin } from '@/app/lib/supabase-admin';
import {
	formatHabitStreakNudge,
	sendTelegramMessage,
} from '@/app/lib/telegram-bot';
import type { HabitStreakEntry } from '@/app/lib/telegram-bot';
import { ReminderRunHeaderSchema } from '@/app/lib/validations/reminders';

export const runtime = 'nodejs';

type HabitRow = {
	id: string;
	name: string;
	icon: string;
	telegram_id: string;
};

type HabitLogRow = {
	date: string;
};

/**
 * Calculate the current streak (consecutive days ending yesterday)
 * for a given habit based on its logs.
 */
function calculateStreak(logs: HabitLogRow[], todayStr: string): number {
	// Build a set of dates
	const dateSet = new Set(logs.map((l) => l.date));

	// Start from yesterday and walk backwards
	const today = new Date(todayStr + 'T00:00:00Z');
	let streak = 0;
	let checkDate = new Date(today);
	checkDate.setUTCDate(checkDate.getUTCDate() - 1); // start from yesterday

	while (true) {
		const dateStr = checkDate.toISOString().slice(0, 10);
		if (dateSet.has(dateStr)) {
			streak += 1;
			checkDate.setUTCDate(checkDate.getUTCDate() - 1);
		} else {
			break;
		}
	}

	return streak;
}

export async function POST(request: Request) {
	const expectedSecret = getReminderRunSecret();
	if (!expectedSecret) return errorNoStore(501, 'NOT_CONFIGURED');

	const parsed = ReminderRunHeaderSchema.safeParse({
		secret: request.headers.get('x-reminders-secret') ?? '',
	});
	if (!parsed.success || parsed.data.secret !== expectedSecret) {
		return errorNoStore(401, 'UNAUTHORIZED');
	}

	const supabaseAdmin = getSupabaseAdmin();
	if (!supabaseAdmin) return errorNoStore(501, 'SUPABASE_NOT_CONFIGURED');

	// Current time in Moscow (+3)
	const now = new Date();
	const moscowOffset = 3 * 60 * 60 * 1000;
	const moscowNow = new Date(now.getTime() + moscowOffset);
	const todayStr = moscowNow.toISOString().slice(0, 10);

	// Get all unique users who have active habits
	const { data: habitUsers, error: usersError } = await supabaseAdmin
		.from('habits')
		.select('telegram_id')
		.eq('archived', false)
		.not('telegram_id', 'is', null);

	if (usersError) return errorNoStore(500, 'USERS_FETCH_FAILED');

	const uniqueUserIds = [
		...new Set((habitUsers ?? []).map((h) => h.telegram_id).filter(Boolean)),
	] as string[];

	let nudged = 0;
	let skipped = 0;

	for (const telegramId of uniqueUserIds) {
		// Get all active habits for this user
		const { data: habits } = await supabaseAdmin
			.from('habits')
			.select('id, name, icon, telegram_id')
			.eq('telegram_id', telegramId)
			.eq('archived', false);

		const allHabits = (habits ?? []) as HabitRow[];
		if (allHabits.length === 0) {
			skipped += 1;
			continue;
		}

		// Get today's logs to know which are already done
		const { data: todayLogs } = await supabaseAdmin
			.from('habit_logs')
			.select('habit_id')
			.eq('telegram_id', telegramId)
			.eq('date', todayStr);

		const completedToday = new Set(
			(todayLogs ?? []).map((l) => l.habit_id),
		);

		// For each habit not done today, check if it was ever done (started)
		const startedButNotDone: Array<{
			habit: HabitRow;
			streak: number;
		}> = [];

		for (const habit of allHabits) {
			// Skip if already done today
			if (completedToday.has(habit.id)) continue;

			// Check if this habit was ever logged (user started it)
			const { data: allLogs } = await supabaseAdmin
				.from('habit_logs')
				.select('date')
				.eq('habit_id', habit.id)
				.order('date', { ascending: false })
				.limit(60); // last ~2 months is enough for streak calc

			const habitLogs = (allLogs ?? []) as HabitLogRow[];

			// Only include habits the user has done at least once
			if (habitLogs.length === 0) continue;

			const streak = calculateStreak(habitLogs, todayStr);
			startedButNotDone.push({ habit, streak });
		}

		// Nothing to nudge
		if (startedButNotDone.length === 0) {
			skipped += 1;
			continue;
		}

		// Build the message
		const entries: HabitStreakEntry[] = startedButNotDone.map(
			({ habit, streak }) => ({
				icon: habit.icon,
				name: habit.name,
				streak,
			}),
		);

		const message = formatHabitStreakNudge(entries);
		const result = await sendTelegramMessage(telegramId, message);

		if (result.ok) {
			nudged += 1;
		} else {
			console.error('[habit-streak-nudge] delivery failed', {
				telegram_id: telegramId,
				error: result.error,
			});
		}
	}

	return jsonNoStore({
		ok: true,
		status: 'completed',
		totalUsers: uniqueUserIds.length,
		nudged,
		skipped,
		date: todayStr,
	});
}
