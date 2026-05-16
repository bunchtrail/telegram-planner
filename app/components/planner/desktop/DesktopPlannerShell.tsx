'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Keyboard,
  ListTodo,
  Plus,
  RefreshCw,
  Repeat,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import DesktopFocusOverlay from './DesktopFocusOverlay';
import DesktopHabitsTab from './DesktopHabitsTab';
import DesktopRecurringTasksSheet from './DesktopRecurringTasksSheet';
import DesktopStatsModal from './DesktopStatsModal';
import DesktopTaskList from './DesktopTaskList';
import DesktopTaskSheet from './DesktopTaskSheet';
import {
  PLANNER_TABS,
  type PlannerHeaderViewModel,
  type PlannerShellProps,
} from '../shared/types';
import { cn } from '@/app/lib/cn';

const getTaskLabel = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return 'задача';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'задачи';
  }

  return 'задач';
};

const getHabitLabel = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return 'привычка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'привычки';
  }

  return 'привычек';
};

const closeTelegramApp = () => {
  if (typeof window === 'undefined') return;

  const telegram = (
    window as Window & { Telegram?: { WebApp?: { close?: () => void } } }
  ).Telegram;
  telegram?.WebApp?.close?.();
};

type DesktopDateStripProps = {
  activeTab: PlannerShellProps['ui']['activeTab'];
  header: PlannerHeaderViewModel;
  habits: PlannerShellProps['planner']['habits'];
  isHabitChecked: PlannerShellProps['planner']['isHabitChecked'];
};

