import { useEffect } from "react";

export function useKeyboardInset() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const next = Math.max(
        0,
        window.innerHeight - (viewport.height + viewport.offsetTop),
      );
      document.documentElement.style.setProperty(
        "--kb",
        `${Math.round(next)}px`,
      );
    };

    update();
    viewport.addEventListener("resize", update, { passive: true });
    viewport.addEventListener("scroll", update, { passive: true });
    window.addEventListener("focusin", update, { passive: true });
    window.addEventListener("focusout", update, { passive: true });

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("focusout", update);
      document.documentElement.style.setProperty("--kb", "0px");
    };
  }, []);
}
