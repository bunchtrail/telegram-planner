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

	// Fetch ALL today's tasks in one query
	const { data: allTasks, error: tasksError } = await supabaseAdmin
		.from('tasks')
		.select('id, telegram_id, completed')
		.eq('date', todayStr)
		.not('telegram_id', 'is', null);

	if (tasksError) return errorNoStore(500, 'TASKS_FETCH_FAILED');

	type TRow = { id: string; telegram_id: string; completed: boolean };

	// Group by user
	const byUser = new Map<string, TRow[]>();
	for (const t of (allTasks ?? []) as TRow[]) {
		if (!t.telegram_id) continue;
		const arr = byUser.get(t.telegram_id) ?? [];
		arr.push(t);
		byUser.set(t.telegram_id, arr);
	}

	let nudged = 0;
	let skipped = 0;

	for (const [telegramId, tasks] of byUser) {
		const totalTasks = tasks.length;
		const completedTasks = tasks.filter((t) => t.completed).length;
		const allDone = totalTasks > 0 && completedTasks === totalTasks;

		if (totalTasks === 0 || allDone) { skipped += 1; continue; }

		// Get streak (still needs RPC per user)
		const { data: streak } = await supabaseAdmin.rpc('get_user_streak', {
			user_telegram_id: telegramId,
		});

		const currentStreak = typeof streak === 'number' ? streak : 0;

		let message: string;

		if (currentHourMoscow >= 20) {
			if (currentStreak > 0) {
				const days = currentStreak === 1 ? 'день' : currentStreak < 5 ? 'дня' : 'дней';
				message = [`⚠️ Твоя серия: ${currentStreak} ${days}`, '',
					`Сегодня выполнено ${completedTasks} из ${totalTasks} задач.`,
					'Не дай серии сгореть — закрой хотя бы одну задачу! 🔥'].join('\n');
			} else {
				message = ['🌙 Вечерний чек-ин', '',
					`У тебя ${totalTasks - completedTasks} незавершённых задач на сегодня.`,
					'Заверши хотя бы одну — и начни новую серию! 💪'].join('\n');
			}
		} else {
			if (currentStreak > 0) {
				message = [`🔔 Напоминание: серия ${currentStreak} 🔥`, '',
					`Пока выполнено ${completedTasks}/${totalTasks} задач.`,
					'Не забудь закрыть оставшиеся до конца дня!'].join('\n');
			} else {
				skipped += 1;
				continue;
			}
		}

		const result = await sendTelegramMessage(telegramId, message);
		if (result.ok) { nudged += 1; }
		else { console.error('[streak-nudge] delivery failed', { telegram_id: telegramId, error: result.error }); }
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
