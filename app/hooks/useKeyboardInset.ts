import { useSyncExternalStore } from "react";
import { isIOSWithinMobile } from "../lib/platform";

/**
 * Tracks the iOS virtual keyboard height using VisualViewport API
 * and exposes it as a CSS custom property `--keyboard-height`.
 *
 * On non-iOS devices the hook is a no-op (Telegram handles resizing via
 * `interactiveWidget: 'resizes-content'`).
 */
const KEYBOARD_HEIGHT_CSS_VAR = "--keyboard-height";

let currentKeyboardHeight = 0;
let lastAppliedKeyboardHeight: number | null = null;
let activeViewport: VisualViewport | null = null;
let rafId = 0;
let subscribers = 0;
let cleanupViewportListeners: (() => void) | null = null;
const listeners = new Set<() => void>();

function notifyKeyboardHeight(nextHeight: number) {
  if (nextHeight === currentKeyboardHeight) {
    return;
  }

  currentKeyboardHeight = nextHeight;
  listeners.forEach((listener) => listener());
}

function applyKeyboardHeightCssVar(nextHeight: number) {
  if (typeof document === "undefined") {
    return;
  }

  if (lastAppliedKeyboardHeight === nextHeight) {
    return;
  }

  document.documentElement.style.setProperty(
    KEYBOARD_HEIGHT_CSS_VAR,
    `${nextHeight}px`,
  );
  lastAppliedKeyboardHeight = nextHeight;
}

function measureKeyboardHeight() {
  if (typeof window === "undefined" || activeViewport === null) {
    return;
  }

  const nextHeight = Math.max(
    0,
    Math.round(window.innerHeight - activeViewport.height),
  );

  applyKeyboardHeightCssVar(nextHeight);
  notifyKeyboardHeight(nextHeight);
}

function scheduleKeyboardHeightMeasure() {
  if (rafId !== 0) {
    return;
  }

  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    measureKeyboardHeight();
  });
}

function ensureKeyboardInsetSubscription() {
  if (typeof window === "undefined" || cleanupViewportListeners !== null) {
    return;
  }

  if (!isIOSWithinMobile()) {
    return;
  }

  const viewport = window.visualViewport;
  if (!viewport) {
    return;
  }

  activeViewport = viewport;

  const handleViewportChange = () => {
    scheduleKeyboardHeightMeasure();
  };

  viewport.addEventListener("resize", handleViewportChange);
  viewport.addEventListener("scroll", handleViewportChange);

  cleanupViewportListeners = () => {
    viewport.removeEventListener("resize", handleViewportChange);
    viewport.removeEventListener("scroll", handleViewportChange);

    if (rafId !== 0) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    activeViewport = null;
    cleanupViewportListeners = null;
  };

  measureKeyboardHeight();
}

function releaseKeyboardInsetSubscription() {
  if (subscribers > 0 || cleanupViewportListeners === null) {
    return;
  }

  cleanupViewportListeners();
  currentKeyboardHeight = 0;
  lastAppliedKeyboardHeight = null;

  if (typeof document !== "undefined") {
    document.documentElement.style.removeProperty(KEYBOARD_HEIGHT_CSS_VAR);
  }
}

function subscribeToKeyboardInset(listener: () => void) {
  if (typeof window === "undefined" || !isIOSWithinMobile()) {
    return () => undefined;
  }

  subscribers += 1;
  listeners.add(listener);
  ensureKeyboardInsetSubscription();

  return () => {
    listeners.delete(listener);
    subscribers = Math.max(0, subscribers - 1);
    releaseKeyboardInsetSubscription();
  };
}

function getKeyboardInsetSnapshot() {
  return currentKeyboardHeight;
}

export function useKeyboardInset() {
  return useSyncExternalStore(
    subscribeToKeyboardInset,
    getKeyboardInsetSnapshot,
    () => 0,
  );
}
