'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/app/lib/cn';

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
    <div className={cn('grid grid-cols-7', layout === 'desktop' ? 'gap-2.5' : 'gap-1')}>
      {days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const localizedDayLabel = `${habitName}, ${format(day, 'EEEE, d MMMM', {
          locale: ru,
        })}`;
        const checked = isChecked(habitId, dateKey);
        const pending = isPending?.(habitId, dateKey) ?? false;
        const isToday = dateKey === todayKey;

        if (layout === 'desktop') {
          return (
            <motion.button
              key={dateKey}
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={pending}
              onClick={() => {
                if (!pending) {
                  onToggle(habitId, dateKey);
                }
              }}
              className={cn(
                'flex min-h-[104px] flex-col justify-between rounded-[24px] border px-3 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
                checked
                  ? 'border-transparent text-white shadow-[var(--shadow-pop)]'
                  : isToday
                    ? 'border-[var(--accent)]/35 bg-[var(--accent)]/10 text-[var(--ink)] hover:border-[var(--accent)]/60'
                    : 'border-[var(--border)] bg-[var(--surface-2)]/75 text-[var(--ink)] hover:border-[var(--ink)]/12 hover:bg-[var(--surface)]',
              )}
              style={
                checked
                  ? {
                      backgroundColor: color,
                      boxShadow: `0 22px 40px -30px ${color}`,
                    }
                  : undefined
              }
              aria-label={localizedDayLabel}
              aria-busy={pending}
              aria-current={isToday ? 'date' : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-[0.18em]',
                      checked
                        ? 'text-white/70'
                        : isToday
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--muted)]',
                    )}
                  >
                    {format(day, 'EEEEEE', { locale: ru })}
                  </div>
                  <div
                    className={cn(
                      'mt-2 text-2xl font-bold leading-none tabular-nums',
                      checked ? 'text-white' : 'text-[var(--ink)]',
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>

                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-2xl border transition-colors duration-200',
                    checked
                      ? 'border-white/25 bg-white/12 text-white'
                      : isToday
                        ? 'border-[var(--accent)]/20 bg-[var(--surface)]/70 text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]',
                  )}
                >
                  {checked ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 25,
                      }}
                    >
                      <Check size={16} strokeWidth={3} className="text-white" />
                    </motion.div>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-current/70" aria-hidden />
                  )}
                </div>
              </div>

              <div
                className={cn(
                  'text-[11px] font-semibold tracking-[0.12em] uppercase',
                  checked
                    ? 'text-white/70'
                    : isToday
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--muted)]',
                )}
              >
                {checked ? 'Отмечено' : isToday ? 'Сегодня' : 'Свободно'}
              </div>
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
              disabled={pending}
              onClick={() => {
                if (!pending) {
                  onToggle(habitId, dateKey);
                }
              }}
              className={cn(
                'flex aspect-square w-full items-center justify-center rounded-xl border-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
                checked
                  ? 'border-transparent shadow-sm'
                  : isToday
                    ? 'border-[var(--accent)]/60 bg-[var(--accent)]/5'
                    : 'border-[var(--border)] bg-transparent',
              )}
              style={checked ? { backgroundColor: color } : undefined}
              aria-label={localizedDayLabel}
              aria-busy={pending}
            >
              {checked ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 25,
                  }}
                >
                  <Check
                    size={14}
                    strokeWidth={3}
                    className="text-white"
                  />
                </motion.div>
              ) : null}
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}
