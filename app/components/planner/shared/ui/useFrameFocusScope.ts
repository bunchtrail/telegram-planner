'use client';

import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

let focusTrapCounter = 0;
const focusTrapStack: string[] = [];

const getFocusableElements = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true',
  );

const focusFirstElement = (container: HTMLElement) => {
  const [firstFocusable] = getFocusableElements(container);
  (firstFocusable ?? container).focus({ preventScroll: true });
};

const removeTrapFromStack = (trapId: string) => {
  const trapIndex = focusTrapStack.lastIndexOf(trapId);
  if (trapIndex >= 0) {
    focusTrapStack.splice(trapIndex, 1);
  }
};

type UseFrameFocusScopeOptions = {
  active?: boolean;
};

export default function useFrameFocusScope(
  containerRef: RefObject<HTMLElement | null>,
  { active = true }: UseFrameFocusScopeOptions = {},
) {
  const previousFocusedRef = useRef<HTMLElement | null>(null);
  const trapIdRef = useRef(`frame-focus-trap-${focusTrapCounter++}`);

  useEffect(() => {
    if (!active) {
      return;
    }

    const trapId = trapIdRef.current;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    previousFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    focusTrapStack.push(trapId);

    if (!container.contains(document.activeElement)) {
      focusFirstElement(container);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (focusTrapStack.at(-1) !== trapId) {
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const currentContainer = containerRef.current;
      if (!currentContainer) {
        return;
      }

      const focusableElements = getFocusableElements(currentContainer);
      if (focusableElements.length === 0) {
        event.preventDefault();
        currentContainer.focus({ preventScroll: true });
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const focusIsInside = currentContainer.contains(activeElement);

      if (event.shiftKey) {
        if (!focusIsInside || activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus({ preventScroll: true });
        }
        return;
      }

      if (!focusIsInside || activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus({ preventScroll: true });
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (focusTrapStack.at(-1) !== trapId) {
        return;
      }

      const currentContainer = containerRef.current;
      const target = event.target;
      if (
        !currentContainer ||
        !(target instanceof HTMLElement) ||
        currentContainer.contains(target)
      ) {
        return;
      }

      focusFirstElement(currentContainer);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      removeTrapFromStack(trapId);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);

      if (previousFocusedRef.current?.isConnected) {
        previousFocusedRef.current.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef]);
}
