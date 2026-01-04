import { useCallback } from 'react';

type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotificationType = 'error' | 'success' | 'warning';

type TelegramHapticFeedback = {
  impactOccurred: (style: HapticImpactStyle) => void;
  notificationOccurred: (type: HapticNotificationType) => void;
  selectionChanged: () => void;
};

const getTelegramHaptics = () => {
  if (typeof window === 'undefined') return null;

  const telegram = (
    window as Window & {
      Telegram?: { WebApp?: { HapticFeedback?: TelegramHapticFeedback } };
    }
  ).Telegram;

  return telegram?.WebApp?.HapticFeedback ?? null;
};

export const useHaptic = () => {
  const impact = useCallback((style: HapticImpactStyle) => {
    getTelegramHaptics()?.impactOccurred(style);
  }, []);

  const notification = useCallback((type: HapticNotificationType) => {
    getTelegramHaptics()?.notificationOccurred(type);
  }, []);

  const selection = useCallback(() => {
    getTelegramHaptics()?.selectionChanged();
  }, []);

  return { impact, notification, selection };
};
