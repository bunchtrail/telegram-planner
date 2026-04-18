export type MotionTier = 'full' | 'balanced' | 'lite';

export type MotionCapabilities = {
  tier: MotionTier;
  allowSharedLayout: boolean;
  allowBackdropBlur: boolean;
  allowInfiniteAccent: boolean;
  allowHeightAnimation: boolean;
};

export function getMotionCapabilities(input: {
  isTelegramIOS: boolean;
  isDesktop: boolean;
  prefersReducedMotion: boolean;
}): MotionCapabilities {
  if (input.prefersReducedMotion) {
    return {
      tier: 'lite',
      allowSharedLayout: false,
      allowBackdropBlur: false,
      allowInfiniteAccent: false,
      allowHeightAnimation: false,
    };
  }

  if (input.isTelegramIOS) {
    return {
      tier: 'balanced',
      allowSharedLayout: false,
      allowBackdropBlur: false,
      allowInfiniteAccent: false,
      allowHeightAnimation: true,
    };
  }

  return {
    tier: input.isDesktop ? 'full' : 'balanced',
    allowSharedLayout: true,
    allowBackdropBlur: true,
    allowInfiniteAccent: true,
    allowHeightAnimation: true,
  };
}
