import { useEffect, useState } from "react";

export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    let rafId = 0;

    const update = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const next = Math.max(
          0,
          window.innerHeight - (viewport.height + viewport.offsetTop),
        );
        const px = Math.round(next);
        setInset(px);
        document.documentElement.style.setProperty("--kb", `${px}px`);
      });
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
      document.documentElement.style.setProperty("--kb", "0px");
    };
  }, []);

  return inset;
}
