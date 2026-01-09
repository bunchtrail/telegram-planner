export const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
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
