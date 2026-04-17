export type PlannerPlatform = 'mobile' | 'desktop';

type TelegramWebApp = {
  platform?: string;
};

const MOBILE_USER_AGENT_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

const getTelegramPlatform = () => {
  if (typeof window === 'undefined') return null;

  const telegram = (
    window as Window & { Telegram?: { WebApp?: TelegramWebApp } }
  ).Telegram;

  return telegram?.WebApp?.platform ?? null;
};

export const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;

  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;

  return (
    navigator.platform === 'MacIntel' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  );
};

export const getPlannerPlatform = (): PlannerPlatform => {
  const platform = getTelegramPlatform();

  if (platform) {
    const desktopPlatforms = new Set([
      'tdesktop',
      'macos',
      'web',
      'weba',
      'webk',
      'unknown',
    ]);

    if (desktopPlatforms.has(platform)) {
      return 'desktop';
    }

    if (platform === 'android' || platform === 'ios') {
      return 'mobile';
    }
  }

  if (typeof navigator !== 'undefined') {
    return MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent)
      ? 'mobile'
      : 'desktop';
  }

  return 'mobile';
};

export const isDesktop = () => getPlannerPlatform() === 'desktop';

export const isIOSWithinMobile = () =>
  getPlannerPlatform() === 'mobile' && isIOSDevice();
