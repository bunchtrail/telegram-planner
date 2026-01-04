"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Repeat, X, Clock, Palette } from "lucide-react";
import {
  AnimatePresence,
  motion,
  type AnimationDefinition,
  type PanInfo,
  type Transition,
  useDragControls,
} from "framer-motion";
import { cn } from "../lib/cn";
import { DEFAULT_TASK_COLOR, TASK_COLOR_OPTIONS } from "../lib/constants";
import { useHaptic } from "../hooks/useHaptic";
import type { TaskRepeat } from "../types/task";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

const SHEET_TRANSITION = {
  type: "spring",
  damping: 28,
  stiffness: 320,
  mass: 0.6,
} satisfies Transition;

const REPEAT_COUNT_MIN = 1;
const REPEAT_COUNT_MAX = 365;
const DEFAULT_REPEAT_COUNT_DAILY = 7;
const DEFAULT_REPEAT_COUNT_WEEKLY = 4;

type TaskSheetProps = {
  onClose: () => void;
  mode: "create" | "edit";
  initialTitle?: string;
  initialDuration?: number;
  initialRepeat?: TaskRepeat;
  initialRepeatCount?: number;
  initialColor?: string;
  onSubmit: (
    title: string,
    duration: number,
    repeat: TaskRepeat,
    repeatCount: number,
    color: string,
  ) => void;
};

