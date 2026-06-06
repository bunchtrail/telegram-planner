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

function calculateStreak(dates: Set<string>, todayStr: string): number {
	const today = new Date(todayStr + 'T00:00:00Z');
	let streak = 0;
	const checkDate = new Date(today);
	checkDate.setUTCDate(checkDate.getUTCDate() - 1);
	while (true) {
		const dateStr = checkDate.toISOString().slice(0, 10);
		if (dates.has(dateStr)) {
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

	const now = new Date();
	const moscowOffset = 3 * 60 * 60 * 1000;
	const moscowNow = new Date(now.getTime() + moscowOffset);
	const todayStr = moscowNow.toISOString().slice(0, 10);

	const sixtyDaysAgo = new Date(moscowNow);
	sixtyDaysAgo.setUTCDate(sixtyDaysAgo.getUTCDate() - 60);
	const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().slice(0, 10);

	// 1. All active habits in one query
	const { data: allHabits, error: habitsError } = await supabaseAdmin
		.from('habits')
		.select('id, name, icon, telegram_id')
		.eq('archived', false)
		.not('telegram_id', 'is', null);

	if (habitsError) return errorNoStore(500, 'HABITS_FETCH_FAILED');

	// 2. All today's logs
	const { data: todayLogs } = await supabaseAdmin
		.from('habit_logs')
		.select('habit_id')
		.eq('date', todayStr);

	const completedToday = new Set((todayLogs ?? []).map((l) => l.habit_id));

	// 3. All recent logs for streak calc
	const { data: recentLogs } = await supabaseAdmin
		.from('habit_logs')
		.select('habit_id, date')
		.gte('date', sixtyDaysAgoStr);

	// Group logs by habit_id
	const logsByHabit = new Map<string, Set<string>>();
	for (const l of (recentLogs ?? [])) {
		const s = logsByHabit.get(l.habit_id) ?? new Set<string>();
		s.add(l.date);
		logsByHabit.set(l.habit_id, s);
	}

	type HRow = { id: string; name: string; icon: string; telegram_id: string };

	// Group habits by user
	const byUser = new Map<string, HRow[]>();
	for (const h of (allHabits ?? []) as HRow[]) {
		if (!h.telegram_id) continue;
		const arr = byUser.get(h.telegram_id) ?? [];
		arr.push(h);
		byUser.set(h.telegram_id, arr);
	}

	let nudged = 0;
	let skipped = 0;

	for (const [telegramId, habits] of byUser) {
		const startedButNotDone: HabitStreakEntry[] = [];

		for (const habit of habits) {
			if (completedToday.has(habit.id)) continue;
			const habitDates = logsByHabit.get(habit.id);
			if (!habitDates || habitDates.size === 0) continue;
			const streak = calculateStreak(habitDates, todayStr);
			startedButNotDone.push({ icon: habit.icon, name: habit.name, streak });
		}

		if (startedButNotDone.length === 0) { skipped += 1; continue; }

		const message = formatHabitStreakNudge(startedButNotDone);
		const result = await sendTelegramMessage(telegramId, message);

		if (result.ok) { nudged += 1; }
		else { console.error('[habit-streak-nudge] delivery failed', { telegram_id: telegramId, error: result.error }); }
	}

	return jsonNoStore({
		ok: true,
		status: 'completed',
		totalUsers: byUser.size,
		nudged,
		skipped,
		date: todayStr,
	});
}
