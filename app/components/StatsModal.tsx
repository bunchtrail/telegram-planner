"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Trophy, X } from "lucide-react";
import {
  format,
  subDays,
  isSameDay,
  startOfDay,
  isWithinInterval,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { Task } from "../types/task";
import { cn } from "../lib/cn";
import { isIOSDevice } from "../lib/platform";

type StatsModalProps = {
  onClose: () => void;
  streak: number;
  tasks: Task[];
  selectedDate: Date;
};

export default function StatsModal({
  onClose,
  streak,
  tasks,
  selectedDate,
}: StatsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isIOS = isIOSDevice();
  const reduceMotion = prefersReducedMotion || isIOS;

  const stats = useMemo(() => {
    const rangeEnd = startOfDay(selectedDate);
    const days = Array.from({ length: 7 }, (_, i) => subDays(rangeEnd, 6 - i));
    const rangeStart = days[0];
    const rangeLabel = `${format(rangeStart, "d MMM", { locale: ru })} — ${format(
      rangeEnd,
      "d MMM",
      { locale: ru },
    )}`;

    const dayIndexByKey = new Map<string, number>();
    days.forEach((day, index) => {
      dayIndexByKey.set(format(day, "yyyy-MM-dd"), index);
    });

    const counts = Array.from({ length: 7 }, () => 0);
    let rangeCompleted = 0;
    let rangeTotal = 0;
    let rangeElapsedMs = 0;

    for (const task of tasks) {
      const taskDay = startOfDay(task.date);
      const key = format(taskDay, "yyyy-MM-dd");
      const dayIndex = dayIndexByKey.get(key);
      if (dayIndex !== undefined && task.completed) {
        counts[dayIndex] += 1;
      }
      if (isWithinInterval(taskDay, { start: rangeStart, end: rangeEnd })) {
        rangeTotal += 1;
        rangeElapsedMs += task.elapsedMs;
        if (task.completed) rangeCompleted += 1;
      }
    }

    const maxCount = Math.max(1, ...counts);
    const chartData = days.map((day, i) => ({
      date: day,
      weekday: format(day, "EEE", { locale: ru }),
      dayLabel: format(day, "d", { locale: ru }),
      count: counts[i],
      heightPercent: (counts[i] / maxCount) * 100,
      isToday: isSameDay(day, rangeEnd),
    }));

    return {
      rangeLabel,
      chartData,
      rangeCompleted,
      rangeTotal,
      rangeElapsedMs,
    };
  }, [tasks, selectedDate]);

  const rangeHours = (stats.rangeElapsedMs / 3_600_000).toFixed(1);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center py-4 pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
        tabIndex={-1}
        initial={{ scale: reduceMotion ? 1 : 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: reduceMotion ? 1 : 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
        className="relative bg-[var(--surface)] w-full max-w-sm rounded-[32px] p-6 shadow-2xl overflow-hidden ring-1 ring-[var(--border)]"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2
              id="stats-title"
              className="text-2xl font-bold font-[var(--font-display)] text-[var(--ink)]"
            >
              Прогресс
            </h2>
            <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
              {stats.rangeLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-[var(--surface-2)] rounded-full text-[var(--muted)] hover:text-[var(--ink)] transition-colors active:scale-95"
            aria-label="Закрыть статистику"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-5 rounded-[24px] flex flex-col items-center border border-orange-500/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Flame size={48} />
            </div>
            <Flame
              className="text-orange-500 mb-2 drop-shadow-sm relative z-10"
              size={32}
              fill="currentColor"
            />
            <div className="text-3xl font-black text-[var(--ink)] tabular-nums relative z-10">
              {streak}
            </div>
            <div className="text-[10px] font-bold uppercase text-[var(--muted)] tracking-wider relative z-10">
              Серия дней
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-5 rounded-[24px] flex flex-col items-center border border-blue-500/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Trophy size={48} />
            </div>
            <Trophy
              className="text-blue-500 mb-2 drop-shadow-sm relative z-10"
              size={32}
              fill="currentColor"
            />
            <div className="text-3xl font-black text-[var(--ink)] tabular-nums relative z-10">
              {rangeHours}
            </div>
            <div className="text-[10px] font-bold uppercase text-[var(--muted)] tracking-wider relative z-10">
              Часов фокуса
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface-2)]/50 p-5 rounded-[24px] border border-[var(--border)]">
          <div className="flex justify-between items-center mb-6">
            <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Выполнено
            </div>
            <div className="text-xs font-bold text-[var(--ink)] bg-[var(--surface)] px-2 py-1 rounded-lg border border-[var(--border)] shadow-sm">
              {stats.rangeCompleted} / {stats.rangeTotal}
            </div>
          </div>

          <div className="flex items-end justify-between h-32 gap-2">
            {stats.chartData.map((data, index) => (
              <div
                key={`bar-${index}`}
                className="flex-1 flex flex-col items-center gap-2 group"
              >
                <div className="w-full h-full flex items-end relative">
                  <div className="absolute inset-x-1 bottom-0 top-0 bg-[var(--border)]/40 rounded-full" />

                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${data.heightPercent}%` }}
                    transition={{
                      type: "spring",
                      stiffness: 150,
                      damping: 18,
                      delay: reduceMotion ? 0 : index * 0.05,
                    }}
                    className={cn(
                      "w-full mx-1 rounded-full relative min-h-[6px] transition-colors duration-300",
                      data.isToday
                        ? "bg-[var(--accent)] shadow-[0_0_12px_-2px_var(--accent)]"
                        : "bg-[var(--ink)]/80 opacity-60 group-hover:opacity-80",
                      data.count === 0 && "bg-transparent",
                    )}
                  />
                </div>

                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide transition-colors",
                    data.isToday
                      ? "text-[var(--accent)]"
                      : "text-[var(--muted)]",
                  )}
                >
                  {data.weekday}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
