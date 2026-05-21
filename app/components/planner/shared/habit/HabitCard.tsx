'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/app/lib/cn';
import type { Habit } from '@/app/types/habit';
import HabitWeekGrid from './HabitWeekGrid';

export type HabitCardProps = {
  habit: Habit;
  isChecked: (habitId: string, date: string) => boolean;
  isDeleting?: boolean;
  isLogPending?: (habitId: string, date: string) => boolean;
  onDelete: (habitId: string) => void;
  onToggleLog: (habitId: string, date: string) => void;
  weekDays: Date[];
};

export default function HabitCard({
  habit,
  isChecked,
  isDeleting = false,
  isLogPending,
  onDelete,
  onToggleLog,
  weekDays,
}: HabitCardProps) {
  const [expanded, setExpanded] = useState(false);

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayChecked = isChecked(habit.id, todayKey);

  const checkedCount = weekDays.filter((day) =>
    isChecked(habit.id, format(day, 'yyyy-MM-dd')),
  ).length;

  /* Current streak */
  const streak = (() => {
    let count = 0;
    const pastDays = [...weekDays]
      .filter((d) => format(d, 'yyyy-MM-dd') <= todayKey)
      .reverse();
    for (const day of pastDays) {
      if (isChecked(habit.id, format(day, 'yyyy-MM-dd'))) count++;
      else break;
    }
    return count;
  })();

  return (
    <div
      className={cn(
        'relative flex flex-wrap items-center gap-3 overflow-hidden rounded-[18px] p-3 transition-all duration-200 active:scale-[0.98]',
      )}
      style={{
        background: todayChecked
          ? `linear-gradient(90deg, color-mix(in srgb, ${habit.color} 6%, var(--surface)) 0%, var(--surface) 50%)`
          : 'var(--surface)',
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow:
          '0 0.5px 1px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Toggle circle */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.8 }}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300',
          todayChecked
            ? 'border-transparent'
            : 'border-[2.5px] border-black/10 bg-transparent',
        )}
        style={
          todayChecked
            ? {
                backgroundColor: habit.color,
                boxShadow: `0 2px 8px -2px ${habit.color}, inset 0 1px 0 rgba(255,255,255,0.2)`,
              }
            : undefined
        }
        onClick={() => onToggleLog(habit.id, todayKey)}
        aria-label={`Отметить: ${habit.name}`}
      >
        <AnimatePresence>
          {todayChecked && (
            <motion.svg
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Info */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[17px] leading-none">{habit.icon}</span>
            <span className="text-[15px] font-bold text-[var(--ink)] truncate tracking-tight">
              {habit.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {streak > 0 ? (
              <span
                className="inline-flex items-center gap-0.5 text-xs font-bold rounded-lg px-2 py-0.5"
                style={{
                  color: '#c26900',
                  backgroundColor: 'rgba(255, 149, 0, 0.12)',
                }}
              >
                🔥 {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}
              </span>
            ) : (
              <span
                className="text-xs font-medium rounded-lg px-2 py-0.5"
                style={{
                  color: 'var(--muted)',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                }}
              >
                Нет серии
              </span>
            )}
          </div>
        </div>

        {/* Expand button */}
        <motion.button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(0,0,0,0.03)' }}
          onClick={() => setExpanded((v) => !v)}
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          aria-label="Подробнее"
        >
          <ChevronDown size={16} className="text-[var(--muted)]" />
        </motion.button>
      </div>

      {/* Expandable detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full overflow-hidden"
          >
            <div className="pt-2 pb-1 px-1">
              <HabitWeekGrid
                color={habit.color}
                days={weekDays}
                habitId={habit.id}
                habitName={habit.name}
                isChecked={isChecked}
                isPending={isLogPending}
                onToggle={onToggleLog}
              />
              <button
                type="button"
                onClick={() => onDelete(habit.id)}
                className={cn(
                  'mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
                  isDeleting
                    ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                    : 'text-[var(--muted)]',
                )}
                style={!isDeleting ? { background: 'rgba(0,0,0,0.04)' } : undefined}
                aria-label={isDeleting ? 'Подтвердить удаление' : 'Удалить привычку'}
              >
                <Trash2 size={14} />
                {isDeleting ? 'Нажмите ещё раз' : 'Удалить'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