function DesktopDateStrip({
  activeTab,
  header,
  habits,
  isHabitChecked,
}: DesktopDateStripProps) {
  return (
    <section className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold capitalize text-[var(--ink)]">
          {format(header.selectedDate, 'LLLL yyyy', { locale: ru })}
        </h2>

        <button
          type="button"
          onClick={closeTelegramApp}
          className="grid h-9 w-9 place-items-center rounded-lg text-[var(--ink)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Закрыть приложение"
        >
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {header.weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isSelected = isSameDay(day, header.selectedDate);
          const markers =
            activeTab === 'habits'
              ? habits
                  .filter((habit) => isHabitChecked(habit.id, dateKey))
                  .slice(0, 4)
                  .map((habit) => habit.color)
              : header.taskDates.has(dateKey)
                ? ['var(--accent)']
                : [];

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => header.onSelectDate(day)}
              aria-current={isSelected ? 'date' : undefined}
              aria-pressed={isSelected}
              aria-label={format(day, 'EEEE, d MMMM', { locale: ru })}
              className={cn(
                'flex h-[76px] min-w-0 flex-col items-center justify-center border-r border-[var(--border)] text-[15px] transition-colors last:border-r-0 hover:bg-[var(--surface-2)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                isSelected
                  ? 'bg-[var(--accent)]/5 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/55'
                  : 'text-[var(--ink)]',
              )}
            >
              <span className="font-medium capitalize">
                {format(day, 'EEE d', { locale: ru })}
              </span>

              <span className="mt-3 flex h-2 items-center justify-center gap-2">
                {markers.length > 0 ? (
                  markers.map((color, index) => (
                    <span
                      key={`${dateKey}-${color}-${index}`}
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))
                ) : (
                  <span className="h-2 w-2 rounded-full bg-transparent" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function DesktopPlannerShell({
  planner,
  ui,
}: PlannerShellProps) {
  const editingTask = ui.sheet.editingTask;
  const focusTask = ui.activeTask;
  const [isHabitCreateOpen, setIsHabitCreateOpen] = useState(false);
  const [desktopNotice, setDesktopNotice] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const noticeIdRef = useRef(0);

  const header: PlannerHeaderViewModel = {
    selectedDate: planner.selectedDate,
    weekDays: planner.weekDays,
    monthDays: planner.monthDays,
    taskDates: planner.taskDates,
    viewMode: planner.viewMode,
    hours: planner.hours,
    minutes: planner.minutes,
    completedCount: ui.completedCount,
    totalCount: ui.totalCount,
    onSelectDate: planner.setSelectedDate,
    onViewModeChange: planner.setViewMode,
    onPrev: planner.goToPreviousPeriod,
    onNext: planner.goToNextPeriod,
    onToday: planner.goToToday,
    onOpenStats: ui.openStats,
    onOpenRecurring: ui.openRecurring,
  };

  const selectedDateKey = format(header.selectedDate, 'yyyy-MM-dd');

  const scrollTasksToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollAreaRef.current?.scrollTo({ top: 0, behavior });
  }, []);

  const showDesktopNotice = useCallback((message: string) => {
    noticeIdRef.current += 1;
    setDesktopNotice({ id: noticeIdRef.current, message });

    if (noticeTimerRef.current != null) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setDesktopNotice(null);
      noticeTimerRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current != null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollTasksToTop('auto');
  }, [scrollTasksToTop, selectedDateKey, ui.activeTab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== 'k') return;

      event.preventDefault();
      scrollTasksToTop();
      window.requestAnimationFrame(() => {
        quickAddInputRef.current?.focus();
        quickAddInputRef.current?.select();
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollTasksToTop]);

  const getMoveDateLabel = useCallback(
    (nextDateKey: string) => {
      const [year, month, day] = nextDateKey.split('-').map(Number);
      if (!year || !month || !day) return 'другую дату';

      const nextDate = new Date(year, month - 1, day);
      if (isSameDay(nextDate, addDays(planner.selectedDate, 1))) {
        return 'завтра';
      }

      return format(nextDate, 'd MMMM', { locale: ru });
    },
    [planner.selectedDate],
  );

  const handleMoveTask = useCallback(
    (id: string, nextDateKey: string) => {
      const task = planner.tasks.find((item) => item.id === id);
      planner.moveTask(id, nextDateKey);
      showDesktopNotice(
        `${task?.title ?? 'Задача'} перенесена на ${getMoveDateLabel(
          nextDateKey,
        )}`,
      );
    },
    [getMoveDateLabel, planner, showDesktopNotice],
  );

  const handleToggleActiveTask = useCallback(
    (id: string) => {
      const task = planner.tasks.find((item) => item.id === id);
      planner.toggleActiveTask(id);
      if (!task?.activeStartedAt) {
        scrollTasksToTop();
      }
    },
    [planner, scrollTasksToTop],
  );

  const handleRefreshData = useCallback(() => {
    planner.clearSyncError();
    planner.refetchTasks();
    showDesktopNotice('Данные обновляются');
  }, [planner, showDesktopNotice]);

  const handleOpenSeparateWindow = useCallback(() => {
    if (typeof window === 'undefined') return;
    const opened = window.open(window.location.href, '_blank');
    if (opened) {
      opened.opener = null;
    }
    if (!opened) {
      showDesktopNotice('Окно не открылось');
    }
  }, [showDesktopNotice]);

  const focusQuickAdd = useCallback(() => {
    scrollTasksToTop();
    window.requestAnimationFrame(() => {
      quickAddInputRef.current?.focus();
      quickAddInputRef.current?.select();
    });
  }, [scrollTasksToTop]);

  const taskListProps = {
    dateKey: format(planner.selectedDate, 'yyyy-MM-dd'),
    tasks: planner.currentTasks,
    isLoading: planner.isLoading,
    onToggle: ui.toggleTask,
    onDelete: ui.deleteTask,
    onEdit: ui.openEdit,
    onMove: handleMoveTask,
    onAdd: ui.openCreate,
    onReorder: planner.handleReorder,
    onToggleActive: handleToggleActiveTask,
    updateTask: planner.updateTask,
    onQuickAdd: planner.addTask,
    quickAddInputRef,
    className: 'pl-0 pr-0',
  };

  const habitsTabProps = {
    habits: planner.habits,
    isLoading: planner.habitsLoading,
    isChecked: planner.isHabitChecked,
    isLogPending: planner.isHabitLogPending,
    onToggleLog: planner.toggleHabitLog,
    onAddHabit: planner.addHabit,
    onDeleteHabit: planner.deleteHabit,
    selectedDate: planner.selectedDate,
    isCreateOpen: isHabitCreateOpen,
    onCreateOpenChange: setIsHabitCreateOpen,
  };

  const taskSheetProps = {
    onClose: ui.closeSheet,
    mode: ui.sheet.mode,
    initialTitle: ui.sheet.mode === 'edit' ? editingTask?.title : '',
    initialDuration: ui.sheet.mode === 'edit' ? editingTask?.duration : 30,
    initialColor: ui.sheet.mode === 'edit' ? editingTask?.color : undefined,
    initialRepeat: 'none' as const,
    initialRepeatCount: 7,
    initialStartMinutes:
      ui.sheet.mode === 'edit' ? editingTask?.startMinutes : null,
    initialRemindBeforeMinutes:
      ui.sheet.mode === 'edit' ? editingTask?.remindBeforeMinutes : 0,
    taskDate:
      ui.sheet.mode === 'edit'
        ? (editingTask?.date ?? planner.selectedDate)
        : planner.selectedDate,
    onSubmit: ui.submitSheet,
  };

  const statsModalProps = {
    streak: planner.streak,
    tasks: planner.tasks,
    selectedDate: planner.selectedDate,
    onClose: ui.closeStats,
    pomodoroStats: planner.pomodoroStats,
  };

  const recurringSheetProps = {
    onClose: ui.closeRecurring,
    recurringTasks: planner.recurringTasks,
    recurringSkips: planner.recurringSkips,
    onDeleteSeries: planner.deleteTaskSeries,
    onSkipDate: planner.skipTaskSeriesDate,
  };

  const focusOverlayProps = focusTask
    ? {
        task: focusTask,
        isActive: planner.activeTaskId === focusTask.id,
        onToggleTimer: () => planner.toggleActiveTask(focusTask.id),
        onClose: ui.closeFocus,
        runWithAuthRetry: planner.runWithAuthRetry,
      }
    : null;

  const habitSummary = {
    completedToday: planner.habits.filter((habit) =>
      planner.isHabitChecked(habit.id, selectedDateKey),
    ).length,
    total: planner.habits.length,
    weekChecks: planner.habits.reduce(
      (sum, habit) =>
        sum +
        header.weekDays.filter((day) =>
          planner.isHabitChecked(habit.id, format(day, 'yyyy-MM-dd')),
        ).length,
      0,
    ),
  };

  const isToday = isSameDay(header.selectedDate, new Date());
  const progressDone =
    ui.activeTab === 'habits' ? habitSummary.completedToday : header.completedCount;
  const progressTotal =
    ui.activeTab === 'habits' ? habitSummary.total : header.totalCount;
  const progressPercent = progressTotal > 0 ? progressDone / progressTotal : 0;
  const dateLabel = `${format(header.selectedDate, 'd MMMM', {
    locale: ru,
  })}, ${format(header.selectedDate, 'EEEE', { locale: ru })}`;
  const currentCountLabel =
    ui.activeTab === 'habits'
      ? `${habitSummary.total} ${getHabitLabel(habitSummary.total)}`
      : `${planner.currentTasks.length} ${getTaskLabel(planner.currentTasks.length)}`;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg)] font-sans text-[var(--ink)]">
      <header className="no-scrollbar z-20 flex h-[86px] shrink-0 items-center gap-4 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-5">
        <div className="flex min-w-[160px] shrink-0 items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--shadow-soft)]">
            <Check size={24} strokeWidth={3.2} />
          </div>
          <h1 className="text-[25px] font-bold tracking-tight font-[var(--font-display)]">
            Planner
          </h1>
        </div>

        <nav
          aria-label="Разделы планера"
          className="flex h-11 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 shadow-sm"
        >
          {PLANNER_TABS.map((tab) => {
            const Icon = tab.id === 'tasks' ? ListTodo : Sparkles;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => ui.setActiveTab(tab.id)}
                className={cn(
                  'flex min-w-[110px] items-center justify-center gap-2 rounded-md px-4 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                  ui.activeTab === tab.id
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-2)]',
                )}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-3">
          <div className="flex h-11 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <button
              type="button"
              onClick={header.onPrev}
              className="grid w-11 place-items-center border-r border-[var(--border)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Предыдущий период"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="flex min-w-[240px] items-center justify-center gap-3 px-4 text-[16px] font-semibold capitalize">
              <CalendarDays size={19} />
              <span>{dateLabel}</span>
            </div>
            <button
              type="button"
              onClick={header.onNext}
              className="grid w-11 place-items-center border-l border-[var(--border)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Следующий период"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <button
            type="button"
            onClick={header.onToday}
            className={cn(
              'h-11 rounded-lg border border-[var(--border)] px-4 text-[15px] font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              isToday
                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]',
            )}
          >
            Сегодня
          </button>

          <button
            type="button"
            onClick={header.onOpenStats}
            className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-semibold shadow-sm transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Статистика"
          >
            <Flame size={18} className="text-orange-500" fill="currentColor" />
            <span>Серия {planner.streak}</span>
          </button>

          <div
            className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-semibold shadow-sm"
            aria-label={currentCountLabel}
          >
            {ui.activeTab === 'habits' ? (
              <>
                <Sparkles size={18} className="text-[var(--accent)]" />
                <span>Неделя {habitSummary.weekChecks}</span>
              </>
            ) : (
              <>
                <Clock size={18} />
                <span>
                  {header.hours}ч {header.minutes}м
                </span>
              </>
            )}
          </div>

          <div className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-semibold shadow-sm">
            <Target size={18} className="text-emerald-500" />
            <span>
              {progressDone}/{progressTotal}
            </span>
            <span
              className="h-2 w-10 overflow-hidden rounded-full bg-[var(--border)]"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.round(progressPercent * 100)}%` }}
              />
            </span>
          </div>

          {ui.activeTask ? (
            <button
              type="button"
              onClick={ui.openFocus}
              className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-semibold shadow-sm transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Clock size={18} className="animate-pulse" />
              <span>Фокус</span>
            </button>
          ) : null}

          {ui.activeTab === 'tasks' ? (
            <button
              type="button"
              onClick={header.onOpenRecurring}
              className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-sm transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Повторяющиеся задачи"
            >
              <Repeat size={20} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleRefreshData}
            className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-sm transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Обновить данные"
          >
            <RefreshCw size={20} />
          </button>

          <button
            type="button"
            onClick={handleOpenSeparateWindow}
            className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-sm transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Открыть в отдельном окне"
          >
            <ExternalLink size={20} />
          </button>

          <button
            type="button"
            onClick={
              ui.activeTab === 'tasks'
                ? ui.openCreate
                : () => setIsHabitCreateOpen(true)
            }
            className="flex h-11 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[15px] font-semibold text-[var(--accent-ink)] shadow-[var(--shadow-soft)] transition-[filter,transform] hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>{ui.activeTab === 'tasks' ? 'Задача' : 'Привычка'}</span>
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--bg)]">
        <DesktopDateStrip
          activeTab={ui.activeTab}
          habits={planner.habits}
          header={header}
          isHabitChecked={planner.isHabitChecked}
        />

        <div className="relative flex-1 overflow-hidden">
          <div
            ref={scrollAreaRef}
            className={cn(
              'no-scrollbar absolute inset-0 mx-auto w-full overflow-y-auto px-5',
              ui.activeTab === 'habits'
                ? 'max-w-[1540px] py-[18px]'
                : 'max-w-[1540px] py-[18px]',
            )}
          >
            {ui.activeTab === 'tasks' ? (
              <DesktopTaskList {...taskListProps} />
            ) : (
              <DesktopHabitsTab {...habitsTabProps} />
            )}
            <div className="h-32" />
          </div>
        </div>
      </main>

      <footer className="flex h-[68px] shrink-0 items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--surface)] px-5 text-[14px] text-[var(--muted)]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>Синхронизировано с Telegram</span>
          <span>•</span>
          <span>{format(new Date(), 'HH:mm')}</span>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={focusQuickAdd}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Перейти к быстрому добавлению"
          >
            <span className="grid h-8 min-w-8 place-items-center rounded-md border border-[var(--border)] text-[13px] font-semibold text-[var(--ink)]">
              Ctrl
            </span>
            <span className="text-[var(--muted)]">/</span>
            <span className="grid h-8 min-w-8 place-items-center rounded-md border border-[var(--border)] text-[13px] font-semibold text-[var(--ink)]">
              ⌘
            </span>
            <span className="grid h-8 min-w-8 place-items-center rounded-md border border-[var(--border)] text-[13px] font-semibold text-[var(--ink)]">
              K
            </span>
            <span className="inline-flex items-center gap-2">
              <Keyboard size={16} />
              Быстрое добавление
            </span>
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {ui.sheet.isOpen && <DesktopTaskSheet key="task-sheet" {...taskSheetProps} />}

        {ui.showStats && <DesktopStatsModal {...statsModalProps} />}

        {ui.showRecurring && (
          <DesktopRecurringTasksSheet {...recurringSheetProps} />
        )}

        {ui.showFocus && focusOverlayProps && (
          <DesktopFocusOverlay {...focusOverlayProps} />
        )}

        {ui.undoTask && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--ink)] px-6 py-4 text-sm font-medium text-[var(--bg)] shadow-2xl">
              <span>Задача удалена</span>
              <button
                type="button"
                onClick={ui.undoDelete}
                className="font-bold text-[var(--accent)] hover:underline"
              >
                Отменить
              </button>
            </div>
          </motion.div>
        )}

        {desktopNotice && !ui.undoTask && (
          <motion.div
            key={desktopNotice.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2"
            role="status"
            aria-live="polite"
          >
            <div className="rounded-lg border border-[var(--border)] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--bg)] shadow-2xl">
              {desktopNotice.message}
            </div>
          </motion.div>
        )}

        {ui.dayCompleteVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="max-w-sm rounded-[32px] border border-[var(--border)] bg-[var(--surface)]/90 p-10 text-center shadow-2xl backdrop-blur-xl">
              <div className="mb-4 text-[64px]">🎉</div>
              <h2 className="text-3xl font-bold font-[var(--font-display)] text-[var(--ink)]">
                День завершен!
              </h2>
              <p className="mt-2 text-lg text-[var(--muted)]">
                Отличная работа, все цели достигнуты.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
