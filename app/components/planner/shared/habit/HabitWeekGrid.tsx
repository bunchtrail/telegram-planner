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
        const localizedDayLabel = `${habitName}, ${format(day, 'EEEE, d MMMM', {
          locale: ru,
        })}`;
        const checked = isChecked(habitId, dateKey);
        const pending = isPending?.(habitId, dateKey) ?? false;
        const isToday = dateKey === todayKey;

        if (layout === 'desktop') {
          const statusLabel = checked
            ? 'Выполнено'
            : isToday
              ? 'Сегодня'
              : 'Не отмечено';

          return (
            <motion.button
              key={dateKey}
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={pending}
              onClick={() => {
                if (!pending) {
                  onToggle(habitId, dateKey);
                }
              }}
              className={cn(
                'flex min-h-[84px] flex-col justify-between rounded-[20px] border px-3 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
                checked
                  ? 'border-transparent text-white shadow-[var(--shadow-card)]'
                  : isToday
                    ? 'border-[var(--accent)]/45 bg-[var(--accent)]/10 text-[var(--ink)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)]',
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
