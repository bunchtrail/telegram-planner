type SendMessageOptions = {
	token?: string;
	fetchImpl?: typeof fetch;
};

export type SendMessageResult =
	| { ok: true; status: number }
	| { ok: false; status: number; error: string };

export async function sendTelegramMessage(
	chatId: string,
	text: string,
	options: SendMessageOptions = {},
): Promise<SendMessageResult> {
	const token = options.token ?? process.env.TELEGRAM_BOT_TOKEN;
	if (!token) {
		return {
			ok: false,
			status: 0,
			error: 'TELEGRAM_BOT_TOKEN is not configured',
		};
	}

	const fetchImpl = options.fetchImpl ?? fetch;

	let response: Response;
	try {
		response = await fetchImpl(
			`https://api.telegram.org/bot${token}/sendMessage`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: chatId,
					text,
					disable_web_page_preview: true,
				}),
			},
		);
	} catch (error) {
		return {
			ok: false,
			status: 0,
			error: error instanceof Error ? error.message : 'network error',
		};
	}

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		return {
			ok: false,
			status: response.status,
			error: body.slice(0, 256) || `HTTP ${response.status}`,
		};
	}

	return { ok: true, status: response.status };
}

export type ReminderMessageTask = {
	title: string;
	start_minutes: number | null;
};

export function formatReminderText(task: ReminderMessageTask): string {
	const lines: string[] = ['🔔 Напоминание', '', task.title];
	if (task.start_minutes != null) {
		const hours = Math.floor(task.start_minutes / 60);
		const minutes = task.start_minutes % 60;
		const hh = String(hours).padStart(2, '0');
		const mm = String(minutes).padStart(2, '0');
		lines.push('', `⏰ ${hh}:${mm}`);
	}
	return lines.join('\n');
}


export type HabitStreakEntry = {
	icon: string;
	name: string;
	streak: number;
};

export function formatHabitStreakNudge(habits: HabitStreakEntry[]): string {
	if (habits.length === 0) return '';

	const lines: string[] = ['🔥 Не сломай серию!', ''];

	for (const h of habits) {
		if (h.streak > 0) {
			const days = h.streak === 1 ? 'день' : h.streak < 5 ? 'дня' : 'дней';
			lines.push(`  ${h.icon} ${h.name} —  ${h.streak} ${days} подряд`);
		} else {
			lines.push(`  ${h.icon} ${h.name} — вернись к привычке!`);
		}
	}

	lines.push('', 'Отметь в планнере ✨');
	return lines.join('\n');
}
