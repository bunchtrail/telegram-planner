"use client";

import { useEffect } from "react";

export default function KeyboardManager() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;

    const update = () => {
      requestAnimationFrame(() => {
        const height = viewport.height;
        const offsetTop = viewport.offsetTop;

        document.documentElement.style.setProperty(
          "--tg-viewport-height",
          `${height}px`,
        );
        document.documentElement.style.setProperty(
          "--tg-viewport-top",
          `${offsetTop}px`,
        );
      });
    };

    viewport.addEventListener("resize", update, { passive: true });
    viewport.addEventListener("scroll", update, { passive: true });

    update();

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return null;
}
