"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  motion,
  type PanInfo,
  type Transition,
  useDragControls,
} from "framer-motion";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";
import type { TaskRepeat } from "../types/task";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const DURATION_MIN = 5;
const DURATION_MAX = 180;
const DURATION_STEP = 5;
const DURATION_HAPTIC_STEP = 15;
const REPEAT_COUNT_MIN = 1;
const REPEAT_COUNT_MAX = 365;
const DEFAULT_REPEAT_COUNT_DAILY = 7;
const DEFAULT_REPEAT_COUNT_WEEKLY = 4;
const SHEET_TRANSITION: Transition = {
  type: "spring",
  damping: 32,
  stiffness: 350,
  mass: 1,
};

type TaskSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initialTitle?: string;
  initialDuration?: number;
  initialRepeat?: TaskRepeat;
  initialRepeatCount?: number;
  onSubmit: (
    title: string,
    duration: number,
    repeat: TaskRepeat,
    repeatCount: number,
  ) => void;
};

export default function TaskSheet({
  isOpen,
  onClose,
  mode,
  initialTitle = "",
  initialDuration = 30,
  initialRepeat = "none",
  initialRepeatCount = DEFAULT_REPEAT_COUNT_DAILY,
  onSubmit,
}: TaskSheetProps) {
  const [title, setTitle] = useState(initialTitle);
  const [duration, setDuration] = useState(initialDuration);
  const [repeat, setRepeat] = useState<TaskRepeat>(initialRepeat);
  const [repeatCount, setRepeatCount] = useState(initialRepeatCount);
  const [showTitleError, setShowTitleError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const shouldAutoFocusRef = useRef(false);
  const dragControls = useDragControls();
  const { selection, impact, notification } = useHaptic();

  const handleClose = useCallback(() => {
    setShowTitleError(false);
    shouldAutoFocusRef.current = false;
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    setTitle(initialTitle);
    setDuration(initialDuration);
    setRepeat(initialRepeat);
    setRepeatCount(initialRepeatCount);
    setShowTitleError(false);

    shouldAutoFocusRef.current = mode === "create";
  }, [initialDuration, initialTitle, isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
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
  }, [handleClose, isOpen]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      handleClose();
    }
  };

  const handleDurationChange = (value: number) => {
    const nextValue = Math.min(Math.max(value, DURATION_MIN), DURATION_MAX);
    if (nextValue !== duration && nextValue % DURATION_HAPTIC_STEP === 0) {
      selection();
    }
    setDuration(nextValue);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setShowTitleError(true);
      notification("error");
      inputRef.current?.focus({ preventScroll: true });
      return;
    }

    notification("success");
    onSubmit(trimmedTitle, duration, repeat, repeatCount);
  };

  const clampRepeatCount = (value: number) =>
    Math.min(Math.max(Math.floor(value), REPEAT_COUNT_MIN), REPEAT_COUNT_MAX);

  const repeatCountLabel = repeat === "weekly" ? "На сколько недель" : "На сколько дней";
  const repeatCountUnit = repeat === "weekly" ? "нед." : "дн.";

  return (
    <div
      className="fixed left-0 z-50 w-full pointer-events-none"
      style={{
        top: "var(--tg-viewport-top, 0px)",
        height: "var(--tg-viewport-height, 100%)",
      }}
    >
      <motion.div
        className="pointer-events-auto absolute inset-0 bg-black/40"
        onClick={handleClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{ willChange: "opacity" }}
      />

      <div className="pointer-events-auto absolute bottom-0 flex w-full flex-col justify-end">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-sheet-title"
          className="relative flex w-full flex-col overflow-hidden rounded-t-[24px] bg-[var(--surface)] shadow-2xl will-change-transform"
          style={{ maxHeight: "100%" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={SHEET_TRANSITION}
          drag="y"
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0 }}
          dragElastic={0.05}
          onDragEnd={handleDragEnd}
          onAnimationComplete={() => {
            if (!shouldAutoFocusRef.current) return;
            shouldAutoFocusRef.current = false;
            setTimeout(() => {
              inputRef.current?.focus({ preventScroll: true });
            }, 50);
          }}
        >
          <div
            className="flex w-full cursor-grab justify-center pt-3 pb-2 touch-none active:cursor-grabbing"
            onPointerDown={(event) => dragControls.start(event)}
          >
            <div className="h-1.5 w-10 rounded-full bg-[var(--muted)] opacity-20" />
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="no-scrollbar flex-1 touch-pan-y overflow-y-auto px-6 pb-2 overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="mb-4 flex items-center justify-between">
                <h2
                  id="task-sheet-title"
                  className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]"
                >
                  {mode === "create" ? "Новое событие" : "Редактирование"}
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Закрыть"
                  className="p-2 -mr-2 text-[var(--muted)] active:opacity-50 transition-opacity"
                >
                  <X size={24} />
                </button>
              </div>

              <textarea
                ref={inputRef}
                value={title}
                onChange={(event) => {
                  if (showTitleError && event.target.value.trim()) {
                    setShowTitleError(false);
                  }
                  setTitle(event.target.value);
                }}
                placeholder="Что нужно сделать?"
                rows={3}
                aria-invalid={showTitleError}
                aria-describedby={showTitleError ? "task-title-error" : undefined}
                className="mb-2 w-full resize-none bg-transparent text-[22px] font-bold leading-tight text-[var(--ink)] placeholder:text-[var(--muted)] outline-none"
              />
              {showTitleError && (
                <p
                  id="task-title-error"
                  className="mt-2 text-xs font-semibold text-[var(--danger)]"
                >
                  Введите название задачи
                </p>
              )}

              <div className="mb-8 mt-6">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="font-semibold text-[var(--ink)]">Время</span>
                  <span className="text-xl font-bold text-[var(--accent)]">
                    {duration} мин
                  </span>
                </div>
                <input
                  type="range"
                  min={DURATION_MIN}
                  max={DURATION_MAX}
                  step={DURATION_STEP}
                  value={duration}
                  onChange={(event) =>
                    handleDurationChange(Number(event.target.value))
                  }
                  className="mb-4 h-2 w-full touch-none rounded-full bg-[var(--bg)] accent-[var(--accent)] cursor-pointer"
                />
                <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 touch-pan-x py-1">
                  {DURATION_PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        impact("light");
                        setDuration(value);
                      }}
                      className={cn(
                        "flex-shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-transform active:scale-95",
                        duration === value
                          ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-md"
                          : "bg-[var(--bg)] text-[var(--muted)]",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "create" && (
                <div className="mb-8">
                  <div className="mb-3 flex items-baseline justify-between">
                    <span className="font-semibold text-[var(--ink)]">
                      Повтор
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "none", label: "Без повтора" },
                        { id: "daily", label: "Ежедневно" },
                        { id: "weekly", label: "Еженедельно" },
                      ] as Array<{ id: TaskRepeat; label: string }>
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          impact("light");
                          if (option.id !== "none") {
                            const fallback =
                              option.id === "weekly"
                                ? DEFAULT_REPEAT_COUNT_WEEKLY
                                : DEFAULT_REPEAT_COUNT_DAILY;
                            setRepeatCount((current) =>
                              current < REPEAT_COUNT_MIN ? fallback : current,
                            );
                          }
                          setRepeat(option.id);
                        }}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm font-bold transition-transform active:scale-95",
                          repeat === option.id
                            ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-md"
                            : "bg-[var(--bg)] text-[var(--muted)]",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {repeat !== "none" && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[var(--bg)] px-4 py-3">
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {repeatCountLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRepeatCount((value) =>
                              clampRepeatCount(value - 1),
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] active:scale-95"
                          aria-label="Уменьшить"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={REPEAT_COUNT_MIN}
                          max={REPEAT_COUNT_MAX}
                          value={repeatCount}
                          onChange={(event) =>
                            setRepeatCount(
                              clampRepeatCount(Number(event.target.value || 0)),
                            )
                          }
                          inputMode="numeric"
                          className="h-8 w-14 rounded-full bg-[var(--surface)] text-center text-sm font-semibold text-[var(--ink)]"
                        />
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          {repeatCountUnit}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRepeatCount((value) =>
                              clampRepeatCount(value + 1),
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] active:scale-95"
                          aria-label="Увеличить"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-[calc(1rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] pt-2 bg-[var(--surface)]">
              <button
                type="submit"
                className="mb-4 w-full rounded-[18px] bg-[var(--accent)] py-4 text-lg font-bold text-[var(--accent-ink)] transition-transform active:scale-[0.98] shadow-[0_12px_24px_var(--accent-soft)]"
              >
                {mode === "create" ? "Создать" : "Сохранить"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