export default function TaskSheet({
  onClose,
  mode,
  initialTitle = "",
  initialDuration = 30,
  initialRepeat = "none",
  initialRepeatCount = 7,
  initialColor = DEFAULT_TASK_COLOR,
  onSubmit,
}: TaskSheetProps) {
  const [title, setTitle] = useState(initialTitle);
  const [duration, setDuration] = useState(initialDuration);
  const [repeat, setRepeat] = useState<TaskRepeat>(initialRepeat);
  const [repeatCount, setRepeatCount] = useState(initialRepeatCount);
  const [color, setColor] = useState(initialColor);
  const [showRepeatOptions, setShowRepeatOptions] = useState(
    mode === "edit" || initialRepeat !== "none",
  );

  const [isSettled, setIsSettled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dragControls = useDragControls();
  const { impact, notification } = useHaptic();

  const adjustTextareaHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const handleClose = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsSettled(false);
    setTimeout(onClose, 10);
  }, [onClose]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    setIsDragging(false);
    const draggingDown = info.offset.y > 0;
    const fastDrag = info.velocity.y > 300;
    const farDrag = info.offset.y > 100;

    if (draggingDown && (fastDrag || farDrag)) {
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
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onSubmit(trimmed, duration, repeat, repeatCount, color);
  };

  const clampRepeatCount = (value: number) =>
    Math.min(Math.max(Math.floor(value), REPEAT_COUNT_MIN), REPEAT_COUNT_MAX);

  const repeatCountLabel =
    repeat === "weekly" ? "На сколько недель" : "На сколько дней";

  useEffect(() => {
    adjustTextareaHeight();
  }, [title, adjustTextareaHeight]);

  const handleAnimationComplete = useCallback(
    (definition: AnimationDefinition) => {
      const isOpening =
        definition === "visible" ||
        (typeof definition === "object" &&
          definition !== null &&
          !Array.isArray(definition) &&
          "y" in definition &&
          (definition as { y?: number | string }).y === 0);

      if (isOpening) {
        setIsSettled(true);
        if (mode === "create") {
          requestAnimationFrame(() => {
            setTimeout(() => {
              inputRef.current?.focus({ preventScroll: true });
            }, 50);
          });
        }
      }
    },
    [mode],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none touch-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
        onClick={handleClose}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={SHEET_TRANSITION}
        onAnimationStart={() => setIsSettled(false)}
        onAnimationComplete={handleAnimationComplete}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={0.05}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        transformTemplate={(_transforms, generatedTransform) =>
          isSettled && !isDragging ? "none" : generatedTransform
        }
        className="pointer-events-auto relative w-full bg-[var(--surface)] rounded-t-[28px] flex flex-col shadow-2xl max-w-lg mx-auto overflow-hidden"
        style={{
          maxHeight: "92dvh",
        }}
      >
        <div
          className="shrink-0 w-full pt-3 pb-0 z-20 bg-[var(--surface)] cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-[var(--border)] opacity-80" />
          </div>

          <div className="flex items-center justify-between px-5 pb-3">
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors active:scale-90"
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>

            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              className="px-5 py-2 bg-[var(--ink)] text-[var(--bg)] rounded-full font-bold text-[14px] shadow-md transition-all active:scale-95 hover:opacity-90 disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
              disabled={!title.trim()}
            >
              {mode === "create" ? "Создать" : "Сохранить"}
            </button>
          </div>
          <div className="h-px w-full bg-[var(--border)] opacity-60" />
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overflow-x-hidden px-0 pb-[max(env(safe-area-inset-bottom),24px)] pt-2 no-scrollbar touch-pan-y flex flex-col min-h-0"
        >
          <div className="px-6 py-4 shrink-0">
            <textarea
              ref={inputRef}
              rows={1}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              placeholder="Новая задача..."
              className="w-full bg-transparent text-[26px] font-bold text-[var(--ink)] placeholder:text-[var(--muted)]/40 resize-none outline-none leading-tight font-[var(--font-display)] min-h-[44px]"
            />
          </div>

          <div className="mb-6 shrink-0">
            <div className="px-6 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={14} /> Время выполнения
            </div>
            <div
              className="flex gap-2.5 overflow-x-auto no-scrollbar px-6 pb-2"
              style={{ touchAction: "pan-x pan-y" }}
            >
              {DURATION_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (duration !== value) impact("light");
                    setDuration(value);
                  }}
                  className={cn(
                    "flex-shrink-0 h-10 px-4 rounded-xl text-[14px] font-bold transition-all border",
                    duration === value
                      ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] shadow-md transform scale-[1.02]"
                      : "bg-[var(--surface-2)] text-[var(--ink)] border-transparent hover:border-[var(--border)] active:scale-95",
                  )}
                >
                  {value} мин
                </button>
              ))}
              <div className="w-2 shrink-0" />
            </div>
          </div>

          <div className="mb-6 shrink-0">
            <div className="px-6 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Palette size={14} /> Категория
            </div>
            <div
              className="flex gap-4 overflow-x-auto no-scrollbar px-6 py-2 items-center"
              style={{ touchAction: "pan-x pan-y" }}
            >
              {TASK_COLOR_OPTIONS.map((option) => {
                const isSelected = color === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      impact("light");
                      setColor(option);
                    }}
                    className={cn(
                      "relative w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-transform duration-200 outline-none",
                      isSelected
                        ? "scale-110"
                        : "active:scale-95 hover:scale-105 opacity-80",
                    )}
                    style={{
                      backgroundColor: option,
                      boxShadow: isSelected
                        ? `0 4px 16px -4px ${option}`
                        : "none",
                    }}
                    aria-pressed={isSelected}
                    aria-label="Выбрать цвет"
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="text-white drop-shadow-md"
                      >
                        <Check size={20} strokeWidth={4} />
                      </motion.div>
                    )}
                  </button>
                );
              })}
              <div className="w-2 shrink-0" />
            </div>
          </div>

          <div className="h-px bg-[var(--border)] mx-6 mb-2 opacity-50 shrink-0" />

          <div className="px-4 shrink-0">
            <button
              type="button"
              onClick={() => setShowRepeatOptions(!showRepeatOptions)}
              className="flex w-full items-center justify-between p-2.5 rounded-xl active:bg-[var(--surface-2)] transition-colors group"
            >
              <div className="flex items-center gap-4 ml-1">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                    repeat !== "none"
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "bg-[var(--surface-2)] text-[var(--muted)]",
                  )}
                >
                  <Repeat size={18} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[15px] font-semibold text-[var(--ink)]">
                    Повтор
                  </span>
                  <span
                    className={cn(
                      "text-[13px] font-medium transition-colors",
                      repeat !== "none"
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted)]",
                    )}
                  >
                    {repeat === "none"
                      ? "Не повторять"
                      : repeat === "daily"
                        ? "Каждый день"
                        : "Раз в неделю"}
                  </span>
                </div>
              </div>
              <ChevronRight
                size={20}
                className={cn(
                  "text-[var(--muted)] transition-transform duration-300",
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
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden pl-2 pr-2"
                >
                  <div className="pt-3 pb-4 space-y-4">
                    <div className="flex gap-2">
                      {[
                        { id: "none", label: "Нет" },
                        { id: "daily", label: "День" },
                        { id: "weekly", label: "Неделя" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            impact("light");
                            setRepeat(opt.id as TaskRepeat);
                            if (opt.id !== "none" && repeatCount < 1) {
                              setRepeatCount(
                                opt.id === "weekly"
                                  ? DEFAULT_REPEAT_COUNT_WEEKLY
                                  : DEFAULT_REPEAT_COUNT_DAILY,
                              );
                            }
                          }}
                          className={cn(
                            "flex-1 py-2 text-[13px] font-bold rounded-lg transition-all border",
                            repeat === opt.id
                              ? "bg-[var(--surface-2)] border-[var(--ink)]/20 text-[var(--ink)] shadow-sm"
                              : "border-transparent text-[var(--muted)] hover:bg-[var(--surface-2)]/50",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {repeat !== "none" && (
                      <div className="flex items-center justify-between p-3 bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-xl">
                        <span className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-wide">
                          {repeatCountLabel}
                        </span>
                        <div className="flex items-center gap-3 bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)] p-1">
                          <button
                            type="button"
                            onClick={() => {
                              impact("light");
                              setRepeatCount(clampRepeatCount(repeatCount - 1));
                            }}
                            className="w-8 h-8 flex items-center justify-center text-[var(--ink)] active:bg-[var(--border)] rounded transition-colors text-lg pb-0.5"
                          >
                            -
                          </button>
                          <span className="text-[15px] font-bold min-w-[24px] text-center tabular-nums">
                            {repeatCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              impact("light");
                              setRepeatCount(clampRepeatCount(repeatCount + 1));
                            }}
                            className="w-8 h-8 flex items-center justify-center text-[var(--ink)] active:bg-[var(--border)] rounded transition-colors text-lg pb-0.5"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-8 shrink-0" />
        </form>
      </motion.div>
    </div>
  );
}
