'use client';

import { motion } from 'framer-motion';
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
    <div
      className="grid grid-cols-7 mx-auto"
      style={{ gap: '5px 6px', maxWidth: 260 }}
    >
      {days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const label = `${habitName}, ${format(day, 'EEEE, d MMMM', { locale: ru })}`;
        const checked = isChecked(habitId, dateKey);
        const pending = isPending?.(habitId, dateKey) ?? false;
        const isToday = dateKey === todayKey;
        const isFuture = dateKey > todayKey;

        return (
          <div key={dateKey} className="flex flex-col items-center gap-1">
            {/* Day label */}
            <span
              className={cn(
                'text-[10px] font-semibold text-center leading-none',
                isToday
                  ? 'text-[var(--accent)] font-bold'
                  : isFuture
                    ? 'text-[var(--muted)] opacity-40'
                    : 'text-[var(--muted)]',
              )}
            >
              {format(day, 'EEEEEE', { locale: ru })}
            </span>
            {/* Dot */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.8 }}
              disabled={pending || isFuture}
              onClick={() => {
                if (!pending && !isFuture) onToggle(habitId, dateKey);
              }}
              className="w-2.5 h-2.5 rounded-full transition-all duration-300 disabled:cursor-not-allowed"
              style={{
                background: checked
                  ? color
                  : isFuture
                    ? 'rgba(0,0,0,0.08)'
                    : isToday
                      ? 'rgba(0, 122, 255, 0.12)'
                      : 'rgba(0,0,0,0.08)',
                boxShadow: checked ? `0 0 6px -1px ${color}` : 'none',
                outline: isToday ? '2px solid var(--accent)' : 'none',
                outlineOffset: isToday ? '2px' : undefined,
                opacity: isFuture && !checked ? 0.35 : 1,
              }}
              aria-label={label}
              aria-busy={pending}
            />
          </div>
        );
      })}
    </div>
  );
}
