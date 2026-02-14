import { useEffect, useRef, useState } from "react";
import { isIOSDevice } from "../lib/platform";

/**
 * Tracks the iOS virtual keyboard height using VisualViewport API
 * and exposes it as a CSS custom property `--keyboard-height`.
 *
 * On non-iOS devices the hook is a no-op (Telegram handles resizing via
 * `interactiveWidget: 'resizes-content'`).
 */
export function useKeyboardInset() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only activate on iOS – Android + desktop are handled by viewport meta
    if (!isIOSDevice()) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        // The keyboard height equals the difference between the layout
        // viewport (window.innerHeight) and the visual viewport height.
        const diff = Math.max(
          0,
          Math.round(window.innerHeight - vv.height),
        );
        setKeyboardHeight(diff);
        document.documentElement.style.setProperty(
          "--keyboard-height",
          `${diff}px`,
        );
      });
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    // Initial value
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      cancelAnimationFrame(rafRef.current);
      document.documentElement.style.removeProperty("--keyboard-height");
    };
  }, []);

  return keyboardHeight;
}
