"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Repeat } from "lucide-react";
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
  damping: 30,
  stiffness: 340,
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
    el.style.height = "80px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
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
    if (info.offset.y > 100 || info.velocity.y > 400) {
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
        (Array.isArray(definition) && definition.includes("visible")) ||
        (typeof definition === "object" &&
          definition !== null &&
          "y" in definition &&
          (definition as { y?: number | string }).y === 0);

      if (isOpening) {
        setIsSettled(true);
      }

      if (isOpening && mode === "create") {
        requestAnimationFrame(() => {
          inputRef.current?.focus({ preventScroll: true });
        });
      }
    },
    [mode],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none"
      style={{ touchAction: "none" }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
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
        className="pointer-events-auto relative w-full max-w-[96%] mx-auto mb-3 bg-[var(--surface)] shadow-[var(--shadow-pop)] rounded-[32px] flex flex-col overflow-hidden"
        style={{
          maxHeight: "90dvh",
          paddingTop:
            "calc(max(env(safe-area-inset-top), var(--tg-content-safe-top, 0px)) + 12px)",
          paddingBottom:
            "max(env(safe-area-inset-bottom), var(--tg-content-safe-bottom, 20px))",
        }}
      >
        <div
          className="flex justify-center pt-3 pb-1 w-full touch-none cursor-grab active:cursor-grabbing shrink-0 z-10"
          onPointerDown={(event) => dragControls.start(event)}
        >
          <div className="w-12 h-1.5 bg-[var(--border)] rounded-full opacity-60" />
        </div>

        <div className="flex items-center justify-between px-6 pt-8 pb-2 shrink-0 z-10">
          <button
            type="button"
            onClick={handleClose}
            className="text-[17px] text-[var(--muted)] hover:opacity-70 transition-opacity p-2 -ml-2"
          >
            Отмена
          </button>
          <span className="font-bold text-[15px] opacity-50 uppercase tracking-widest">
            {mode === "create" ? "Новая" : "Правка"}
          </span>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            className="text-[17px] font-bold text-[var(--accent)] hover:opacity-70 transition-opacity p-2 -mr-2"
          >
            Готово
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col min-h-0 overflow-y-auto overscroll-contain px-6 pb-8 no-scrollbar"
        >
          <div className="py-4">
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
              className="w-full bg-transparent text-[24px] font-bold text-[var(--ink)] placeholder:text-[var(--muted)]/30 resize-none outline-none leading-snug"
              style={{
                minHeight: "80px",
                transform: "none",
                WebkitTransform: "none",
              }}
            />
          </div>

          <div className="space-y-6 mt-2">
            <div className="bg-[var(--surface-2)]/60 p-1.5 rounded-2xl flex gap-1 overflow-x-auto no-scrollbar">
              {DURATION_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (duration !== value) impact("light");
                    setDuration(value);
                  }}
                  className={cn(
                    "flex-1 min-w-[50px] py-2 rounded-xl text-[13px] font-bold transition-all",
                    duration === value
                      ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                      : "text-[var(--muted)] hover:bg-[var(--surface)]/50",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">
                Категория
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 py-4 touch-pan-x items-center">
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
                        "relative w-11 h-11 rounded-full shadow-[var(--shadow-soft)] flex items-center justify-center transition-all",
                        isSelected
                          ? "ring-2 ring-offset-2 ring-[var(--surface)] ring-[var(--ink)]/20"
                          : "hover:scale-105",
                      )}
                      style={{ backgroundColor: option }}
                      aria-pressed={isSelected}
                      aria-label="Выбрать категорию"
                      animate={{
                        scale: isSelected ? 1.15 : 1,
                      }}
                      whileTap={{ scale: 0.95 }}
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

            <div className="rounded-[24px] bg-[var(--surface-2)] p-2">
              <button
                type="button"
                onClick={() => setShowRepeatOptions(!showRepeatOptions)}
                className="flex w-full items-center justify-between p-3 rounded-2xl hover:bg-[var(--surface)]/60 transition-colors active:scale-[0.98]"
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
                                ? "bg-[var(--surface)] text-[var(--ink)] font-bold shadow-sm"
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
                        <div className="mt-2 flex items-center justify-between px-3 py-2 bg-[var(--surface)] rounded-xl border border-[var(--border)]/30">
                          <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">
                            {repeatCountLabel}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                impact("light");
                                setRepeatCount(
                                  clampRepeatCount(repeatCount - 1),
                                );
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-[var(--surface-2)] text-[var(--ink)] rounded-lg active:scale-90 transition-transform font-bold text-lg"
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
                                setRepeatCount(
                                  clampRepeatCount(repeatCount + 1),
                                );
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-[var(--surface-2)] text-[var(--ink)] rounded-lg active:scale-90 transition-transform font-bold text-lg"
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
          </div>
        </form>
      </motion.div>
    </div>
  );
}
