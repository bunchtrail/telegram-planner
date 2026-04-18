'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ellipsis, Trash2 } from 'lucide-react';
import SurfaceCard from '@/app/components/planner/shared/ui/SurfaceCard';
import { cn } from '@/app/lib/cn';
import type { Habit } from '@/app/types/habit';
import HabitWeekGrid from './HabitWeekGrid';

export type MobileHabitRowProps = {
  habit: Habit;
  isChecked: (habitId: string, date: string) => boolean;
  isDeleting?: boolean;
  isLogPending?: (habitId: string, date: string) => boolean;
  onDelete: (habitId: string) => void;
  onToggleLog: (habitId: string, date: string) => void;
  weekDays: Date[];
};

export default function MobileHabitRow({
  habit,
  isChecked,
  isDeleting = false,
  isLogPending,
  onDelete,
  onToggleLog,
  weekDays,
}: MobileHabitRowProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const checkedCount = weekDays.filter((day) =>
    isChecked(habit.id, format(day, 'yyyy-MM-dd')),
  ).length;

  useEffect(() => {
    if (!actionsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setActionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActionsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [actionsOpen]);

  return (
    <SurfaceCard className="overflow-visible border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${habit.color} 16%, transparent)`,
          }}
          aria-hidden
        >
          {habit.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--ink)]">
              {habit.name}
            </h3>
            <span
              className="inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold tabular-nums"
              style={{
                backgroundColor:
                  checkedCount === weekDays.length
                    ? `color-mix(in srgb, ${habit.color} 18%, transparent)`
                    : 'var(--surface-2)',
                color:
                  checkedCount === weekDays.length ? habit.color : 'var(--muted)',
              }}
            >
              {checkedCount}/{weekDays.length}
            </span>
          </div>

          <p className="mt-1 text-[12px] text-[var(--muted)]">
            Неделя {format(weekDays[0], 'd', { locale: ru })}-
            {format(weekDays[weekDays.length - 1], 'd MMM', { locale: ru })}
          </p>
        </div>

        <div ref={actionsRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={`Действия для привычки ${habit.name}`}
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
            aria-controls={actionsOpen ? menuId : undefined}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition-colors active:scale-[0.98]"
            onClick={() => setActionsOpen((current) => !current)}
          >
            <Ellipsis size={18} />
          </button>

          {actionsOpen ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[13rem] rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-pop)]"
            >
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-sm font-medium transition-colors',
                  isDeleting
                    ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                    : 'text-[var(--ink)] active:bg-[var(--surface-2)]',
                )}
                onClick={() => {
                  onDelete(habit.id);
                  if (isDeleting) {
                    setActionsOpen(false);
                  }
                }}
              >
                <Trash2 size={16} />
                <span>
                  {isDeleting
                    ? 'Подтвердить удаление привычки'
                    : 'Удалить привычку'}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <HabitWeekGrid
          color={habit.color}
          days={weekDays}
          habitId={habit.id}
          habitName={habit.name}
          isChecked={isChecked}
          layout="mobile"
          isPending={isLogPending}
          onToggle={onToggleLog}
        />
      </div>
    </SurfaceCard>
  );
}
