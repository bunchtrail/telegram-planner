"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Trophy, X } from "lucide-react";
import type { Task } from "../types/task";

type StatsModalProps = {
  onClose: () => void;
  streak: number;
  tasks: Task[];
};

const CHART_DATA = [20, 45, 30, 80, 50, 60, 40];

export default function StatsModal({ onClose, streak, tasks }: StatsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const totalHours = useMemo(() => {
    const totalMs = tasks.reduce((acc, task) => acc + task.elapsedMs, 0);
    return (totalMs / 3_600_000).toFixed(1);
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
            Активность
          </div>
          <div className="flex items-end justify-between h-24 gap-2">
            {CHART_DATA.map((height, index) => (
              <div
                key={`bar-${index}`}
                className="w-full bg-[var(--bg)] rounded-t-lg relative overflow-hidden group"
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{
                    delay: reduceMotion ? 0 : index * 0.05,
                    duration: reduceMotion ? 0 : 0.4,
                  }}
                  className="absolute bottom-0 w-full bg-[var(--accent)] rounded-t-lg opacity-80 group-hover:opacity-100"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-[var(--muted)] opacity-60">
            <span>Пн</span>
            <span>Ср</span>
            <span>Пт</span>
            <span>Вс</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
