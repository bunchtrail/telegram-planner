import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase admin env missing');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

export async function POST(request: Request) {
  const secret = process.env.REMINDERS_CRON_SECRET;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!secret || key !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'missing bot token' }, { status: 500 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'missing supabase env' }, { status: 500 });
  }

  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from('tasks')
    .select('id,title,telegram_id,remind_at')
    .lte('remind_at', nowIso)
    .is('reminder_sent_at', null)
    .eq('completed', false)
    .eq('is_goal', false)
    .not('telegram_id', 'is', null)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sentIds: string[] = [];

  for (const task of due ?? []) {
    const chatId = task.telegram_id;
    if (!chatId) continue;
    const text = `⏰ <b>Напоминание:</b> ${task.title}`;

    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        }
      );

      if (resp.ok) {
        sentIds.push(task.id);
      } else {
        if (resp.status === 403) {
          sentIds.push(task.id);
        }
        console.error(`Failed to send reminder to ${chatId}`, await resp.text());
      }
    } catch (sendError) {
      console.error(sendError);
    }
  }

  if (sentIds.length > 0) {
    await supabase
      .from('tasks')
      .update({ reminder_sent_at: nowIso })
      .in('id', sentIds);
  }

  return NextResponse.json({
    ok: true,
    processed: due?.length ?? 0,
    sent: sentIds.length,
  });
}
