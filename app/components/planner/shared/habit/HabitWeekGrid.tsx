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
  isPending?: (habitId: string, date: string) => boolean;
  onToggle: (habitId: string, date: string) => void;
};

export default function HabitWeekGrid({
  color,
  days,
  habitId,
  habitName,
  isChecked,
  isPending,
  onToggle,
}: HabitWeekGridProps) {
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const checked = isChecked(habitId, dateKey);
        const pending = isPending?.(habitId, dateKey) ?? false;
        const isToday = dateKey === todayKey;

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
              aria-label={`${habitName} ${dateKey}`}
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
