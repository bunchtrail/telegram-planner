'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import SurfaceCard from '@/app/components/planner/shared/ui/SurfaceCard';
import { cn } from '@/app/lib/cn';
import type { Habit } from '@/app/types/habit';
import HabitWeekGrid from './HabitWeekGrid';

export type HabitCardProps = {
  habit: Habit;
  isChecked: (habitId: string, date: string) => boolean;
  isDesktop?: boolean;
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
  isDeleting = false,
  isLogPending,
  onDelete,
  onToggleLog,
  weekDays,
}: HabitCardProps) {
  const checkedCount = weekDays.filter((day) =>
    isChecked(habit.id, format(day, 'yyyy-MM-dd')),
  ).length;
  const progress =
    weekDays.length > 0
      ? Math.round((checkedCount / weekDays.length) * 100)
      : 0;
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const isTodayChecked = isChecked(habit.id, todayKey);

  if (isDesktop) {
    const statusText =
      checkedCount === weekDays.length
        ? 'Неделя собрана полностью'
        : isTodayChecked
          ? 'Сегодняшняя отметка уже на месте'
          : checkedCount === 0
            ? 'Хороший момент, чтобы начать эту неделю'
            : `Осталось ${weekDays.length - checkedCount} отметки до полной недели`;

    return (
      <SurfaceCard className="relative overflow-hidden border-transparent p-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(circle at top left, ${withAlpha(habit.color, '1f')} 0%, transparent 38%), linear-gradient(135deg, ${withAlpha(habit.color, '0d')} 0%, transparent 55%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
          style={{ backgroundColor: habit.color }}
        />

        <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(300px,360px)_1fr] xl:items-center">
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-white/50 text-[28px] shadow-[var(--shadow-card)]"
                style={{
                  backgroundColor: withAlpha(habit.color, '20'),
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
                    className="inline-flex h-8 items-center rounded-full px-3 text-xs font-bold tabular-nums"
                    style={{
                      backgroundColor: withAlpha(habit.color, '18'),
                      color: habit.color,
                    }}
                  >
                    {checkedCount}/{weekDays.length}
                  </span>
                </div>

                <p className="mt-2 max-w-[24rem] text-sm leading-6 text-[var(--muted)]">
                  {statusText}
                </p>
              </div>

              <button
                type="button"
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
                  isDeleting
                    ? 'border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--danger)]/25 hover:text-[var(--danger)]',
                )}
                onClick={() => onDelete(habit.id)}
                aria-label={isDeleting ? 'Подтвердить удаление привычки' : 'Удалить привычку'}
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                <span>Прогресс недели</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <motion.div
                  className="h-full rounded-full"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                  style={{ backgroundColor: habit.color }}
                />
              </div>
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
