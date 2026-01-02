import { useEffect } from "react";

export function useKeyboardInset() {
  useEffect(() => {
    document.documentElement.style.setProperty("--kb", "0px");
  }, []);
}
