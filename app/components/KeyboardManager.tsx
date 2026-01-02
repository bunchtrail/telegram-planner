"use client";

import { useEffect } from "react";

export default function KeyboardManager() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const root = document.documentElement;
    const viewport = window.visualViewport;
    let baseVisible = viewport.height + viewport.offsetTop;

    const update = () => {
      const visibleNow = viewport.height + viewport.offsetTop;
      const kb = Math.max(0, baseVisible - visibleNow);

      if (kb < 50) {
        baseVisible = visibleNow;
      }

      root.style.setProperty("--vvh", `${viewport.height}px`);
      root.style.setProperty("--vvt", `${viewport.offsetTop}px`);
      root.style.setProperty("--kb", `${kb}px`);
    };

    update();

    viewport.addEventListener("resize", update, { passive: true });
    viewport.addEventListener("scroll", update, { passive: true });

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return null;
}
