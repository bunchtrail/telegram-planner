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

	// Current time in Moscow (+3)
	const now = new Date();
	const moscowOffset = 3 * 60 * 60 * 1000;
	const moscowNow = new Date(now.getTime() + moscowOffset);
	const todayStr = moscowNow.toISOString().slice(0, 10);
	const currentHourMoscow = moscowNow.getUTCHours();

	// Get all unique users who have habits
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
			.select('id, name, icon')
			.eq('telegram_id', telegramId)
			.eq('archived', false);

		const allHabits = habits ?? [];
		if (allHabits.length === 0) {
			skipped += 1;
			continue;
		}

		// Get today's logs for this user
		const { data: logs } = await supabaseAdmin
			.from('habit_logs')
			.select('habit_id')
			.eq('telegram_id', telegramId)
			.eq('date', todayStr);

		const completedIds = new Set((logs ?? []).map((l) => l.habit_id));
		const totalHabits = allHabits.length;
		const completedCount = allHabits.filter((h) => completedIds.has(h.id)).length;
		const allDone = completedCount === totalHabits;

		// Skip if all habits done
		if (allDone) {
			skipped += 1;
			continue;
		}

		// Build list of uncompleted habits
		const uncompleted = allHabits
			.filter((h) => !completedIds.has(h.id))
			.map((h) => `  ${h.icon} ${h.name}`)
			.join('\n');

		let message: string;

		if (currentHourMoscow >= 20) {
			// Evening nudge
			message = [
				`⚠️ Привычки: ${completedCount}/${totalHabits}`,
				'',
				'Не отмечено сегодня:',
				uncompleted,
				'',
				'Заверши до конца дня! 💪',
			].join('\n');
		} else {
			// Afternoon nudge
			message = [
				`🔔 Привычки: ${completedCount}/${totalHabits}`,
				'',
				'Ещё не отмечено:',
				uncompleted,
				'',
				'Не забудь отметить! ✨',
			].join('\n');
		}

		const result = await sendTelegramMessage(telegramId, message);

		if (result.ok) {
			nudged += 1;
		} else {
			console.error('[habit-nudge] delivery failed', {
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
		hourMoscow: currentHourMoscow,
		date: todayStr,
	});
}
