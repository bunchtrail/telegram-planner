"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Bell,
  Check,
  ChevronRight,
  Clock,
  Palette,
  Repeat,
  X,
} from "lucide-react";
import { isSameDay } from "date-fns";
import {
  motion,
  type AnimationDefinition,
  type PanInfo,
  type Transition,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import { cn } from "../lib/cn";
import { DEFAULT_TASK_COLOR, TASK_COLOR_OPTIONS } from "../lib/constants";
import { useHaptic } from "../hooks/useHaptic";
import type { TaskRepeat } from "../types/task";
import { isIOSDevice } from "../lib/platform";
import TimeGridPicker from "./TimeGridPicker";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

const SHEET_TRANSITION = {
  type: "spring",
  damping: 32,
  stiffness: 400,
  mass: 1,
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
  initialStartMinutes?: number | null;
  initialRemindBeforeMinutes?: number;
  taskDate: Date;
  onSubmit: (
    title: string,
    duration: number,
    repeat: TaskRepeat,
    repeatCount: number,
    color: string,
    startMinutes: number | null,
    remindBeforeMinutes: number,
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
  initialStartMinutes = null,
  initialRemindBeforeMinutes = 0,
  taskDate,
  onSubmit,
}: TaskSheetProps) {
  const [title, setTitle] = useState(initialTitle);
  const [duration, setDuration] = useState(initialDuration);
  const [repeat, setRepeat] = useState<TaskRepeat>(initialRepeat);
  const [repeatCount, setRepeatCount] = useState(initialRepeatCount);
  const [color, setColor] = useState(initialColor);
  const [startMinutes, setStartMinutes] = useState<number | null>(
    initialStartMinutes,
  );
  const [remindBeforeMinutes, setRemindBeforeMinutes] = useState(
    initialRemindBeforeMinutes,
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRepeatOptions, setShowRepeatOptions] = useState(
    mode === "edit" || initialRepeat !== "none",
  );

  const [isSettled, setIsSettled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [timeDetailsHeight, setTimeDetailsHeight] = useState<number | "auto">(
    "auto",
  );
  const [repeatDetailsHeight, setRepeatDetailsHeight] = useState<number | "auto">(
    "auto",
  );

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timeDetailsRef = useRef<HTMLDivElement>(null);
  const repeatDetailsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const { impact, notification } = useHaptic();
  const prefersReducedMotion = useReducedMotion();
  const isIOS = isIOSDevice();
  const reduceMotion = prefersReducedMotion || isIOS;
  const formatMinutes = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(
      value % 60,
    ).padStart(2, "0")}`;
  const defaultPickerMinutes = (() => {
    const now = new Date();
    return isSameDay(taskDate, now) ? now.getHours() * 60 : 12 * 60;
  })();

  const adjustTextareaHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
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
    const effectiveRemindBefore =
      startMinutes == null ? 0 : remindBeforeMinutes;
    onSubmit(
      trimmed,
      duration,
      repeat,
      repeatCount,
      color,
      startMinutes,
      effectiveRemindBefore,
    );
  };

  const clampRepeatCount = (value: number) =>
    Math.min(Math.max(Math.floor(value), REPEAT_COUNT_MIN), REPEAT_COUNT_MAX);

  const repeatCountLabel =
    repeat === "weekly" ? "На сколько недель" : "На сколько дней";

  useEffect(() => {
    adjustTextareaHeight();
  }, [title, adjustTextareaHeight]);

  useLayoutEffect(() => {
    if (!showTimePicker) return;
    const el = timeDetailsRef.current;
    if (!el) return;

    const updateHeight = () => setTimeDetailsHeight(el.scrollHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTimePicker, duration]);

  useLayoutEffect(() => {
    if (!showRepeatOptions) return;
    const el = repeatDetailsRef.current;
    if (!el) return;

    const updateHeight = () => setRepeatDetailsHeight(el.scrollHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [showRepeatOptions, repeat, repeatCount]);

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
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
        onClick={handleClose}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={reduceMotion ? { duration: 0 } : SHEET_TRANSITION}
        onAnimationStart={() => setIsSettled(false)}
        onAnimationComplete={handleAnimationComplete}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={reduceMotion ? 0 : 0.05}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        transformTemplate={(_transforms, generatedTransform) =>
          isSettled && !isDragging ? "none" : generatedTransform
        }
        className="pointer-events-auto relative w-full bg-[var(--surface)] rounded-t-[32px] flex flex-col shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] max-w-lg mx-auto overflow-hidden ring-1 ring-inset ring-[var(--border)]"
        style={{
          maxHeight: "92dvh",
        }}
      >
        <div
          className="shrink-0 w-full pt-4 pb-2 z-20 bg-[var(--surface)] cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1.5 rounded-full bg-[var(--muted)]/20" />
          </div>

          <div className="flex items-center justify-between px-6 pb-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors active:scale-90"
              aria-label="Закрыть"
            >
              <X size={24} strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              className={cn(
                "h-10 px-6 rounded-full font-bold text-[15px] shadow-lg transition-all active:scale-95 hover:brightness-110 disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 flex items-center gap-2",
                mode === "create"
                  ? "bg-[var(--ink)] text-[var(--bg)] shadow-[var(--ink)]/20"
                  : "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--accent)]/30",
              )}
              disabled={!title.trim()}
            >
              {mode === "create" ? "Создать" : "Сохранить"}
            </button>
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overflow-x-hidden px-0 pb-[max(env(safe-area-inset-bottom),32px)] pt-0 no-scrollbar touch-pan-y flex flex-col min-h-0"
        >
          <div className="px-6 py-2 shrink-0">
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
              className="w-full bg-transparent text-[32px] font-bold text-[var(--ink)] placeholder:text-[var(--muted)]/30 resize-none outline-none leading-tight font-[var(--font-display)] min-h-[50px] tracking-tight transition-colors"
              style={{ caretColor: color }}
            />
          </div>

          <div className="flex flex-col gap-8 mt-4">
            <div className="shrink-0 px-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest flex items-center gap-2 opacity-80">
                  <Clock size={12} strokeWidth={3} /> Время начала
                </div>
                {startMinutes != null && (
                  <button
                    type="button"
                    onClick={() => {
                      impact("medium");
                      setStartMinutes(null);
                      setRemindBeforeMinutes(0);
                      setShowTimePicker(false);
                    }}
                    className="text-[11px] font-bold text-[var(--danger)] uppercase active:scale-95 transition-transform"
                  >
                    Сбросить
                  </button>
                )}
              </div>

              <div className="bg-[var(--surface-2)]/50 rounded-[24px] border border-[var(--border)]/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTimePicker((prev) => !prev)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 transition-colors",
                    showTimePicker
                      ? "bg-[var(--surface-2)]"
                      : "active:bg-[var(--surface-2)]",
                  )}
                >
                  <span
                    className={cn(
                      "text-[17px] font-bold tabular-nums",
                      startMinutes != null
                        ? "text-[var(--ink)]"
                        : "text-[var(--muted)]",
                    )}
                  >
                    {startMinutes != null
                      ? formatMinutes(startMinutes)
                      : "Без времени"}
                  </span>
                  <div
                    className={cn(
                      "text-[13px] font-bold text-[var(--accent)] transition-transform flex items-center gap-1",
                      showTimePicker && "rotate-180",
                    )}
                  >
                    {showTimePicker ? "Свернуть" : "Изменить"}
                    <ChevronRight size={16} className="rotate-90" />
                  </div>
                </button>

                <motion.div
                  initial={false}
                  animate={{ height: showTimePicker ? timeDetailsHeight : 0 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    ref={timeDetailsRef}
                    className="p-4 pt-0 border-t border-[var(--border)]/30"
                    onPointerDown={() => impact("light")}
                  >
                    <TimeGridPicker
                      valueMinutes={startMinutes}
                      durationMinutes={duration}
                      defaultMinutes={defaultPickerMinutes}
                      onChange={(value) => {
                        setStartMinutes(value);
                      }}
                    />
                  </div>
                </motion.div>
              </div>
            </div>

            {startMinutes != null && (
              <div className="shrink-0 px-6">
                <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 flex items-center gap-2 opacity-80">
                  <Bell size={12} strokeWidth={3} /> Напомнить
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[0, 5, 10, 30, 60].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        impact("light");
                        setRemindBeforeMinutes(value);
                      }}
                      className={cn(
                        "h-9 px-4 rounded-2xl text-[13px] font-bold border transition-all",
                        remindBeforeMinutes === value
                          ? "bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm"
                          : "bg-[var(--surface-2)] text-[var(--ink)] border-transparent",
                      )}
                    >
                      {value === 0 ? "В момент" : `За ${value} мин`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-[var(--border)] mx-6 opacity-60 shrink-0" />

            <div className="shrink-0 relative">
              <div className="px-6 text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                <Clock size={12} strokeWidth={3} /> Длительность
              </div>

              <div className="absolute left-0 top-8 bottom-0 w-6 bg-gradient-to-r from-[var(--surface)] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-8 bottom-0 w-6 bg-gradient-to-l from-[var(--surface)] to-transparent z-10 pointer-events-none" />

              <div
                className="flex gap-2 overflow-x-auto no-scrollbar px-6 pb-2"
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
                      "flex-shrink-0 h-11 px-5 rounded-2xl text-[15px] font-bold transition-all border duration-200",
                      duration === value
                        ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] shadow-md scale-100"
                        : "bg-[var(--surface-2)] text-[var(--ink)] border-transparent hover:border-[var(--border)] active:scale-95",
                    )}
                  >
                    {value} м
                  </button>
                ))}
                <div className="w-4 shrink-0" />
              </div>
            </div>

            <div className="shrink-0 relative">
              <div className="px-6 text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                <Palette size={12} strokeWidth={3} /> Цвет задачи
              </div>

              <div className="absolute left-0 top-8 bottom-0 w-6 bg-gradient-to-r from-[var(--surface)] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-8 bottom-0 w-6 bg-gradient-to-l from-[var(--surface)] to-transparent z-10 pointer-events-none" />

              <div
                className="flex gap-5 overflow-x-auto no-scrollbar px-6 py-2 items-center"
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
                        "relative w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 outline-none",
                        isSelected
                          ? "scale-110 ring-2 ring-offset-2 ring-offset-[var(--surface)]"
                          : "active:scale-95 hover:scale-105 opacity-80 hover:opacity-100",
                      )}
                      style={{
                        backgroundColor: option,
                        boxShadow: isSelected
                          ? `0 8px 20px -6px ${option}80`
                          : "none",
                        borderColor: isSelected ? option : "transparent",
                      }}
                      aria-pressed={isSelected}
                      aria-label="Выбрать цвет"
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          }}
                          className="text-white drop-shadow-md"
                        >
                          <Check size={22} strokeWidth={3.5} />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
                <div className="w-4 shrink-0" />
              </div>
            </div>

            <div className="h-px bg-[var(--border)] mx-6 opacity-60 shrink-0" />

            <div className="px-4 shrink-0 mb-6">
              <div className="bg-[var(--surface-2)]/40 rounded-[24px] overflow-hidden border border-[var(--border)]/50">
                <button
                  type="button"
                  onClick={() => setShowRepeatOptions(!showRepeatOptions)}
                  className="flex w-full items-center justify-between p-4 active:bg-[var(--surface-2)] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors shadow-sm",
                        repeat !== "none"
                          ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                          : "bg-[var(--surface)] text-[var(--muted)]",
                      )}
                    >
                      <Repeat size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-[16px] font-bold text-[var(--ink)]">
                        Повторение
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
                          ? "Одноразовая задача"
                          : repeat === "daily"
                            ? "Ежедневно"
                            : "Еженедельно"}
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

                <motion.div
                  initial={false}
                  animate={{
                    height: showRepeatOptions ? repeatDetailsHeight : 0,
                    opacity: showRepeatOptions ? 1 : 0,
                  }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.18, ease: "easeOut" }
                  }
                  className="overflow-hidden"
                  style={{ pointerEvents: showRepeatOptions ? "auto" : "none" }}
                >
                  <div ref={repeatDetailsRef} className="px-4 pb-4 space-y-4 pt-2">
                        <div className="flex bg-[var(--surface-2)] p-1 rounded-[14px] relative z-0">
                          {[
                            { id: "none", label: "Нет" },
                            { id: "daily", label: "День" },
                            { id: "weekly", label: "Неделя" },
                          ].map((opt) => {
                            const isActive = repeat === opt.id;
                            return (
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
                                  "relative flex-1 py-2.5 text-[13px] font-bold rounded-[10px] transition-all z-10",
                                  isActive
                                    ? "text-[var(--ink)]"
                                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                                )}
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="repeat-tab"
                                    className="absolute inset-0 bg-[var(--surface)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-[10px] -z-10 border border-[var(--border)]"
                                    transition={{
                                      type: "spring",
                                      bounce: reduceMotion ? 0 : 0.2,
                                      duration: reduceMotion ? 0 : 0.4,
                                    }}
                                  />
                                )}
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        {repeat !== "none" && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between px-1"
                          >
                            <span className="text-[13px] font-bold text-[var(--muted)] uppercase tracking-wide">
                              {repeatCountLabel}
                            </span>
                            <div className="flex items-center gap-3 bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  impact("light");
                                  setRepeatCount(
                                    clampRepeatCount(repeatCount - 1),
                                  );
                                }}
                                className="w-9 h-9 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-2)] active:scale-90 rounded-lg transition-all text-xl font-medium"
                              >
                                -
                              </button>
                              <span className="text-[17px] font-bold min-w-[32px] text-center tabular-nums text-[var(--ink)]">
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
                                className="w-9 h-9 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-2)] active:scale-90 rounded-lg transition-all text-xl font-medium"
                              >
                                +
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                </motion.div>
              </div>
            </div>
          </div>
          <div className="h-6 shrink-0" />
        </form>
      </motion.div>
    </div>
  );
}
