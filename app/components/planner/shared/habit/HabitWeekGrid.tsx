'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/app/lib/cn';
import { getHabitDayVisualState } from './habitDayState';

export type HabitWeekGridProps = {
  color: string;
  days: Date[];
  habitId: string;
  habitName: string;
  isChecked: (habitId: string, date: string) => boolean;
  layout?: 'mobile' | 'desktop';
  isPending?: (habitId: string, date: string) => boolean;
  onToggle: (habitId: string, date: string) => void;
};

export default function HabitWeekGrid({
  color,
  days,
  habitId,
  habitName,
  isChecked,
  layout = 'mobile',
  isPending,
  onToggle,
}: HabitWeekGridProps) {
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className={cn('grid grid-cols-7', layout === 'desktop' ? 'gap-3' : 'gap-1')}>
      {days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const checked = isChecked(habitId, dateKey);
        const pending = isPending?.(habitId, dateKey) ?? false;
        const state = getHabitDayVisualState({
          dateKey,
          isChecked: checked,
          isPending: pending,
          todayKey,
        });
        const isFuture = state === 'future';
        const isToday = state === 'today';
        const isDone = state === 'done';
        const isPendingState = state === 'pending';
        const isDisabled = isPendingState || isFuture;
        const ariaStatusLabel = isDone
          ? 'выполнено'
          : isFuture
            ? 'будущий день'
            : isToday
              ? 'сегодня'
              : isPendingState
                ? 'синхронизация'
                : 'без отметки';
        const localizedDayLabel = `${habitName}, ${format(day, 'EEEE, d MMMM', {
          locale: ru,
        })}, ${ariaStatusLabel}`;

        if (layout === 'desktop') {
          return (
            <motion.button
              key={dateKey}
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onToggle(habitId, dateKey);
                }
              }}
              className={cn(
                'relative flex h-[86px] min-h-[68px] min-w-0 flex-col items-center justify-center rounded-[16px] border px-2.5 py-2 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed',
                isDone
                  ? 'border-transparent text-white shadow-[var(--shadow-card)]'
                  : isFuture
                    ? 'border-[var(--border)] bg-[var(--surface-2)]/35 text-[var(--muted)] opacity-70'
                  : isPendingState
                    ? 'border-[var(--accent)]/35 bg-[var(--accent)]/8 text-[var(--ink)] opacity-60'
                  : isToday
                    ? 'border-[var(--accent)]/55 bg-[var(--accent)]/8 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/10'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink)]/12 hover:bg-[var(--surface-2)]/60',
              )}
              style={isDone ? { backgroundColor: color } : undefined}
              aria-label={localizedDayLabel}
              aria-busy={pending}
              aria-current={isToday ? 'date' : undefined}
            >
              <div className="min-w-0">
                <div
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-[0.14em]',
                    isDone
                      ? 'text-white/75'
                      : isToday
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--muted)]',
                  )}
                >
                  {format(day, 'EEEEEE', { locale: ru })}
                </div>
                <div
                  className={cn(
                    'mt-1 text-[30px] font-bold leading-none tabular-nums',
                    isDone
                      ? 'text-white'
                      : isFuture
                        ? 'text-[var(--muted)]'
                        : 'text-[var(--ink)]',
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
              {isDone ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 26,
                  }}
                  className="absolute bottom-2"
                >
                  <Check size={15} strokeWidth={3} className="text-white" />
                </motion.div>
              ) : null}
            </motion.button>
          );
        }

        return (
          <div key={dateKey} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                'text-[9px] font-bold uppercase tracking-wide',
                isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
              )}
            >
              {format(day, 'EEEEEE', { locale: ru })}
            </span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onToggle(habitId, dateKey);
                }
              }}
              className={cn(
                'flex aspect-square w-full items-center justify-center rounded-xl border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed',
                isDone
                  ? 'border-transparent shadow-sm'
                  : isFuture
                    ? 'border-dashed border-[var(--border)] bg-transparent opacity-55'
                  : isPendingState
                    ? 'border-[var(--accent)]/35 bg-[var(--accent)]/8 opacity-60'
                  : isToday
                    ? 'border-[var(--accent)]/60 bg-[var(--accent)]/5'
                    : 'border-[var(--border)] bg-transparent hover:border-[var(--ink)]/12 hover:bg-[var(--surface)]/55',
              )}
              style={isDone ? { backgroundColor: color } : undefined}
              aria-label={localizedDayLabel}
              aria-busy={pending}
            >
              {isDone ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 25,
                  }}
                >
                  <Check size={14} strokeWidth={3} className="text-white" />
                </motion.div>
              ) : null}
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}
