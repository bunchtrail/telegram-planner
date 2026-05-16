import { describe, expect, test, vi } from 'vitest';
import {
  formatReminderText,
  sendTelegramMessage,
} from '../app/lib/telegram-bot';

describe('formatReminderText', () => {
  test('returns title-only message when start_minutes is null', () => {
    expect(
      formatReminderText({ title: 'Сходить в магазин', start_minutes: null }),
    ).toBe('🔔 Напоминание\n\nСходить в магазин');
  });

  test('appends HH:MM line when start_minutes is provided', () => {
    expect(
      formatReminderText({ title: 'Встреча', start_minutes: 9 * 60 + 5 }),
    ).toBe('🔔 Напоминание\n\nВстреча\n\n⏰ 09:05');
  });

  test('pads single-digit minute correctly', () => {
    expect(formatReminderText({ title: 'X', start_minutes: 0 })).toBe(
      '🔔 Напоминание\n\nX\n\n⏰ 00:00',
    );
  });
});

describe('sendTelegramMessage', () => {
  test('returns ok: false when token is missing', async () => {
    const original = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
    try {
      const result = await sendTelegramMessage('123', 'hi');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(0);
    } finally {
      if (original !== undefined) process.env.TELEGRAM_BOT_TOKEN = original;
    }
  });

  test('posts JSON body to Telegram sendMessage and returns ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
        status: 200,
      }),
    );

    const result = await sendTelegramMessage('42', 'hello world', {
      token: 'TEST_TOKEN',
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/botTEST_TOKEN/sendMessage');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({
      chat_id: '42',
      text: 'hello world',
      disable_web_page_preview: true,
    });
  });

  test('returns ok: false with body when Telegram responds non-2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"ok":false,"error_code":403,"description":"blocked"}', {
        status: 403,
      }),
    );

    const result = await sendTelegramMessage('42', 'hi', {
      token: 'T',
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    if (!result.ok) {
      expect(result.error).toContain('blocked');
    }
  });

  test('returns ok: false on network exception', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await sendTelegramMessage('42', 'hi', {
      token: 'T',
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    if (!result.ok) {
      expect(result.error).toBe('ECONNREFUSED');
    }
  });
});
