'use client';

import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import SurfaceCard from '@/app/components/planner/shared/ui/SurfaceCard';
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
  const checkedCount = weekDays.filter((day) =>
    isChecked(habit.id, format(day, 'yyyy-MM-dd')),
  ).length;

  return (
    <SurfaceCard className="flex flex-col gap-3 border-transparent p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
            isDeleting
              ? 'bg-[var(--danger)]/10'
              : 'bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80',
          )}
          onClick={() => onDelete(habit.id)}
          aria-label={isDeleting ? 'Подтвердить удаление' : 'Удалить привычку'}
        >
          {isDeleting ? (
            <Trash2 size={18} className="text-[var(--danger)]" />
          ) : (
            <span className="text-lg" aria-hidden>
              {habit.icon}
            </span>
          )}
        </button>

        <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--ink)]">
          {habit.name}
        </span>

        <span
          className="shrink-0 text-xs font-bold tabular-nums"
          style={{
            color: checkedCount === weekDays.length ? habit.color : 'var(--muted)',
          }}
        >
          {checkedCount}/{weekDays.length}
        </span>
      </div>

      <HabitWeekGrid
        color={habit.color}
        days={weekDays}
        habitId={habit.id}
        habitName={habit.name}
        isChecked={isChecked}
        isPending={isLogPending}
        onToggle={onToggleLog}
      />
    </SurfaceCard>
  );
}
