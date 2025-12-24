"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import {
  clearAllBodyScrollLocks,
  disableBodyScroll,
  enableBodyScroll,
} from "body-scroll-lock";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

type AddTaskSheetProps = {
  isOpen: boolean;
  title: string;
  duration: number;
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onDurationChange: (value: number) => void;
  onAdd: () => void;
  isAddDisabled: boolean;
};

export default function AddTaskSheet({
  isOpen,
  title,
  duration,
  onClose,
  onTitleChange,
  onDurationChange,
  onAdd,
  isAddDisabled,
}: AddTaskSheetProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showTitleError, setShowTitleError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const el = scrollAreaRef.current;
    if (!el) return;
    disableBodyScroll(el, { reserveScrollBarGap: true });

    return () => {
      enableBodyScroll(el);
      clearAllBodyScrollLocks();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    const update = () => {
      const rawKeyboardHeight =
        window.innerHeight - viewport.height - viewport.offsetTop;
      const keyboardHeight = rawKeyboardHeight < 2 ? 0 : rawKeyboardHeight;
      root.style.setProperty(
        "--vv-top",
        `${keyboardHeight ? viewport.offsetTop : 0}px`,
      );
      root.style.setProperty("--kb", `${keyboardHeight}px`);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--kb");
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timeout = window.setTimeout(() => {
      titleInputRef.current?.focus({ preventScroll: true });
    }, 260);

    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowTitleError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (title.trim()) {
      setShowTitleError(false);
    }
  }, [title]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 px-3 sm:px-6"
      style={{ top: "var(--vv-top, 0px)" }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_180ms_ease-out]"
        onClick={onClose}
      />

      <div
        className="relative flex h-full items-end justify-center pb-[calc(12px+env(safe-area-inset-bottom))] transition-transform duration-200 ease-out sm:items-center sm:pb-6"
        style={{
          transform: "translate3d(0, calc(-1 * var(--kb, 0px)), 0)",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-task-title"
          ref={dialogRef}
          tabIndex={-1}
          className="relative w-full max-w-lg animate-[modalIn_220ms_cubic-bezier(0.22,1,0.36,1)] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_50px_-30px_rgba(16,12,8,0.6)]"
        >
          <div
            className="flex flex-col"
            style={{
              maxHeight: "calc(var(--tg-viewport-stable-height, 100vh) * 0.85)",
            }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  План
                </p>
                <h2
                  id="add-task-title"
                  className="text-2xl font-semibold text-[var(--ink)] font-[var(--font-display)]"
                >
                  Новая задача
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <X size={18} />
              </button>
            </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (isAddDisabled) {
                setShowTitleError(true);
                titleInputRef.current?.focus({ preventScroll: true });
                return;
              }
              onAdd();
            }}
            className="flex flex-1 flex-col"
          >
            <div
              ref={scrollAreaRef}
              className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 [-webkit-overflow-scrolling:touch]"
            >
              <label
                className="mb-2 block text-sm font-semibold text-[var(--muted)]"
                htmlFor="task-title"
              >
                Название задачи
              </label>
              <input
                ref={titleInputRef}
                id="task-title"
                type="text"
                placeholder="Например, созвон с командой"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                enterKeyHint="done"
                aria-invalid={showTitleError}
                aria-describedby={showTitleError ? "task-title-error" : undefined}
                className="w-full rounded-2xl border border-transparent bg-[var(--surface-2)] px-4 py-3 text-lg text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
              />
              {showTitleError && (
                <p
                  id="task-title-error"
                  className="mt-2 text-sm font-medium text-[var(--danger)]"
                >
                  Введите название задачи
                </p>
              )}

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--muted)]">
                    Длительность
                  </p>
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {duration} минут
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {DURATION_OPTIONS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onDurationChange(mins)}
                      aria-pressed={duration === mins}
                      className={cn(
                        "h-11 rounded-xl border px-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                        duration === mins
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_10px_20px_-16px_rgba(23,95,86,0.6)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]",
                      )}
                    >
                      {mins}м
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
              <button
                type="submit"
                aria-disabled={isAddDisabled}
                className={cn(
                  "w-full rounded-2xl bg-[var(--accent)] py-4 text-lg font-semibold text-[var(--accent-ink)] shadow-[0_16px_28px_-18px_rgba(23,95,86,0.6)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
                  isAddDisabled
                    ? "cursor-not-allowed bg-[var(--border)] text-[var(--muted)] shadow-none"
                    : "hover:bg-[var(--accent-strong)] active:scale-[0.98]",
                )}
              >
                Добавить в план
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}
