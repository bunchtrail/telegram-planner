export const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;
  // Standard iOS UA check
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  // iPadOS with desktop user-agent
  if (
    navigator.platform === 'MacIntel' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  ) {
    return true;
  }
  return false;
};

type TelegramWebApp = {
  platform?: string;
};

export const isDesktop = () => {
  if (typeof window === 'undefined') return false;
  const telegram = (
    window as Window & { Telegram?: { WebApp?: TelegramWebApp } }
  ).Telegram;
  const platform = telegram?.WebApp?.platform;

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
      return true;
    }
    if (platform === 'android' || platform === 'ios') {
      return false;
    }
  }

  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      );
    return !isMobile;
  }

  return false;
};
