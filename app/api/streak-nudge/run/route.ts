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

	// Get today's date in UTC (adjust for Moscow timezone +3)
	const now = new Date();
	const moscowOffset = 3 * 60 * 60 * 1000;
	const moscowNow = new Date(now.getTime() + moscowOffset);
	const todayStr = moscowNow.toISOString().slice(0, 10);
	const currentHourMoscow = moscowNow.getUTCHours();

	// Get all unique telegram_ids that have tasks
	const { data: users, error: usersError } = await supabaseAdmin
		.from('tasks')
		.select('telegram_id')
		.not('telegram_id', 'is', null);

	if (usersError) return errorNoStore(500, 'USERS_FETCH_FAILED');

	const uniqueUserIds = [...new Set((users ?? []).map((u) => u.telegram_id).filter(Boolean))] as string[];

	let nudged = 0;
	let skipped = 0;

	for (const telegramId of uniqueUserIds) {
		// Get user's streak
		const { data: streak } = await supabaseAdmin.rpc('get_user_streak', {
			user_telegram_id: telegramId,
		});

		const currentStreak = typeof streak === 'number' ? streak : 0;

		// Get today's tasks for this user
		const { data: todayTasks } = await supabaseAdmin
			.from('tasks')
			.select('id, completed')
			.eq('telegram_id', telegramId)
			.eq('date', todayStr);

		const tasks = todayTasks ?? [];
		const totalTasks = tasks.length;
		const completedTasks = tasks.filter((t) => t.completed).length;
		const allDone = totalTasks > 0 && completedTasks === totalTasks;

		// Skip if no tasks today or all tasks completed
		if (totalTasks === 0 || allDone) {
			skipped += 1;
			continue;
		}

		// Determine message based on time and streak
		let message: string;

		if (currentHourMoscow >= 20) {
			// Evening nudge (after 20:00)
			if (currentStreak > 0) {
				message = [
					`⚠️ Твоя серия: ${currentStreak} ${currentStreak === 1 ? 'день' : currentStreak < 5 ? 'дня' : 'дней'}`,
					'',
					`Сегодня выполнено ${completedTasks} из ${totalTasks} задач.`,
					'Не дай серии сгореть — закрой хотя бы одну задачу! 🔥',
				].join('\n');
			} else {
				message = [
					'🌙 Вечерний чек-ин',
					'',
					`У тебя ${totalTasks - completedTasks} незавершённых задач на сегодня.`,
					'Заверши хотя бы одну — и начни новую серию! 💪',
				].join('\n');
			}
		} else {
			// Afternoon nudge (14:00-19:59)
			if (currentStreak > 0) {
				message = [
					`🔔 Напоминание: серия ${currentStreak} 🔥`,
					'',
					`Пока выполнено ${completedTasks}/${totalTasks} задач.`,
					'Не забудь закрыть оставшиеся до конца дня!',
				].join('\n');
			} else {
				skipped += 1;
				continue;
			}
		}

		const result = await sendTelegramMessage(telegramId, message);
		if (result.ok) {
			nudged += 1;
		} else {
			console.error('[streak-nudge] delivery failed', {
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
