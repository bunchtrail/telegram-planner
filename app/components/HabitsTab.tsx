'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock, Plus, Sparkles } from 'lucide-react';
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
  isCreateOpen?: boolean;
  onCreateOpenChange?: (isOpen: boolean) => void;
};

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

const getRemainingVerb = (count: number) =>
  count === 1 ? 'осталась' : 'осталось';

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
  isCreateOpen,
  onCreateOpenChange,
}: HabitsTabProps) {
  const [internalShowAddForm, setInternalShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const showAddForm = isCreateOpen ?? internalShowAddForm;
  const setAddFormOpen = (isOpen: boolean) => {
    if (onCreateOpenChange) {
      onCreateOpenChange(isOpen);
      return;
    }

    setInternalShowAddForm(isOpen);
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateLabel = format(selectedDate, 'd MMMM', { locale: ru });
  const isSelectedDateToday = selectedDateKey === todayKey;

  const desktopStats = useMemo(() => {
    const perHabitChecks = habits.map((habit) =>
      weekDays.filter((day) =>
        isChecked(habit.id, format(day, 'yyyy-MM-dd')),
      ).length,
    );

    const totalChecks = perHabitChecks.reduce((sum, count) => sum + count, 0);

    return {
      totalChecks,
    };
  }, [habits, isChecked, weekDays]);

  const habitsBySelectedDay = useMemo(
    () =>
      habits.map((habit) => ({
        habit,
        isCompletedOnSelectedDay: isChecked(habit.id, selectedDateKey),
      })),
    [habits, isChecked, selectedDateKey],
  );

  const remainingHabits = useMemo(
    () =>
      habitsBySelectedDay
        .filter((entry) => !entry.isCompletedOnSelectedDay)
        .map((entry) => entry.habit),
    [habitsBySelectedDay],
  );

  const completedHabits = useMemo(
    () =>
      habitsBySelectedDay
        .filter((entry) => entry.isCompletedOnSelectedDay)
        .map((entry) => entry.habit),
    [habitsBySelectedDay],
  );

  const summaryHeading =
    habits.length === 0
      ? 'Пока нет привычек'
      : remainingHabits.length === 0
        ? isSelectedDateToday
          ? 'На сегодня всё выполнено'
          : `На ${selectedDateLabel} всё выполнено`
        : isSelectedDateToday
          ? `На сегодня ${getRemainingVerb(remainingHabits.length)} ${remainingHabits.length} ${getHabitLabel(remainingHabits.length)}`
          : `На ${selectedDateLabel} ${getRemainingVerb(remainingHabits.length)} ${remainingHabits.length} ${getHabitLabel(remainingHabits.length)}`;

  const summarySubheading =
    habits.length === 0
      ? 'Добавьте первую привычку, чтобы каждый день было проще держать ритм.'
      : isSelectedDateToday
        ? `Уже выполнено ${completedHabits.length} из ${habits.length}`
        : `Отмечено ${completedHabits.length} из ${habits.length} на ${selectedDateLabel}`;

  const focusHabit = remainingHabits[0] ?? null;
  const plannedHabits = remainingHabits.slice(1);

  useEffect(() => {
    return () => {
      if (deleteResetTimeoutRef.current) {
        clearTimeout(deleteResetTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = ({ color, icon, name }: HabitFormSubmitValue) => {
    onAddHabit(name, icon, color);
    setAddFormOpen(false);
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

  const renderDesktopHabitList = (items: Habit[]) => (
    <div className="flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {items.map((habit, index) => (
          <motion.div
            key={habit.id}
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <HabitCard
              habit={habit}
              isChecked={isChecked}
              isDesktop
              isDesktopBoardItem
              isDesktopFeatured={index === 0 && items.length === 1}
              desktopFocusDate={selectedDate}
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
  );

  const renderDesktopEmptyState = (title: string, description: string) => (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-[var(--surface-2)] text-[22px]">
        <Sparkles size={20} className="text-[var(--muted)]" />
      </div>
      <p className="mt-3 text-[15px] font-semibold text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-1 max-w-[18rem] text-[13px] leading-5 text-[var(--muted)]">
        {description}
      </p>
    </div>
  );

  const scrollClasses = cn(
    'h-full w-full overflow-y-auto pt-2 touch-pan-y overscroll-contain no-scrollbar',
    isDesktop
      ? 'px-0 pb-8 pt-0'
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
        <div className="flex flex-col gap-4">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingId(null);
                  setAddFormOpen(true);
                }}
                className="flex h-12 min-w-[320px] flex-1 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-left text-[16px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <Plus size={20} />
                <span>Новая привычка...</span>
              </button>

              <div className="flex h-12 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--ink)]">
                <h2 className="text-[15px] font-semibold">{summaryHeading}</h2>
              </div>

              <div className="flex h-12 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--muted)]">
                {summarySubheading}
              </div>

              <div className="flex h-12 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--muted)]">
                За неделю:{' '}
                <span className="ml-1 font-semibold text-[var(--ink)]">
                  {desktopStats.totalChecks}
                </span>{' '}
                {getCheckLabel(desktopStats.totalChecks)}
              </div>

              {!showAddForm ? (
                <Button
                  variant="accent"
                  className="h-12 rounded-lg px-5 text-[16px] shadow-[var(--shadow-soft)]"
                  onClick={() => {
                    setDeletingId(null);
                    setAddFormOpen(true);
                  }}
                >
                  <span>Добавить</span>
                </Button>
              ) : null}
            </div>
          </section>

          <AnimatePresence initial={false}>
            {showAddForm ? (
              <motion.div
                key="desktop-habit-form"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <HabitForm
                  className="rounded-lg"
                  onSubmit={handleSubmit}
                  onCancel={() => setAddFormOpen(false)}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {habits.length > 0 ? (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(340px,1fr)_minmax(260px,0.9fr)]">
              <section
                aria-labelledby="desktop-habits-now-heading"
                className="overflow-visible rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm"
              >
                <div className="flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Clock
                      size={22}
                      strokeWidth={2.2}
                      className="text-[var(--accent)]"
                    />
                    <h2
                      id="desktop-habits-now-heading"
                      className="truncate text-[19px] font-bold text-[var(--ink)]"
                    >
                      Сейчас
                    </h2>
                  </div>
                  <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-sm font-bold tabular-nums text-[var(--accent)]">
                    {focusHabit ? 1 : 0}
                  </span>
                </div>
                <div className="p-3">
                  {focusHabit
                    ? renderDesktopHabitList([focusHabit])
                    : renderDesktopEmptyState(
                        'Фокус чист',
                        isSelectedDateToday
                          ? 'Все привычки на сегодня уже отмечены.'
                          : `На ${selectedDateLabel} нет ожидающих привычек.`,
                      )}
                </div>
              </section>

              <section
                aria-labelledby="desktop-habits-plan-heading"
                className="overflow-visible rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm"
              >
                <div className="flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Sparkles
                      size={22}
                      strokeWidth={2.2}
                      className="text-[var(--accent)]"
                    />
                    <h2
                      id="desktop-habits-plan-heading"
                      className="truncate text-[19px] font-bold text-[var(--ink)]"
                    >
                      План
                    </h2>
                  </div>
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm font-bold tabular-nums text-[var(--muted)]">
                    {plannedHabits.length}
                  </span>
                </div>
                <div className="p-3">
                  {plannedHabits.length > 0
                    ? renderDesktopHabitList(plannedHabits)
                    : renderDesktopEmptyState(
                        'Очередь пуста',
                        remainingHabits.length > 0
                          ? 'Следующая привычка уже вынесена в фокус.'
                          : 'Нет привычек, ожидающих отметки.',
                      )}
                </div>
              </section>

              <section
                aria-labelledby="desktop-habits-completed-heading"
                className="overflow-visible rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm"
              >
                <div className="flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <CheckCircle2
                      size={22}
                      strokeWidth={2.2}
                      className="text-emerald-500"
                    />
                    <h2
                      id="desktop-habits-completed-heading"
                      className="truncate text-[19px] font-bold text-[var(--ink)]"
                    >
                      Готово
                    </h2>
                  </div>
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm font-bold tabular-nums text-[var(--muted)]">
                    {completedHabits.length}
                  </span>
                </div>
                <div className="p-3">
                  {completedHabits.length > 0
                    ? renderDesktopHabitList(completedHabits)
                    : renderDesktopEmptyState(
                        'Пока пусто',
                        `Отмеченные привычки за ${selectedDateLabel} появятся здесь.`,
                      )}
                </div>
              </section>
            </div>
          ) : !showAddForm ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-8 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-lg bg-[var(--accent)]/10 text-4xl">
                🌱
              </div>
              <h3 className="mt-5 text-2xl font-bold text-[var(--ink)] font-[var(--font-display)]">
                Здесь появятся ваши привычки
              </h3>
              <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[var(--ink)]">
                Добавьте первую привычку и отмечайте её прямо с сегодняшнего
                экрана.
              </p>
              <Button
                variant="accent"
                className="mx-auto mt-6"
                onClick={() => setAddFormOpen(true)}
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
                onCancel={() => setAddFormOpen(false)}
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
            setAddFormOpen(true);
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
