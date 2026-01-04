"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Repeat, Palette } from "lucide-react";
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
  stiffness: 300,
  mass: 0.8,
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
            inputRef.current?.focus({ preventScroll: true });
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
        className="pointer-events-auto relative w-full bg-[var(--bg)] shadow-[var(--shadow-pop)] rounded-t-[32px] flex flex-col overflow-hidden max-w-lg mx-auto"
        style={{
          maxHeight: "90dvh",
        }}
      >
        <div
          className="shrink-0 w-full pt-3 pb-2 z-20 bg-[var(--bg)] cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1.5 rounded-full bg-[var(--muted)]/20" />
          </div>

          <div className="flex items-center justify-between px-6">
            <button
              type="button"
              onClick={handleClose}
              className="text-[17px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors py-2 -ml-2 active:opacity-60"
            >
              Отмена
            </button>
            <span className="font-bold text-[15px] opacity-40 uppercase tracking-widest select-none pointer-events-none font-[var(--font-display)]">
              {mode === "create" ? "Новая" : "Правка"}
            </span>
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              className="text-[17px] font-bold text-[var(--accent)] hover:opacity-80 transition-opacity py-2 -mr-2 active:opacity-60"
            >
              Готово
            </button>
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),24px)] pt-2 no-scrollbar touch-pan-y gap-4 flex flex-col"
        >
          <div className="bg-[var(--surface)] rounded-[24px] p-4 shadow-sm">
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
              placeholder="Что нужно сделать?"
              className="w-full bg-transparent text-[22px] font-bold text-[var(--ink)] placeholder:text-[var(--muted)]/40 resize-none outline-none leading-snug font-[var(--font-display)]"
              style={{
                minHeight: "40px",
                transform: "none",
                WebkitTransform: "none",
              }}
            />
          </div>

          <div className="bg-[var(--surface)] rounded-[24px] p-2 shadow-sm overflow-hidden">
            <div
              className="flex gap-1 overflow-x-auto no-scrollbar p-1"
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
                    "flex-1 min-w-[50px] py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap",
                    duration === value
                      ? "bg-[var(--bg)] text-[var(--ink)] shadow-sm scale-100 ring-1 ring-[var(--border)]"
                      : "text-[var(--muted)] hover:bg-[var(--bg)]/50 active:scale-95",
                  )}
                >
                  {value} мин
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-[24px] py-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3 px-6 text-[var(--muted)]">
              <Palette size={14} />
              <span className="text-xs font-bold uppercase tracking-widest">
                Категория
              </span>
            </div>

            <div
              className="flex gap-4 overflow-x-auto no-scrollbar px-6 items-center pb-1"
              style={{ touchAction: "pan-x pan-y" }}
            >
              {TASK_COLOR_OPTIONS.map((option) => {
                const isSelected = color === option;
                return (
                  <motion.button
                    key={option}
                    type="button"
                    onClick={() => {
                      impact("light");
                      setColor(option);
                    }}
                    className={cn(
                      "relative w-11 h-11 flex-shrink-0 rounded-full shadow-sm flex items-center justify-center transition-all",
                      isSelected
                        ? "ring-2 ring-offset-2 ring-[var(--surface)] ring-[var(--ink)]/20"
                        : "hover:scale-105 active:scale-95",
                    )}
                    style={{ backgroundColor: option }}
                    aria-pressed={isSelected}
                    aria-label="Выбрать категорию"
                    animate={{
                      scale: isSelected ? 1.15 : 1,
                    }}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-white drop-shadow-md"
                      >
                        <Check size={18} strokeWidth={4} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-[24px] p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setShowRepeatOptions(!showRepeatOptions)}
              className="flex w-full items-center justify-between p-3 rounded-xl hover:bg-[var(--bg)]/50 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg)] text-[var(--ink)] shadow-sm">
                  <Repeat size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[15px] font-semibold text-[var(--ink)]">
                  Повтор
                </span>
              </div>
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <span className="text-[14px] font-medium">
                  {repeat === "none"
                    ? "Нет"
                    : repeat === "daily"
                      ? "Ежедневно"
                      : "Еженедельно"}
                </span>
                <ChevronRight
                  size={16}
                  className={cn(
                    "transition-transform duration-300",
                    showRepeatOptions && "rotate-90",
                  )}
                />
              </div>
            </button>

            <AnimatePresence>
              {showRepeatOptions && (
                <motion.div
                  key="repeat-options"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-1 pt-0 pb-1 space-y-1">
                    <div className="h-px bg-[var(--border)] mx-3 my-1 opacity-50" />

                    <div className="flex flex-col gap-1">
                      {[
                        { id: "none", label: "Не повторять" },
                        { id: "daily", label: "Каждый день" },
                        { id: "weekly", label: "Раз в неделю" },
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
                            "w-full text-left px-3 py-2.5 text-[14px] rounded-lg transition-all flex items-center justify-between",
                            repeat === opt.id
                              ? "bg-[var(--bg)] text-[var(--ink)] font-bold shadow-sm"
                              : "text-[var(--ink)]/80 font-medium active:bg-[var(--border)]/50",
                          )}
                        >
                          {opt.label}
                          {repeat === opt.id && (
                            <motion.div
                              layoutId="check"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-[var(--accent)]"
                            >
                              <Check size={16} strokeWidth={3} />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>

                    {repeat !== "none" && (
                      <div className="mt-2 flex items-center justify-between px-3 py-2 bg-[var(--bg)] rounded-xl border border-[var(--border)]/30">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">
                          {repeatCountLabel}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              impact("light");
                              setRepeatCount(clampRepeatCount(repeatCount - 1));
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-[var(--surface)] text-[var(--ink)] rounded-lg active:scale-90 transition-transform font-bold text-lg shadow-sm hover:bg-[var(--border)]"
                          >
                            -
                          </button>
                          <span className="text-[15px] font-bold min-w-[20px] text-center tabular-nums">
                            {repeatCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              impact("light");
                              setRepeatCount(clampRepeatCount(repeatCount + 1));
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-[var(--surface)] text-[var(--ink)] rounded-lg active:scale-90 transition-transform font-bold text-lg shadow-sm hover:bg-[var(--border)]"
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
        </form>
      </motion.div>
    </div>
  );
}
