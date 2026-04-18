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
    <div className={cn('grid grid-cols-7', layout === 'desktop' ? 'gap-2' : 'gap-1')}>
      {days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const checked = isChecked(habitId, dateKey);
        const isFuture = dateKey > todayKey;
        const pending = isPending?.(habitId, dateKey) ?? false;
        const isToday = dateKey === todayKey;
        const isDisabled = pending || isFuture;
        const ariaStatusLabel = checked
          ? 'выполнено'
          : isFuture
            ? 'будущий день'
            : isToday
              ? 'сегодня'
              : 'без отметки';
        const localizedDayLabel = `${habitName}, ${format(day, 'EEEE, d MMMM', {
          locale: ru,
        })}, ${ariaStatusLabel}`;

        if (layout === 'desktop') {
          const statusLabel = checked
            ? 'Выполнено'
            : isFuture
              ? 'Будет позже'
            : isToday
              ? 'Сегодня'
              : 'Не отмечено';

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
                'flex min-h-[84px] flex-col justify-between rounded-[20px] border px-3 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed',
                checked
                  ? 'border-transparent text-white shadow-[var(--shadow-card)]'
                  : isFuture
                    ? 'border-dashed border-[var(--border)] bg-transparent text-[var(--muted)] opacity-70'
                  : isToday
                    ? 'border-[var(--accent)]/45 bg-[var(--accent)]/10 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/12'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:border-[var(--ink)]/12 hover:bg-[var(--surface)]',
              )}
              style={checked ? { backgroundColor: color } : undefined}
              aria-label={localizedDayLabel}
              aria-busy={pending}
              aria-current={isToday ? 'date' : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-[0.14em]',
                      checked
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
                      'mt-1 text-xl font-bold leading-none tabular-nums',
                      checked ? 'text-white' : 'text-[var(--ink)]',
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>

                {checked ? (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-white">
                    <Check size={14} strokeWidth={3} />
                  </span>
                ) : null}
              </div>

              <div
                className={cn(
                  'text-[11px] font-medium',
                  checked
                    ? 'text-white/82'
                    : isFuture
                      ? 'text-[var(--muted)]'
                    : isToday
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--ink)]',
                )}
              >
                {statusLabel}
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
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onToggle(habitId, dateKey);
                }
              }}
              className={cn(
                'flex aspect-square w-full items-center justify-center rounded-xl border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed',
                checked
                  ? 'border-transparent shadow-sm'
                  : isFuture
                    ? 'border-dashed border-[var(--border)] bg-transparent opacity-55'
                  : isToday
                    ? 'border-[var(--accent)]/60 bg-[var(--accent)]/5'
                    : 'border-[var(--border)] bg-transparent hover:border-[var(--ink)]/12 hover:bg-[var(--surface)]/55',
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
