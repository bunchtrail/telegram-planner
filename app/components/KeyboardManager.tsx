"use client";

import { useEffect } from "react";

export default function KeyboardManager() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const viewport = window.visualViewport;

    const update = () => {
      const vvh = viewport?.height ?? window.innerHeight;
      const vvt = viewport?.offsetTop ?? 0;
      const kb = Math.max(0, window.innerHeight - vvh - vvt);

      root.style.setProperty("--vvh", `${vvh}px`);
      root.style.setProperty("--vvt", `${vvt}px`);
      root.style.setProperty("--kb", `${kb}px`);
    };

    update();

    if (!viewport) return;

    viewport.addEventListener("resize", update, { passive: true });
    viewport.addEventListener("scroll", update, { passive: true });

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return null;
}
