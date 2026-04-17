import { describe, expect, test } from 'vitest';
import { getReminderRunSecret } from '../app/lib/reminders-config';

describe('getReminderRunSecret', () => {
  test('prefers explicit reminders secret when provided', () => {
    expect(
      getReminderRunSecret({
        REMINDERS_RUN_SECRET: 'reminders-secret',
        CRON_SECRET: 'cron-secret',
      }),
    ).toBe('reminders-secret');
  });

  test('falls back to Vercel cron secret when reminders secret is absent', () => {
    expect(
      getReminderRunSecret({
        CRON_SECRET: 'cron-secret',
      }),
    ).toBe('cron-secret');
  });

  test('returns null when neither secret is configured', () => {
    expect(getReminderRunSecret({})).toBeNull();
  });
});
