import { errorNoStore, jsonNoStore } from '@/app/lib/api-response';
import { getReminderRunSecret } from '@/app/lib/reminders-config';
import { getSupabaseAdmin } from '@/app/lib/supabase-admin';
import {
	formatReminderText,
	sendTelegramMessage,
} from '@/app/lib/telegram-bot';
import { ReminderRunHeaderSchema } from '@/app/lib/validations/reminders';

export const runtime = 'nodejs';

const BATCH_LIMIT = 100;

type DueReminderRow = {
	id: string;
	telegram_id: string | null;
	title: string | null;
	start_minutes: number | null;
	remind_at: string | null;
	reminder_sent_at: string | null;
};

export async function POST(request: Request) {
	const expectedSecret = getReminderRunSecret();

	if (!expectedSecret) {
		return errorNoStore(501, 'REMINDERS_NOT_CONFIGURED');
	}

	const parsed = ReminderRunHeaderSchema.safeParse({
		secret: request.headers.get('x-reminders-secret') ?? '',
	});
	if (!parsed.success || parsed.data.secret !== expectedSecret) {
		return errorNoStore(401, 'UNAUTHORIZED');
	}

	const supabaseAdmin = getSupabaseAdmin();
	if (!supabaseAdmin) {
		return errorNoStore(501, 'SUPABASE_ADMIN_NOT_CONFIGURED');
	}

	const runStartedAt = new Date();
	const runStartedAtIso = runStartedAt.toISOString();
	const claimedAtIso = new Date().toISOString();

	const { data, error } = await supabaseAdmin
		.from('tasks')
		.select('id, telegram_id, title, start_minutes, remind_at, reminder_sent_at')
		.not('remind_at', 'is', null)
		.is('reminder_sent_at', null)
		.lte('remind_at', runStartedAtIso)
		.order('remind_at', { ascending: true })
		.limit(BATCH_LIMIT);

	if (error) return errorNoStore(500, 'REMINDER_FETCH_FAILED');

	const dueRows = (data ?? []) as DueReminderRow[];

	let sent = 0;
	let skipped = 0;
	let failed = 0;
	let deliveryFailed = 0;

	for (const row of dueRows) {
		if (!row.id || !row.remind_at || !row.telegram_id || !row.title) {
			skipped += 1;
			continue;
		}

		const { data: claimed, error: claimError } = await supabaseAdmin
			.from('tasks')
			.update({ reminder_sent_at: claimedAtIso })
			.eq('id', row.id)
			.not('remind_at', 'is', null)
			.is('reminder_sent_at', null)
			.lte('remind_at', runStartedAtIso)
			.select('id')
			.maybeSingle();

		if (claimError) {
			failed += 1;
			continue;
		}

		if (!claimed?.id) {
			// Another runner already claimed this reminder.
			skipped += 1;
			continue;
		}

		const delivery = await sendTelegramMessage(
			row.telegram_id,
			formatReminderText({
				title: row.title,
				start_minutes: row.start_minutes,
			}),
		);

		if (delivery.ok) {
			sent += 1;
		} else {
			deliveryFailed += 1;
			console.error('[reminders] telegram delivery failed', {
				task_id: row.id,
				status: delivery.status,
				error: delivery.error,
			});
		}
	}

	return jsonNoStore(
		{
			ok: true,
			status: 'completed',
			processed: dueRows.length,
			sent,
			skipped,
			failed,
			deliveryFailed,
			runStartedAt: runStartedAtIso,
		},
	);
}
