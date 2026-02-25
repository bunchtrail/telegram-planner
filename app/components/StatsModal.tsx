'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, Flame, Target, X, Zap } from 'lucide-react';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Task } from '../types/task';
import { cn } from '../lib/cn';

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
  const reduceMotion = Boolean(prefersReducedMotion);

  const stats = useMemo(() => {
    // Период: 7 дней, заканчивая selectedDate включительно
    const rangeEnd = startOfDay(selectedDate);
    const days = Array.from({ length: 7 }, (_, i) => subDays(rangeEnd, 6 - i));
    const rangeStart = days[0];

    const rangeLabel = `${format(rangeStart, 'd MMM', { locale: ru })} — ${format(
      rangeEnd,
      'd MMM',
      { locale: ru },
    )}`;

    // Словарь индексов дней для быстрой привязки задач
    const dayIndexMap = new Map<string, number>();
    days.forEach((d, i) => dayIndexMap.set(format(d, 'yyyy-MM-dd'), i));

    // Инициализация статистики по дням
    const dayStats = days.map((date) => ({
      date,
      weekday: format(date, 'EEE', { locale: ru }),
      dayLabel: format(date, 'd', { locale: ru }),
      total: 0,
      completed: 0,
      rate: 0,
      isToday: isSameDay(date, new Date()),
    }));

    let rangeTotal = 0;
    let rangeCompleted = 0;
    let rangeElapsedMs = 0;
    let planMinutes = 0;

    // Агрегация данных из задач
    for (const task of tasks) {
      const taskDayStr = format(task.date, 'yyyy-MM-dd');
      const idx = dayIndexMap.get(taskDayStr);

      // Если задача попадает в 7-дневный период
      if (idx !== undefined) {
        dayStats[idx].total += 1;
        planMinutes += task.duration || 0;
        rangeTotal += 1;
        rangeElapsedMs += task.elapsedMs || 0;

        if (task.completed) {
          dayStats[idx].completed += 1;
          rangeCompleted += 1;
        }
      }
    }

    // Расчет дневных показателей и поиск лучшего дня
    let bestDayIndex = -1;
    let maxRate = -1;

    dayStats.forEach((d, i) => {
      if (d.total > 0) {
        d.rate = d.completed / d.total;
        // Лучший день: максимальный процент выполнения (предпочтение более позднему дню при равенстве)
        if (d.rate >= maxRate) {
          maxRate = d.rate;
          bestDayIndex = i;
        }
      }
    });

    // Общие метрики периода (Package C)
    const completionRate = rangeTotal > 0 ? rangeCompleted / rangeTotal : 0;

    // Перевод в часы с округлением
    const focusHoursRaw = rangeElapsedMs / 3_600_000;
    const planHoursRaw = planMinutes / 60;

    // Скорость: задач в час фокуса (считаем, если набралось хотя бы 0.1 часа фокуса)
    const hasFocus = focusHoursRaw >= 0.1;
    const speedTasksPerHour = hasFocus ? rangeCompleted / focusHoursRaw : 0;

    return {
      rangeLabel,
      days: dayStats,
      rangeTotal,
      rangeCompleted,
      completionRate,
      focusHours: focusHoursRaw,
      planHours: planHoursRaw,
      speedTasksPerHour,
      hasFocus,
      bestDayIndex,
    };
  }, [tasks, selectedDate]);

  const percent = Math.round(stats.completionRate * 100);

  // Прогресс фокуса относительно плана (максимум 100% для полоски)
  const planProgress =
    stats.planHours > 0
      ? Math.min(100, (stats.focusHours / stats.planHours) * 100)
      : stats.focusHours > 0
        ? 100
        : 0;

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
        className="relative bg-[var(--surface)] w-full max-w-sm rounded-[32px] p-6 shadow-2xl overflow-hidden ring-1 ring-[var(--border)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-5 shrink-0">
          <div>
            <h2
              id="stats-title"
              className="text-2xl font-bold font-[var(--font-display)] text-[var(--ink)]"
            >
              Прогресс
            </h2>
            <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
              {stats.rangeLabel}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <div className="px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                7 дней
              </div>
              {streak > 0 && (
                <div className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[11px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                  <Flame size={12} fill="currentColor" />
                  Серия {streak}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-[var(--surface-2)] rounded-full text-[var(--muted)] hover:text-[var(--ink)] transition-colors active:scale-95"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 -mx-6 px-6 pb-2">
          {/* Grid Layout */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Hero Card (Completion) */}
            <div className="col-span-2 relative overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow-card)] border border-[var(--border)] p-5 min-h-[110px] flex flex-col justify-center group">
              {/* Glow & Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-transparent opacity-5 pointer-events-none" />
              <div className="absolute top-0 right-0 p-10 bg-[var(--accent)] blur-[60px] opacity-10 pointer-events-none" />

              <div className="relative z-10 flex items-baseline justify-between">
                <div className="flex flex-col">
                  <span className="text-[56px] leading-[0.9] font-black font-[var(--font-display)] tabular-nums tracking-tight text-[var(--ink)] drop-shadow-sm">
                    {percent}%
                  </span>
                  <span className="text-sm font-bold text-[var(--muted)] mt-2 uppercase tracking-wide opacity-80">
                    Выполнение
                  </span>
                </div>

                <div className="text-right self-end mb-1">
                  <div className="text-2xl font-bold text-[var(--ink)] tabular-nums">
                    {stats.rangeCompleted}
                    <span className="text-[var(--muted)] text-lg font-medium opacity-60">
                      /{stats.rangeTotal}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold uppercase text-[var(--muted)] tracking-wider mt-0.5 opacity-70">
                    Задач
                  </div>
                </div>
              </div>
            </div>

            {/* Focus vs Plan */}
            <div className="bg-[var(--surface-2)]/40 border border-[var(--border)] rounded-[20px] p-4 flex flex-col justify-between shadow-sm relative overflow-hidden h-28">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <Target size={16} />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  План
                </span>
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-xl font-bold text-[var(--ink)] tabular-nums tracking-tight">
                    {stats.focusHours.toFixed(1)}
                  </span>
                  <span className="text-xs text-[var(--muted)] font-semibold">
                    / {stats.planHours.toFixed(1)} ч
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${planProgress}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="absolute inset-y-0 left-0 bg-[var(--accent)] rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Speed */}
            <div className="bg-[var(--surface-2)]/40 border border-[var(--border)] rounded-[20px] p-4 flex flex-col justify-between shadow-sm relative overflow-hidden h-28">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <Zap size={16} />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Скорость
                </span>
              </div>
              <div className="relative z-10">
                <div className="text-2xl font-bold text-[var(--ink)] tabular-nums tracking-tight leading-none mb-1">
                  {stats.hasFocus ? stats.speedTasksPerHour.toFixed(1) : '—'}
                </div>
                <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider opacity-70">
                  {stats.hasFocus ? 'Задач / час' : 'Нет фокуса'}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[24px] p-5 shadow-sm relative overflow-hidden">
            <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock size={12} /> Активность по дням
            </div>

            <div className="flex items-end justify-between h-32 gap-2">
              {stats.days.map((day, index) => {
                const isBest = index === stats.bestDayIndex && day.rate > 0;
                const isToday = day.isToday;
                const isHighlighted = isBest || isToday;
                const barHeight = `${day.rate * 100}%`;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-2 group relative"
                  >
                    <div className="w-full h-full flex items-end relative rounded-[8px] overflow-hidden">
                      {/* Трек столбика */}
                      <div className="absolute inset-x-1 top-0 bottom-0 bg-[var(--surface-2)] rounded-full opacity-60" />

                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: barHeight }}
                        transition={{
                          type: 'spring',
                          stiffness: 180,
                          damping: 20,
                          delay: reduceMotion ? 0 : index * 0.05,
                        }}
                        className={cn(
                          'w-full mx-1 relative rounded-full min-h-[4px] transition-all duration-300',
                          isHighlighted
                            ? 'bg-[var(--accent)] shadow-[0_0_12px_-3px_var(--accent)]'
                            : 'bg-[var(--border)] group-hover:bg-[var(--muted)]',
                          day.rate === 0 && 'bg-transparent',
                        )}
                      />
                    </div>

                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-wider transition-colors text-center w-full truncate',
                        isHighlighted
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--muted)] opacity-60',
                      )}
                    >
                      {day.weekday}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
