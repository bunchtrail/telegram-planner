'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { addDays, format, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '../lib/cn';
import type { Habit } from '../types/habit';
import HabitCard from './planner/shared/habit/HabitCard';
import HabitForm, {
  type HabitFormSubmitValue,
} from './planner/shared/habit/HabitForm';
import Button from './planner/shared/ui/Button';

type HabitsTabProps = {
  habits: Habit[];
  isLoading: boolean;
  isChecked: (habitId: string, date: string) => boolean;
  isLogPending?: (habitId: string, date: string) => boolean;
  onToggleLog: (habitId: string, date: string) => void;
  onAddHabit: (name: string, icon: string, color: string) => void;
  onDeleteHabit: (habitId: string) => void;
  selectedDate: Date;
  isDesktop?: boolean;
};

export default function HabitsTab({
  habits,
  isLoading,
  isChecked,
  isLogPending,
  onToggleLog,
  onAddHabit,
  onDeleteHabit,
  selectedDate,
  isDesktop = false,
}: HabitsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const desktopStats = useMemo(() => {
    const perHabitChecks = habits.map((habit) =>
      weekDays.filter((day) =>
        isChecked(habit.id, format(day, 'yyyy-MM-dd')),
      ).length,
    );

    const totalChecks = perHabitChecks.reduce((sum, count) => sum + count, 0);
    const totalSlots = habits.length * weekDays.length;
    const todayCompleted = habits.filter((habit) =>
      isChecked(habit.id, todayKey),
    ).length;
    const fullWeeks = perHabitChecks.filter(
      (count) => count === weekDays.length,
    ).length;

    return {
      totalChecks,
      totalSlots,
      todayCompleted,
      fullWeeks,
      consistency:
        totalSlots > 0 ? Math.round((totalChecks / totalSlots) * 100) : 0,
    };
  }, [habits, isChecked, todayKey, weekDays]);

  useEffect(() => {
    return () => {
      if (deleteResetTimeoutRef.current) {
        clearTimeout(deleteResetTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = ({ color, icon, name }: HabitFormSubmitValue) => {
    onAddHabit(name, icon, color);
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (deleteResetTimeoutRef.current) {
      clearTimeout(deleteResetTimeoutRef.current);
      deleteResetTimeoutRef.current = null;
    }

    if (deletingId === id) {
      onDeleteHabit(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      deleteResetTimeoutRef.current = setTimeout(() => {
        setDeletingId((current) => (current === id ? null : current));
        deleteResetTimeoutRef.current = null;
      }, 3000);
    }
  };

  const scrollClasses = cn(
    'h-full w-full overflow-y-auto pt-2 touch-pan-y overscroll-contain no-scrollbar',
    isDesktop
      ? 'px-0 pb-8 pt-4'
      : 'pb-32 pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))]',
  );

  if (isLoading) {
    return (
      <div className={cn(scrollClasses, 'flex flex-col gap-4')}>
        {[0.8, 0.6, 0.9].map((w, i) => (
          <div
            key={i}
            className="rounded-[24px] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]"
          >
            <div
              className="h-5 rounded-lg skeleton-shimmer"
              style={{ width: `${w * 100}%` }}
            />
            <div className="mt-3 flex gap-2">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="h-9 w-9 rounded-full skeleton-shimmer" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className={scrollClasses}>
        <div className="flex flex-col gap-6">
          <section className="relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,122,255,0.14),transparent_38%),linear-gradient(135deg,rgba(0,122,255,0.08),transparent_58%)]" />

            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/15 bg-[var(--accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  <Sparkles size={14} />
                  Привычки недели
                </div>

                <h3 className="mt-4 text-3xl font-bold tracking-tight text-[var(--ink)] font-[var(--font-display)]">
                  Ритм на неделю
                </h3>

                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
                  {format(weekDays[0], 'd MMMM', { locale: ru })} -{' '}
                  {format(weekDays[6], 'd MMMM', { locale: ru })}. Держим
                  привычки в компактном рабочем виде: без пустого воздуха и с
                  быстрым фокусом на сегодняшнем дне.
                </p>
              </div>

              {!showAddForm ? (
                <Button
                  variant="accent"
                  className="min-w-[12rem] self-start"
                  onClick={() => {
                    setDeletingId(null);
                    setShowAddForm(true);
                  }}
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Новая привычка</span>
                </Button>
              ) : null}
            </div>

            <div className="relative mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)]/80 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Отметки за неделю
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-[var(--ink)]">
                  {desktopStats.totalChecks}
                  <span className="ml-1 text-lg text-[var(--muted)]">
                    / {desktopStats.totalSlots}
                  </span>
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)]/80 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Сегодня закрыто
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-[var(--ink)]">
                  {desktopStats.todayCompleted}
                  <span className="ml-1 text-lg text-[var(--muted)]">
                    / {habits.length}
                  </span>
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)]/80 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Консистентность
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums text-[var(--ink)]">
                    {desktopStats.consistency}%
                  </span>
                  <span className="text-sm font-medium text-[var(--muted)]">
                    {desktopStats.fullWeeks} идеальных привычек
                  </span>
                </div>
              </div>
            </div>
          </section>

          <AnimatePresence initial={false}>
            {showAddForm ? (
              <motion.div
                key="desktop-habit-form"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <HabitForm
                  className="rounded-[28px]"
                  onSubmit={handleSubmit}
                  onCancel={() => setShowAddForm(false)}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {habits.length > 0 ? (
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {habits.map((habit) => (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <HabitCard
                      habit={habit}
                      isChecked={isChecked}
                      isDesktop
                      isDeleting={deletingId === habit.id}
                      isLogPending={isLogPending}
                      onDelete={handleDelete}
                      onToggleLog={onToggleLog}
                      weekDays={weekDays}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : !showAddForm ? (
            <div className="rounded-[32px] border border-dashed border-[var(--border)] bg-[var(--surface)]/80 px-8 py-16 text-center shadow-[var(--shadow-soft)]">
              <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[28px] bg-[var(--accent)]/10 text-4xl">
                🌱
              </div>
              <h3 className="mt-5 text-2xl font-bold text-[var(--ink)] font-[var(--font-display)]">
                Здесь появятся ваши привычки
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
                Соберите свой недельный ритм: добавьте чтение, спорт, воду или
                любую рутину, которую хотите держать перед глазами на десктопе.
              </p>
              <Button
                variant="accent"
                className="mx-auto mt-6"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Добавить первую привычку</span>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={scrollClasses}>
      <div className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {habits.map((habit) => (
            <motion.div
              key={habit.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <HabitCard
                habit={habit}
                isChecked={isChecked}
                isDeleting={deletingId === habit.id}
                isLogPending={isLogPending}
                onDelete={handleDelete}
                onToggleLog={onToggleLog}
                weekDays={weekDays}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {habits.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 text-[48px]">🌱</div>
            <h3 className="mb-2 text-lg font-bold text-[var(--ink)] font-[var(--font-display)]">
              Нет привычек
            </h3>
            <p className="mb-6 max-w-[240px] text-sm text-[var(--muted)]">
              Добавьте привычки для ежедневного трекинга - вода, спорт, чтение
            </p>
          </div>
        ) : null}

        <AnimatePresence>
          {showAddForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <HabitForm
                onSubmit={handleSubmit}
                onCancel={() => setShowAddForm(false)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {!showAddForm ? (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setDeletingId(null);
            setShowAddForm(true);
          }}
          className="fixed bottom-[calc(5.5rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] right-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-lg"
          aria-label="Добавить привычку"
        >
          <Plus size={24} strokeWidth={2.5} />
        </motion.button>
      ) : null}
    </div>
  );
}
