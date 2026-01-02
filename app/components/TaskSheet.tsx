"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Clock, Repeat, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  useDragControls,
} from "framer-motion";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";
import type { TaskRepeat } from "../types/task";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const SHEET_TRANSITION = { type: "spring", damping: 25, stiffness: 300 };
const REPEAT_COUNT_MIN = 1;
const REPEAT_COUNT_MAX = 365;
const DEFAULT_REPEAT_COUNT_DAILY = 7;
const DEFAULT_REPEAT_COUNT_WEEKLY = 4;

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
  initialRepeatCount = 7,
  onSubmit,
}: TaskSheetProps) {
  const [title, setTitle] = useState(initialTitle);
  const [duration, setDuration] = useState(initialDuration);
  const [repeat, setRepeat] = useState<TaskRepeat>(initialRepeat);
  const [repeatCount, setRepeatCount] = useState(initialRepeatCount);
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dragControls = useDragControls();
  const { impact, notification } = useHaptic();

  const adjustTextareaHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const requestSubmit = () => {
    const form = formRef.current;
    if (!form) return;

    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
      return;
    }

    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
  };

  useEffect(() => {
    if (!isOpen) return;

    setTitle(initialTitle);
    setDuration(initialDuration);
    setRepeat(initialRepeat);
    setRepeatCount(initialRepeatCount);
    setShowRepeatOptions(mode === "edit" || initialRepeat !== "none");

    setTimeout(adjustTextareaHeight, 0);

    if (mode === "create") {
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 150);
    }
  }, [
    initialDuration,
    initialRepeat,
    initialRepeatCount,
    initialTitle,
    isOpen,
    mode,
  ]);

  const handleClose = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  }, [onClose]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      handleClose();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();

    if (!trimmed) {
      notification("error");
      inputRef.current?.focus({ preventScroll: true });
      return;
    }

    notification("success");
    onSubmit(trimmed, duration, repeat, repeatCount);
  };

  const clampRepeatCount = (value: number) =>
    Math.min(Math.max(Math.floor(value), REPEAT_COUNT_MIN), REPEAT_COUNT_MAX);

  const repeatCountLabel =
    repeat === "weekly" ? "На сколько недель" : "На сколько дней";
  const repeatCountUnit = repeat === "weekly" ? "нед." : "дн.";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={handleClose}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={SHEET_TRANSITION}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        className="pointer-events-auto relative w-full bg-[var(--surface)] rounded-t-[28px] shadow-2xl flex flex-col max-h-[90dvh]"
        style={{
          paddingBottom:
            "max(env(safe-area-inset-bottom), var(--tg-content-safe-bottom, 0px))",
        }}
      >
        <div
          className="flex justify-center pt-3 pb-1 w-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(event) => dragControls.start(event)}
        >
          <div className="w-10 h-1 bg-[var(--border)] rounded-full opacity-60" />
        </div>

        <div className="px-5 py-2 flex items-center justify-between shrink-0">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {mode === "create" ? "Новая задача" : "Редактирование"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 -mr-2 text-[var(--muted)] active:opacity-50 transition-opacity"
            aria-label="Закрыть"
          >
            <X size={22} />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col min-h-0 overflow-y-auto overscroll-contain px-5"
        >
          <div className="py-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  requestSubmit();
                }
              }}
              placeholder="Что нужно сделать?"
              className="w-full bg-transparent text-2xl font-bold text-[var(--ink)] placeholder:text-[var(--muted)]/50 resize-none outline-none leading-tight"
              style={{ minHeight: "44px" }}
            />
          </div>

          <div className="mt-4 mb-2">
            <div className="flex items-center gap-2 mb-3 text-[var(--accent)]">
              <Clock size={16} strokeWidth={2.5} />
              <span className="text-sm font-bold uppercase tracking-wide opacity-90">
                Время
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
              {DURATION_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (duration !== value) {
                      impact("light");
                    }
                    setDuration(value);
                  }}
                  className={cn(
                    "flex-none h-9 px-4 rounded-xl text-[13px] font-bold transition-all active:scale-95 border",
                    duration === value
                      ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-ink)] shadow-md"
                      : "bg-[var(--surface-2)] border-transparent text-[var(--muted)] hover:bg-[var(--border)]",
                  )}
                >
                  {value} мин
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 mb-6">
            <button
              type="button"
              onClick={() => setShowRepeatOptions((open) => !open)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              <Repeat size={16} />
              <span>
                {repeat === "none"
                  ? "Без повтора"
                  : repeat === "daily"
                    ? "Каждый день"
                    : "Раз в неделю"}
              </span>
              <ChevronRight
                size={14}
                className={cn(
                  "transition-transform",
                  showRepeatOptions && "rotate-90",
                )}
              />
            </button>

            <AnimatePresence>
              {showRepeatOptions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 pt-3 pb-1">
                    {(
                      [
                        { id: "none", label: "Не повторять" },
                        { id: "daily", label: "Каждый день" },
                        { id: "weekly", label: "Раз в неделю" },
                      ] as Array<{ id: TaskRepeat; label: string }>
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          impact("light");
                          setRepeat(option.id);
                          if (option.id !== "none" && repeatCount < 1) {
                            setRepeatCount(
                              option.id === "weekly"
                                ? DEFAULT_REPEAT_COUNT_WEEKLY
                                : DEFAULT_REPEAT_COUNT_DAILY,
                            );
                          }
                        }}
                        className={cn(
                          "text-left px-4 py-3 rounded-xl text-[15px] font-medium transition-colors",
                          repeat === option.id
                            ? "bg-[var(--surface-2)] text-[var(--ink)]"
                            : "text-[var(--muted)] hover:bg-[var(--surface-2)]/50",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {repeat !== "none" && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--ink)]">
                  {repeatCountLabel}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRepeatCount((value) => clampRepeatCount(value - 1))
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
                      setRepeatCount((value) => clampRepeatCount(value + 1))
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

          <div className="h-2 shrink-0" />
        </form>

        <div className="p-5 pt-3 mt-auto bg-[var(--surface)] border-t border-[var(--border)]/30">
          <button
            type="button"
            onClick={requestSubmit}
            className="w-full h-12 rounded-xl bg-[var(--ink)] text-[var(--bg)] text-[16px] font-bold shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {mode === "create" ? "Создать" : "Сохранить"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
