'use client';

import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Plus } from 'lucide-react';
import HabitForm, {
  type HabitFormSubmitValue,
} from '@/app/components/planner/shared/habit/HabitForm';
import MobileHabitRow from '@/app/components/planner/shared/habit/MobileHabitRow';
import BottomSheet from '@/app/components/planner/shared/ui/BottomSheet';
import Button from '@/app/components/planner/shared/ui/Button';
import ModalHeader from '@/app/components/planner/shared/ui/ModalHeader';
import SurfaceCard from '@/app/components/planner/shared/ui/SurfaceCard';
import { cn } from '@/app/lib/cn';
import { useHaptic } from '@/app/hooks/useHaptic';
import HabitsTab from '../../HabitsTab';

type MobileHabitsTabProps = Omit<ComponentProps<typeof HabitsTab>, 'isDesktop'>;

const getHabitLabel = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'привычка';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'привычки';
  }

  return 'привычек';
};

const getCheckLabel = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'отметка';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'отметки';
  }

  return 'отметок';
};

export default function MobileHabitsTab({
  habits,
  isLoading,
  isChecked,
  isLogPending,
  onToggleLog,
  onAddHabit,
  onDeleteHabit,
  selectedDate,
}: MobileHabitsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { impact, notification, selection } = useHaptic();

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateLabel = format(selectedDate, 'd MMMM', { locale: ru });

  const totalChecks = useMemo(
    () =>
      habits.reduce(
        (sum, habit) =>
          sum +
          weekDays.filter((day) =>
            isChecked(habit.id, format(day, 'yyyy-MM-dd')),
          ).length,
        0,
      ),
    [habits, isChecked, weekDays],
  );

  const orderedHabits = useMemo(() => {
    return [...habits].sort((left, right) => {
      const leftCompleted = isChecked(left.id, selectedDateKey) ? 1 : 0;
      const rightCompleted = isChecked(right.id, selectedDateKey) ? 1 : 0;

      return (
        leftCompleted - rightCompleted ||
        left.sortOrder - right.sortOrder ||
        left.id.localeCompare(right.id)
      );
    });
  }, [habits, isChecked, selectedDateKey]);

  const completedTodayCount = useMemo(
    () =>
      habits.filter((habit) => isChecked(habit.id, selectedDateKey)).length,
    [habits, isChecked, selectedDateKey],
  );

  useEffect(() => {
    return () => {
      if (deleteResetTimeoutRef.current) {
        clearTimeout(deleteResetTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleLog = (habitId: string, date: string) => {
    if (date > todayKey) {
      return;
    }

    selection();

    if (!isChecked(habitId, date)) {
      notification('success');
    }

    onToggleLog(habitId, date);
  };

  const handleDelete = (habitId: string) => {
    if (deleteResetTimeoutRef.current) {
      clearTimeout(deleteResetTimeoutRef.current);
      deleteResetTimeoutRef.current = null;
    }

    impact('soft');

    if (deletingId === habitId) {
      onDeleteHabit(habitId);
      setDeletingId(null);
      return;
    }

    setDeletingId(habitId);
    deleteResetTimeoutRef.current = setTimeout(() => {
      setDeletingId((current) => (current === habitId ? null : current));
      deleteResetTimeoutRef.current = null;
    }, 3000);
  };

  const handleSubmit = ({ color, icon, name }: HabitFormSubmitValue) => {
    onAddHabit(name, icon, color);
    notification('success');
    setShowAddForm(false);
  };

  const scrollClasses = cn(
    'h-full w-full overflow-y-auto touch-pan-y overscroll-contain no-scrollbar',
    'pb-28 pt-4 pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))]',
  );

  if (isLoading) {
    return (
      <div className={cn(scrollClasses, 'flex flex-col gap-3')}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[24px] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"
          >
            <div className="h-5 w-2/5 rounded-lg skeleton-shimmer" />
            <div className="mt-4 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, cellIndex) => (
                <div
                  key={cellIndex}
                  className="aspect-square rounded-2xl skeleton-shimmer"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={scrollClasses}>
        <div className="flex flex-col gap-3">
          <SurfaceCard className="border-[var(--border)] bg-[var(--surface)] px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  <CheckCircle2 size={14} />
                  Привычки
                </div>

                <h2 className="mt-2 text-[22px] font-bold tracking-tight text-[var(--ink)] font-[var(--font-display)]">
                  {habits.length === 0
                    ? 'Начните с первой привычки'
                    : `${habits.length} ${getHabitLabel(habits.length)}`}
                </h2>

                <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">
                  {completedTodayCount} из {habits.length} отмечено на {selectedDateLabel}
                </p>
              </div>

              <Button
                size="sm"
                variant="secondary"
                className="shrink-0"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Добавить</span>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              <div className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[var(--ink)]">
                За неделю: <span className="font-semibold">{totalChecks}</span>{' '}
                {getCheckLabel(totalChecks)}
              </div>
              <div className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[var(--muted)]">
                {selectedDateKey === todayKey ? 'Сегодня' : selectedDateLabel}
              </div>
            </div>
          </SurfaceCard>

          {orderedHabits.length > 0 ? (
            <ul className="flex list-none flex-col gap-3 p-0 m-0">
              {orderedHabits.map((habit) => (
                <li key={habit.id}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    <MobileHabitRow
                      habit={habit}
                      isChecked={isChecked}
                      isDeleting={deletingId === habit.id}
                      isLogPending={isLogPending}
                      onDelete={handleDelete}
                      onToggleLog={handleToggleLog}
                      weekDays={weekDays}
                    />
                  </motion.div>
                </li>
              ))}
            </ul>
          ) : (
            <SurfaceCard className="border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center shadow-[var(--shadow-soft)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--accent)]/10 text-3xl">
                🌱
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--ink)] font-[var(--font-display)]">
                Пока нет привычек
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-[var(--muted)]">
                Добавьте привычку и отмечайте её прямо в недельной ленте.
              </p>
              <Button
                variant="accent"
                className="mx-auto mt-5"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Добавить привычку</span>
              </Button>
            </SurfaceCard>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddForm ? (
          <BottomSheet
            ariaLabelledby="mobile-habit-form-title"
            onClose={() => setShowAddForm(false)}
          >
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px))]">
              <ModalHeader
                title="Новая привычка"
                titleId="mobile-habit-form-title"
                description="Название, иконка и цвет для быстрого ежедневного трекинга."
                onClose={() => setShowAddForm(false)}
                className="px-1"
              />

              <HabitForm
                className="mt-4 border-transparent bg-transparent p-0 shadow-none"
                onSubmit={handleSubmit}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </BottomSheet>
        ) : null}
      </AnimatePresence>
    </>
  );
}
