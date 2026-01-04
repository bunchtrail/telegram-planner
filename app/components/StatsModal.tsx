"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Trophy, X } from "lucide-react";
import { format, subDays, isSameDay, startOfDay, isWithinInterval } from "date-fns";
import { ru } from "date-fns/locale";
import type { Task } from "../types/task";
import { cn } from "../lib/cn";

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
  const reduceMotion = useReducedMotion();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
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
        initial={{ scale: reduceMotion ? 1 : 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: reduceMotion ? 1 : 0.95, opacity: 0 }}
        className="relative bg-[var(--surface)] w-full max-w-sm rounded-[32px] p-6 shadow-2xl overflow-hidden"
      >
        <div className="flex justify-between items-center">
          <h2
            id="stats-title"
            className="text-xl font-bold font-[var(--font-display)]"
          >
            Статистика
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-[var(--surface-2)] rounded-full"
            aria-label="Закрыть статистику"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-[11px] font-semibold text-[var(--muted)] mt-1">
          Неделя: {stats.rangeLabel}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5 mb-5">
          <div className="bg-orange-500/10 p-5 rounded-2xl flex flex-col items-center border border-orange-500/20">
            <Flame className="text-orange-500 mb-2" size={32} fill="currentColor" />
            <div className="text-3xl font-black text-[var(--ink)]">
              {streak}
            </div>
            <div className="text-[10px] font-bold uppercase text-[var(--muted)]">
              Серия дней
            </div>
          </div>

          <div className="bg-blue-500/10 p-5 rounded-2xl flex flex-col items-center border border-blue-500/20">
            <Trophy className="text-blue-500 mb-2" size={32} fill="currentColor" />
            <div className="text-3xl font-black text-[var(--ink)]">
              {rangeHours}ч
            </div>
            <div className="text-[10px] font-bold uppercase text-[var(--muted)]">
              Фокус (7 дней)
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface-2)] p-4 rounded-2xl">
          <div className="text-xs font-bold text-[var(--muted)] mb-4 uppercase">
            Завершено: {stats.rangeCompleted}
            {stats.rangeTotal > 0 ? ` из ${stats.rangeTotal}` : ""}
          </div>
          <div className="flex items-end justify-between h-28 gap-2">
            {stats.chartData.map((data, index) => (
              <div key={`bar-${index}`} className="flex-1 flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "text-[10px] font-semibold text-[var(--ink)]",
                    data.count === 0 && "opacity-30",
                    data.isToday && "text-[var(--accent)]",
                  )}
                >
                  {data.count > 0 ? data.count : "•"}
                </span>
                <div className="w-full bg-[var(--bg)] rounded-t-lg relative overflow-hidden flex items-end">
                  {data.heightPercent === 0 && (
                    <div className="w-full h-1 bg-[var(--muted)]/20 rounded-full" />
                  )}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${data.heightPercent}%` }}
                    transition={{
                      delay: reduceMotion ? 0 : index * 0.05,
                      duration: reduceMotion ? 0 : 0.4,
                    }}
                    className={cn(
                      "w-full rounded-t-lg min-h-[4px]",
                      data.isToday
                        ? "bg-[var(--accent)] opacity-100"
                        : "bg-[var(--accent)] opacity-70",
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-[var(--muted)] opacity-70 uppercase">
            {stats.chartData.map((data, idx) => (
              <span
                key={idx}
                className={cn(
                  "w-full text-center flex flex-col items-center",
                  data.isToday && "text-[var(--accent)] opacity-100",
                )}
              >
                <span>{data.weekday}</span>
                <span className="text-[9px] opacity-60">{data.dayLabel}</span>
              </span>
            ))}
          </div>
          <ul className="sr-only">
            {stats.chartData.map((data) => (
              <li key={data.date.toISOString()}>
                {format(data.date, "d MMM", { locale: ru })}: {data.count}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
