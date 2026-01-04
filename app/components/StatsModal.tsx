"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Trophy, X } from "lucide-react";
import { format, subDays, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import type { Task } from "../types/task";

type StatsModalProps = {
  onClose: () => void;
  streak: number;
  tasks: Task[];
};

export default function StatsModal({ onClose, streak, tasks }: StatsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const totalHours = useMemo(() => {
    const totalMs = tasks.reduce((acc, task) => acc + task.elapsedMs, 0);
    return (totalMs / 3_600_000).toFixed(1);
  }, [tasks]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date,
        label: format(date, "EEE", { locale: ru }),
      };
    });

    let maxCount = 0;
    const counts = days.map((day) => {
      const count = tasks.filter((task) =>
        isSameDay(task.date, day.date) && task.completed
      ).length;
      if (count > maxCount) maxCount = count;
      return count;
    });

    return days.map((day, i) => ({
      label: day.label,
      heightPercent: maxCount > 0 ? (counts[i] / maxCount) * 100 : 0,
      count: counts[i],
    }));
  }, [tasks]);

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
        <div className="flex justify-between items-center mb-6">
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

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-orange-500/10 p-5 rounded-2xl flex flex-col items-center border border-orange-500/20">
            <Flame className="text-orange-500 mb-2" size={32} fill="currentColor" />
            <div className="text-3xl font-black text-[var(--ink)]">
              {streak}
            </div>
            <div className="text-[10px] font-bold uppercase text-[var(--muted)]">
              Стрик дней
            </div>
          </div>

          <div className="bg-blue-500/10 p-5 rounded-2xl flex flex-col items-center border border-blue-500/20">
            <Trophy className="text-blue-500 mb-2" size={32} fill="currentColor" />
            <div className="text-3xl font-black text-[var(--ink)]">
              {totalHours}ч
            </div>
            <div className="text-[10px] font-bold uppercase text-[var(--muted)]">
              В фокусе
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface-2)] p-4 rounded-2xl">
          <div className="text-xs font-bold text-[var(--muted)] mb-4 uppercase">
            Активность (7 дней)
          </div>
          <div className="flex items-end justify-between h-24 gap-2">
            {chartData.map((data, index) => (
              <div
                key={`bar-${index}`}
                className="w-full bg-[var(--bg)] rounded-t-lg relative overflow-hidden group flex items-end justify-center"
              >
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
                  className="w-full bg-[var(--accent)] rounded-t-lg opacity-80 group-hover:opacity-100 min-h-[4px]"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-[var(--muted)] opacity-60 uppercase">
            {chartData.map((data, idx) => (
              <span key={idx} className="w-full text-center">{data.label}</span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
