import { describe, expect, test } from 'vitest';

describe('motion capabilities', () => {
  test('uses balanced motion budget for Telegram iOS even without reduced motion', async () => {
    let motionModule: Record<string, unknown>;

    try {
      motionModule = (await import('../app/lib/motion')) as Record<
        string,
        unknown
      >;
    } catch {
      motionModule = {};
    }

    expect(typeof motionModule.getMotionCapabilities).toBe('function');

    const getMotionCapabilities = motionModule.getMotionCapabilities as (
      input: {
        isTelegramIOS: boolean;
        isDesktop: boolean;
        prefersReducedMotion: boolean;
      },
    ) => {
      tier: string;
      allowSharedLayout: boolean;
      allowBackdropBlur: boolean;
      allowInfiniteAccent: boolean;
      allowHeightAnimation: boolean;
    };

    expect(
      getMotionCapabilities({
        isTelegramIOS: true,
        isDesktop: false,
        prefersReducedMotion: false,
      }),
    ).toEqual({
      tier: 'balanced',
      allowSharedLayout: false,
      allowBackdropBlur: false,
      allowInfiniteAccent: false,
      allowHeightAnimation: true,
    });
  });
});
