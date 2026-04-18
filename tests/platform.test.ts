import { describe, expect, test, vi } from 'vitest';
import {
  getPlannerPlatform,
  isTelegramIOS,
  isIOSWithinMobile,
} from '../app/lib/platform';

const originalNavigator = globalThis.navigator;
const originalWindow = globalThis.window;

const setNavigator = (userAgent: string, platform = 'Win32', maxTouchPoints = 0) => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      userAgent,
      platform,
      maxTouchPoints,
    },
  });
};

const setTelegramPlatform = (platform?: string) => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      Telegram: platform
        ? {
            WebApp: { platform },
          }
        : undefined,
    },
  });
};

describe('platform helpers', () => {
  test('prefers Telegram desktop platforms over user agent fallback', () => {
    setNavigator('Mozilla/5.0 (Linux; Android 14)', 'Linux armv81', 5);
    setTelegramPlatform('tdesktop');

    expect(getPlannerPlatform()).toBe('desktop');
  });

  test('returns mobile for Telegram ios platform and reports iOS mobile state', () => {
    setNavigator(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      'iPhone',
      5,
    );
    setTelegramPlatform('ios');

    expect(getPlannerPlatform()).toBe('mobile');
    expect(isTelegramIOS()).toBe(true);
    expect(isIOSWithinMobile()).toBe(true);
  });

  test('falls back to user agent detection when Telegram platform is unavailable', () => {
    setNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    setTelegramPlatform();

    expect(getPlannerPlatform()).toBe('desktop');
  });
});

vi.stubGlobal('navigator', originalNavigator);
vi.stubGlobal('window', originalWindow);
