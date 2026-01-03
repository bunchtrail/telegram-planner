import { useCallback } from "react";
import confetti from "canvas-confetti";

type RewardType = "light" | "medium" | "climax";

const fallbackColors = ["#ff9f0a", "#ffb340", "#ffffff", "#34c759"];

const getThemeColors = () => {
  if (typeof window === "undefined") return fallbackColors;

  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue("--accent").trim() || fallbackColors[0];
  const accentInk =
    styles.getPropertyValue("--accent-ink").trim() || fallbackColors[2];
  const surface =
    styles.getPropertyValue("--surface").trim() || fallbackColors[2];
  const link =
    styles.getPropertyValue("--tg-theme-link-color").trim() ||
    fallbackColors[3];

  const colors = [accent, link, accentInk, surface].filter(Boolean);
  const unique = Array.from(new Set(colors));
  return unique.length >= 3 ? unique : fallbackColors;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useReward() {
  const fire = useCallback((x: number, y: number, type: RewardType = "light") => {
    if (typeof window === "undefined" || prefersReducedMotion()) return;

    const colors = getThemeColors();
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    const origin = {
      x: Math.min(1, Math.max(0, x / width)),
      y: Math.min(1, Math.max(0, y / height)),
    };

    switch (type) {
      case "light":
        confetti({
          particleCount: 20,
          spread: 40,
          origin,
          colors: colors.slice(0, 3),
          disableForReducedMotion: true,
          scalar: 0.8,
          gravity: 1.2,
          ticks: 100,
          startVelocity: 20,
          zIndex: 9999,
          shapes: ["circle"],
        });
        break;

      case "medium":
        confetti({
          particleCount: 40,
          spread: 60,
          origin,
          colors,
          disableForReducedMotion: true,
          zIndex: 9999,
          startVelocity: 25,
        });
        break;

      case "climax": {
        const duration = 2000;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors,
            disableForReducedMotion: true,
            zIndex: 9999,
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors,
            disableForReducedMotion: true,
            zIndex: 9999,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };

        frame();
        break;
      }
    }
  }, []);

  return { fire };
}
