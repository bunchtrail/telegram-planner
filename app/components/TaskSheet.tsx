"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Clock, Repeat, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  type Transition,
  useDragControls,
} from "framer-motion";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";
import type { TaskRepeat } from "../types/task";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const SHEET_TRANSITION: Transition = {
  type: "spring",
  damping: 28,
  stiffness: 350,
};
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
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  };

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
  }, [initialDuration, initialRepeat, initialRepeatCount, initialTitle, isOpen, mode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-colors"
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
        className="pointer-events-auto relative w-full bg-[var(--surface)] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[92dvh]"
        style={{
          paddingBottom:
            "max(env(safe-area-inset-bottom), var(--tg-content-safe-bottom, 0px))",
        }}
      >
        <div
          className="flex justify-center pt-4 pb-2 w-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(event) => dragControls.start(event)}
        >
          <div className="w-12 h-1.5 bg-[var(--border)] rounded-full opacity-50" />
        </div>

        <div className="px-6 pb-2 flex items-center justify-between shrink-0">
          <h2 className="text-[15px] font-bold text-[var(--ink)]">
            {mode === "create" ? "Новая задача" : "Редактирование"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Закрыть"
            className="p-2 -mr-2 bg-[var(--surface-2)] rounded-full text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col min-h-0 overflow-y-auto overscroll-contain px-6"
        >
          <div className="py-4">
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
                  if (formRef.current?.requestSubmit) {
                    formRef.current.requestSubmit();
                  } else {
                    formRef.current?.dispatchEvent(
                      new Event("submit", { bubbles: true, cancelable: true }),
                    );
                  }
                }
              }}
              placeholder="Что планируете сделать?"
              className="w-full bg-transparent text-[22px] font-bold text-[var(--ink)] placeholder:text-[var(--muted)]/40 resize-none outline-none leading-tight"
              style={{ minHeight: "44px" }}
            />
          </div>

          <div className="space-y-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-3 text-[var(--muted)]">
                <Clock size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Длительность
                </span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
                {DURATION_PRESETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      if (duration !== value) impact("light");
                      setDuration(value);
                    }}
                    className={cn(
                      "flex-none h-10 px-5 rounded-2xl text-[14px] font-bold transition-all active:scale-95 shadow-sm ring-1",
                      duration === value
                        ? "bg-[var(--ink)] text-[var(--bg)] ring-[var(--ink)] shadow-lg"
                        : "bg-[var(--surface)] ring-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
                    )}
                  >
                    {value} мин
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-[var(--surface-2)] p-1.5">
              <button
                type="button"
                onClick={() => setShowRepeatOptions(!showRepeatOptions)}
                className="flex w-full items-center justify-between p-3 rounded-2xl hover:bg-[var(--surface)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Repeat size={16} />
                  </div>
                  <span className="text-[15px] font-semibold">Повтор</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--muted)]">
                  <span className="text-sm">
                    {repeat === "none"
                      ? "Нет"
                      : repeat === "daily"
                        ? "Ежедневно"
                        : "Еженедельно"}
                  </span>
                  <ChevronRight
                    size={16}
                    className={cn(
                      "transition-transform",
                      showRepeatOptions && "rotate-90",
                    )}
                  />
                </div>
              </button>

              <AnimatePresence>
                {showRepeatOptions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 pt-1 space-y-1">
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
                            "w-full text-left px-4 py-3 rounded-xl text-[14px] font-medium transition-colors",
                            repeat === opt.id
                              ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                              : "text-[var(--muted)] hover:bg-[var(--surface)]/50",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}

                      {repeat !== "none" && (
                        <div className="mt-2 flex items-center justify-between px-4 py-2">
                          <span className="text-sm font-medium text-[var(--muted)]">
                            {repeatCountLabel}
                          </span>
                          <div className="flex items-center gap-3 bg-[var(--surface)] rounded-xl p-1 shadow-sm border border-[var(--border)]">
                            <button
                              type="button"
                              onClick={() =>
                                setRepeatCount(clampRepeatCount(repeatCount - 1))
                              }
                              aria-label="Уменьшить"
                              className="w-8 h-8 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-2)] rounded-lg"
                            >
                              -
                            </button>
                            <span className="text-sm font-bold min-w-[20px] text-center">
                              {repeatCount}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRepeatCount(clampRepeatCount(repeatCount + 1))
                              }
                              aria-label="Увеличить"
                              className="w-8 h-8 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-2)] rounded-lg"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs font-semibold text-[var(--muted)] mr-2">
                            {repeatCountUnit}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </form>

        <div className="p-6 pt-2 mt-auto bg-[var(--surface)]">
          <button
            type="button"
            onClick={() => {
              if (formRef.current?.requestSubmit) {
                formRef.current.requestSubmit();
              } else {
                formRef.current?.dispatchEvent(
                  new Event("submit", { bubbles: true, cancelable: true }),
                );
              }
            }}
            className="w-full h-14 rounded-2xl bg-[var(--ink)] text-[var(--bg)] text-[17px] font-bold shadow-xl shadow-[var(--ink)]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {mode === "create" ? "Создать задачу" : "Сохранить"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
