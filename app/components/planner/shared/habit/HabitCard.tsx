'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ellipsis, Trash2 } from 'lucide-react';
import Button from '@/app/components/planner/shared/ui/Button';
import SurfaceCard from '@/app/components/planner/shared/ui/SurfaceCard';
import { cn } from '@/app/lib/cn';
import type { Habit } from '@/app/types/habit';
import HabitWeekGrid from './HabitWeekGrid';

export type HabitCardProps = {
  habit: Habit;
  isChecked: (habitId: string, date: string) => boolean;
  isDesktop?: boolean;
  desktopFocusDate?: Date;
  isDeleting?: boolean;
  isLogPending?: (habitId: string, date: string) => boolean;
  onDelete: (habitId: string) => void;
  onToggleLog: (habitId: string, date: string) => void;
  weekDays: Date[];
};

const withAlpha = (value: string, alpha: string) => {
  const normalized = value.trim();

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return `${normalized}${alpha}`;
  }

  return `color-mix(in srgb, ${normalized} 16%, transparent)`;
};

export default function HabitCard({
  habit,
  isChecked,
  isDesktop = false,
  desktopFocusDate,
  isDeleting = false,
  isLogPending,
  onDelete,
  onToggleLog,
  weekDays,
}: HabitCardProps) {
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

  if (isDesktop) {
    const focusDate = desktopFocusDate ?? new Date();
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const focusDateKey = format(focusDate, 'yyyy-MM-dd');
    const focusDateShortLabel = format(focusDate, 'd MMM', { locale: ru });
    const isFocusToday = focusDateKey === todayKey;
    const isFocusCompleted = isChecked(habit.id, focusDateKey);
    const focusPending = isLogPending?.(habit.id, focusDateKey) ?? false;
    const primaryActionLabel = isFocusCompleted
      ? 'Снять отметку'
      : isFocusToday
        ? 'Отметить сегодня'
        : `Отметить ${focusDateShortLabel}`;
    const focusStateLabel = isFocusCompleted
      ? isFocusToday
        ? 'Выполнено сегодня'
        : `Выполнено ${focusDateShortLabel}`
      : isFocusToday
        ? 'Не отмечено на сегодня'
        : `Не отмечено ${focusDateShortLabel}`;

    return (
      <SurfaceCard className="relative overflow-visible border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-l-[24px]"
          style={{ backgroundColor: habit.color }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-[24px] opacity-70"
          style={{
            background: `linear-gradient(135deg, ${withAlpha(habit.color, '12')} 0%, transparent 42%)`,
          }}
        />

        <div className="relative grid gap-4 xl:grid-cols-[minmax(340px,380px)_1fr] xl:items-center">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-[24px]"
                style={{
                  backgroundColor: withAlpha(habit.color, '18'),
                }}
                aria-hidden
              >
                {habit.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 text-xl font-bold leading-tight text-[var(--ink)]">
                    {habit.name}
                  </h3>
                  <span
                    className="inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold"
                    style={{
                      backgroundColor: withAlpha(habit.color, '15'),
                      color: habit.color,
                    }}
                  >
                    {checkedCount}/{weekDays.length} за неделю
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                  {focusStateLabel}
                </p>
              </div>

              <div ref={actionsRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-label={`Действия для привычки ${habit.name}`}
                  aria-haspopup="menu"
                  aria-expanded={actionsOpen}
                  aria-controls={actionsOpen ? menuId : undefined}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
                  onClick={() => setActionsOpen((current) => !current)}
                >
                  <Ellipsis size={18} />
                </button>

                {actionsOpen ? (
                  <div
                    id={menuId}
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[14rem] rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-pop)]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        'flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-sm font-medium transition-colors',
                        isDeleting
                          ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                          : 'text-[var(--ink)] hover:bg-[var(--surface-2)]',
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

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={isFocusCompleted ? 'secondary' : 'accent'}
                size="sm"
                className="min-w-[11.5rem]"
                disabled={focusPending}
                onClick={() => {
                  if (!focusPending) {
                    onToggleLog(habit.id, focusDateKey);
                  }
                }}
              >
                {primaryActionLabel}
              </Button>

              <span className="text-sm font-medium text-[var(--muted)]">
                {isFocusCompleted
                  ? 'Можно снять отметку, если нажали случайно.'
                  : 'Главное действие вынесено отдельно, чтобы не искать нужный день в сетке.'}
              </span>
            </div>
          </div>

          <HabitWeekGrid
            color={habit.color}
            days={weekDays}
            habitId={habit.id}
            habitName={habit.name}
            isChecked={isChecked}
            layout="desktop"
            isPending={isLogPending}
            onToggle={onToggleLog}
          />
        </div>
      </SurfaceCard>
    );
  }

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
        layout="mobile"
        isPending={isLogPending}
        onToggle={onToggleLog}
      />
    </SurfaceCard>
  );
}
