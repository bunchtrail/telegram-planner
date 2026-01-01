"use client";

import {
  forwardRef,
  type FormEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { motion, type PanInfo, useDragControls } from "framer-motion";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const DURATION_MIN = 5;
const DURATION_MAX = 180;
const DURATION_STEP = 5;
const DURATION_HAPTIC_STEP = 15;

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
      onClose,
      title,
      onTitleChange,
      duration,
      onDurationChange,
      onAdd,
      isAddDisabled,
    },
    ref,
  ) => {
    const titleInputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();
    const { selection, impact } = useHaptic();
    const [showTitleError, setShowTitleError] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        focusTitleInput: () => {
          titleInputRef.current?.focus({ preventScroll: true });
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
      if (info.offset.y > 100) {
        handleClose();
      }
    };

    const handleDurationChange = (value: number) => {
      const nextValue = Math.min(Math.max(value, DURATION_MIN), DURATION_MAX);
      if (nextValue !== duration && nextValue % DURATION_HAPTIC_STEP === 0) {
        selection();
      }
      onDurationChange(nextValue);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isAddDisabled) {
        setShowTitleError(true);
        titleInputRef.current?.focus();
      }
      onAdd();
    };

    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
        <motion.div
          className="pointer-events-auto absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-task-title"
          className="pointer-events-auto relative z-10 flex w-full flex-col overflow-hidden rounded-t-[32px] bg-[var(--surface)] shadow-2xl"
          style={{ maxHeight: "85%" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          drag="y"
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0 }}
          dragElastic={0.05}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex w-full cursor-grab justify-center pt-3 pb-2 touch-none"
            onPointerDown={(event) => dragControls.start(event)}
          >
            <div className="h-1.5 w-12 rounded-full bg-[var(--border)] opacity-60" />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="no-scrollbar flex-1 touch-pan-y overflow-y-auto px-6 pb-2 overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="mb-6 flex items-center justify-between">
                <h2
                  id="add-task-title"
                  className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]"
                >
                  Новое событие
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Закрыть"
                  className="p-2 -mr-2 text-[var(--muted)]"
                >
                  <X size={24} />
                </button>
              </div>

              <input
                ref={titleInputRef}
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="Название..."
                enterKeyHint="done"
                aria-invalid={showTitleError}
                aria-describedby={showTitleError ? "task-title-error" : undefined}
                className="mb-2 w-full bg-transparent py-2 text-[24px] font-bold leading-tight text-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-40 outline-none caret-[var(--accent)]"
              />
              {showTitleError && (
                <p
                  id="task-title-error"
                  className="mt-2 text-xs font-semibold text-[var(--danger)]"
                >
                  Введите название задачи
                </p>
              )}

              <div className="mb-6 mt-8">
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="font-semibold text-[var(--ink)]">
                    Длительность
                  </span>
                  <span className="text-2xl font-bold text-[var(--accent)]">
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
                  className="mb-4 h-2 w-full touch-none rounded-full bg-[var(--surface-2)] accent-[var(--accent)]"
                />
                <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 touch-pan-x">
                  {DURATION_PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        impact("light");
                        onDurationChange(value);
                      }}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-bold transition-all",
                        duration === value
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface-2)] text-[var(--muted)]",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
              <button
                type="submit"
                disabled={isAddDisabled}
                className={cn(
                  "mb-4 w-full rounded-[20px] py-4 text-lg font-bold transition-all active:scale-[0.98]",
                  isAddDisabled
                    ? "bg-[var(--surface-2)] text-[var(--muted)]"
                    : "bg-[var(--ink)] text-[var(--bg)] shadow-xl",
                )}
              >
                Сохранить
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
