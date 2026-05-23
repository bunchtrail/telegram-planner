import { errorNoStore, jsonNoStore } from '@/app/lib/api-response';
import { getReminderRunSecret } from '@/app/lib/reminders-config';
import { getSupabaseAdmin } from '@/app/lib/supabase-admin';
import { sendTelegramMessage } from '@/app/lib/telegram-bot';
import { ReminderRunHeaderSchema } from '@/app/lib/validations/reminders';

export const runtime = 'nodejs';

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
	const currentHourMoscow = moscowNow.getUTCHours();

	// Fetch ALL active habits in one query
	const { data: allHabits, error: habitsError } = await supabaseAdmin
		.from('habits')
		.select('id, name, icon, telegram_id')
		.eq('archived', false)
		.not('telegram_id', 'is', null);

	if (habitsError) return errorNoStore(500, 'HABITS_FETCH_FAILED');

	// Fetch ALL today's logs in one query
	const { data: allLogs } = await supabaseAdmin
		.from('habit_logs')
		.select('habit_id, telegram_id')
		.eq('date', todayStr);

	const completedSet = new Set((allLogs ?? []).map((l) => l.habit_id));

	// Group habits by user
	type HRow = { id: string; name: string; icon: string; telegram_id: string };
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
		const totalHabits = habits.length;
		const completedCount = habits.filter((h) => completedSet.has(h.id)).length;
		const allDone = completedCount === totalHabits;

		if (allDone) { skipped += 1; continue; }

		const uncompleted = habits
			.filter((h) => !completedSet.has(h.id))
			.map((h) => `  ${h.icon} ${h.name}`)
			.join('\n');

		const message = currentHourMoscow >= 20
			? [`⚠️ Привычки: ${completedCount}/${totalHabits}`, '', 'Не отмечено сегодня:', uncompleted, '', 'Заверши до конца дня! 💪'].join('\n')
			: [`🔔 Привычки: ${completedCount}/${totalHabits}`, '', 'Ещё не отмечено:', uncompleted, '', 'Не забудь отметить! ✨'].join('\n');

		const result = await sendTelegramMessage(telegramId, message);
		if (result.ok) { nudged += 1; }
		else { console.error('[habit-nudge] delivery failed', { telegram_id: telegramId, error: result.error }); }
	}

	return jsonNoStore({
		ok: true,
		status: 'completed',
		totalUsers: byUser.size,
		nudged,
		skipped,
		hourMoscow: currentHourMoscow,
		date: todayStr,
	});
}
