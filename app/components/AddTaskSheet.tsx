"use client";

import {
  forwardRef,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChevronRight, Clock, X } from "lucide-react";
import {
  clearAllBodyScrollLocks,
  disableBodyScroll,
  enableBodyScroll,
} from "body-scroll-lock";
import { motion, type PanInfo, useDragControls } from "framer-motion";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const DURATION_MIN = 5;
const DURATION_MAX = 180;
const DURATION_STEP = 5;
const DURATION_HAPTIC_STEP = 15;

const clampDuration = (value: number) =>
  Math.min(Math.max(value, DURATION_MIN), DURATION_MAX);

export type AddTaskSheetHandle = {
  focusTitleInput: () => void;
};

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

const AddTaskSheet = forwardRef<AddTaskSheetHandle, AddTaskSheetProps>(
  (
    {
      isOpen,
      title,
      duration,
      onClose,
      onTitleChange,
      onDurationChange,
      onAdd,
      isAddDisabled,
    },
    ref,
  ) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const sliderInputRef = useRef<HTMLInputElement>(null);
    const sliderTrackRef = useRef<HTMLDivElement>(null);
    const activeSliderPointerIdRef = useRef<number | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const baseViewportHeightRef = useRef(0);
    const dragControls = useDragControls();
    const { selection, impact } = useHaptic();
    const [keyboardInset, setKeyboardInset] = useState(0);
    const [viewportHeight, setViewportHeight] = useState<number | null>(null);
    const [showTitleError, setShowTitleError] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        focusTitleInput: () => {
          window.setTimeout(() => {
            titleInputRef.current?.focus();
          }, 50);
        },
      }),
      [],
    );

    const handleClose = useCallback(() => {
      setShowTitleError(false);
      onClose();
    }, [onClose]);

    const handleTitleChange = useCallback(
      (value: string) => {
        if (showTitleError && value.trim()) {
          setShowTitleError(false);
        }
        onTitleChange(value);
      },
      [onTitleChange, showTitleError],
    );

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

    useLayoutEffect(() => {
      if (!isOpen) return;

      const viewport = window.visualViewport;
      baseViewportHeightRef.current = window.innerHeight;
      setViewportHeight(baseViewportHeightRef.current);

      let frameId: number | null = null;

      const updateKeyboardInset = () => {
        const baseHeight = baseViewportHeightRef.current || window.innerHeight;
        const visualHeight = viewport?.height ?? window.innerHeight;
        const offsetTop = viewport?.offsetTop ?? 0;
        const nextInset = Math.max(0, baseHeight - visualHeight - offsetTop);

        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
        frameId = window.requestAnimationFrame(() => {
          setKeyboardInset(nextInset);
          frameId = null;
        });
      };

      updateKeyboardInset();

      if (viewport) {
        viewport.addEventListener("resize", updateKeyboardInset);
        viewport.addEventListener("scroll", updateKeyboardInset);
      } else {
        window.addEventListener("resize", updateKeyboardInset);
      }

      return () => {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
        if (viewport) {
          viewport.removeEventListener("resize", updateKeyboardInset);
          viewport.removeEventListener("scroll", updateKeyboardInset);
        } else {
          window.removeEventListener("resize", updateKeyboardInset);
        }
      };
    }, [isOpen]);

    useEffect(() => {
      if (isOpen) return;
      setKeyboardInset(0);
      setViewportHeight(null);
      baseViewportHeightRef.current = 0;
    }, [isOpen]);

    useLayoutEffect(() => {
      if (!isOpen) return;

      const input = titleInputRef.current;
      if (!input) return;

      input.focus();
      const timeoutId = window.setTimeout(() => {
        if (document.activeElement !== input) {
          input.focus();
        }
      }, 150);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }, [isOpen]);

    const safeDuration = clampDuration(duration);
    const progress =
      ((safeDuration - DURATION_MIN) / (DURATION_MAX - DURATION_MIN)) * 100;

    const updateDuration = useCallback(
      (value: number) => {
        if (value === duration) return;
        if (value % DURATION_HAPTIC_STEP === 0) {
          selection();
        }
        onDurationChange(value);
      },
      [duration, onDurationChange, selection],
    );

    const getDurationFromPointer = useCallback(
      (clientX: number) => {
        const track = sliderTrackRef.current;
        if (!track) return safeDuration;

        const rect = track.getBoundingClientRect();
        if (!rect.width) return safeDuration;

        const clampedX = Math.min(
          Math.max(clientX - rect.left, 0),
          rect.width,
        );
        const ratio = clampedX / rect.width;
        const rawValue =
          DURATION_MIN + ratio * (DURATION_MAX - DURATION_MIN);
        const steppedValue =
          Math.round(rawValue / DURATION_STEP) * DURATION_STEP;

        return clampDuration(steppedValue);
      },
      [safeDuration],
    );

    const handleSliderPointerDown = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        sliderInputRef.current?.focus({ preventScroll: true });

        const nextValue = getDurationFromPointer(event.clientX);
        updateDuration(nextValue);

        activeSliderPointerIdRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      [getDurationFromPointer, updateDuration],
    );

    const handleSliderPointerMove = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activeSliderPointerIdRef.current !== event.pointerId) return;
        updateDuration(getDurationFromPointer(event.clientX));
      },
      [getDurationFromPointer, updateDuration],
    );

    const handleSliderPointerUp = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activeSliderPointerIdRef.current !== event.pointerId) return;
        activeSliderPointerIdRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      },
      [],
    );

    const handleDragEnd = (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: PanInfo,
    ) => {
      if (info.offset.y > 120 || info.velocity.y > 700) {
        handleClose();
      }
    };

    const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
      updateDuration(Number(event.target.value));
    };

    return (
      <div
        className="fixed left-0 right-0 top-0 z-50 flex flex-col justify-end px-3 transition-[padding-bottom] duration-200 ease-out sm:items-center sm:justify-center sm:px-6"
        style={{
          height: viewportHeight ? `${viewportHeight}px` : "100%",
          paddingBottom: keyboardInset ? `${keyboardInset}px` : undefined,
        }}
      >
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />

        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-task-title"
          tabIndex={-1}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-[32px] bg-[var(--surface)] shadow-[0_24px_60px_-30px_rgba(16,12,8,0.7)] sm:rounded-[32px]"
          style={{
            maxHeight: "92vh",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
          drag="y"
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0 }}
          dragElastic={0.08}
          onDragEnd={handleDragEnd}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          <div
            className="flex w-full items-center justify-center pt-3 pb-2 cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={(event) => dragControls.start(event)}
          >
            <div className="h-1.5 w-12 rounded-full bg-[var(--border)] opacity-70" />
          </div>

          <div className="flex items-center justify-between px-6 pb-1 pt-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                План
              </p>
              <h2
                id="add-task-title"
                className="text-xl font-semibold text-[var(--ink)] font-[var(--font-display)]"
              >
                Новая задача
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Закрыть"
              className="rounded-full p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (isAddDisabled) {
                setShowTitleError(true);
                titleInputRef.current?.focus();
                onAdd();
                return;
              }
              onAdd();
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div
              ref={scrollAreaRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-4 [-webkit-overflow-scrolling:touch]"
            >
              <div className="relative">
                <input
                  ref={titleInputRef}
                  id="task-title"
                  type="text"
                  placeholder="Что нужно сделать?"
                  value={title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  autoFocus
                  enterKeyHint="done"
                  aria-invalid={showTitleError}
                  aria-describedby={showTitleError ? "task-title-error" : undefined}
                  className="w-full bg-transparent text-2xl font-medium text-[var(--ink)] placeholder:text-[var(--muted)]/50 outline-none"
                />
                {showTitleError && (
                  <p
                    id="task-title-error"
                    className="mt-2 text-xs font-semibold text-[var(--danger)]"
                  >
                    Введите название задачи
                  </p>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Clock size={16} />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                      Длительность
                    </span>
                  </div>
                  <span className="text-lg font-bold text-[var(--accent)] tabular-nums">
                    {safeDuration} мин
                  </span>
                </div>

                <div
                  ref={sliderTrackRef}
                  className="relative flex h-8 items-center cursor-pointer touch-none"
                  onPointerDown={handleSliderPointerDown}
                  onPointerMove={handleSliderPointerMove}
                  onPointerUp={handleSliderPointerUp}
                  onPointerCancel={handleSliderPointerUp}
                >
                  <input
                    ref={sliderInputRef}
                    type="range"
                    min={DURATION_MIN}
                    max={DURATION_MAX}
                    step={DURATION_STEP}
                    value={safeDuration}
                    onChange={handleSliderChange}
                    className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 pointer-events-none"
                    aria-label="Длительность задачи"
                  />
                  <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-75"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--surface)] bg-[var(--accent)] shadow-md pointer-events-none transition-[left] duration-75"
                    style={{ left: `${progress}%` }}
                  />
                </div>

                <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 py-1">
                  {DURATION_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        impact("light");
                        onDurationChange(mins);
                      }}
                      aria-pressed={safeDuration === mins}
                      className={cn(
                        "flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95",
                        safeDuration === mins
                          ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_12px_24px_-18px_rgba(23,95,86,0.7)]"
                          : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--ink)]",
                      )}
                    >
                      {mins} мин
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2">
              <button
                type="submit"
                disabled={isAddDisabled}
                className={cn(
                  "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-lg font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                  isAddDisabled
                    ? "bg-[var(--surface-2)] text-[var(--muted)]"
                    : "bg-[var(--ink)] text-[var(--bg)] shadow-[0_16px_30px_-20px_rgba(16,12,8,0.45)] active:scale-[0.98]",
                )}
              >
                <span className="z-10 flex items-center gap-2">
                  Добавить
                  {!isAddDisabled && (
                    <ChevronRight
                      size={20}
                      className="opacity-60 transition-transform group-hover:translate-x-1"
                    />
                  )}
                </span>
                {!isAddDisabled && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  },
);

AddTaskSheet.displayName = "AddTaskSheet";

export default AddTaskSheet;
