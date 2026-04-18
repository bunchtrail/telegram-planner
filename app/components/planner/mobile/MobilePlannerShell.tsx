'use client';

import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, ListTodo, Sparkles } from 'lucide-react';
import FloatingActionButton from '../../FloatingActionButton';
import PlannerHeader from '../../PlannerHeader';
import { useKeyboardInset } from '../../../hooks/useKeyboardInset';
import MobileFocusOverlay from './MobileFocusOverlay';
import MobileHabitsTab from './MobileHabitsTab';
import MobileRecurringTasksSheet from './MobileRecurringTasksSheet';
import MobileStatsModal from './MobileStatsModal';
import MobileTaskList from './MobileTaskList';
import MobileTaskSheet from './MobileTaskSheet';
import {
  PLANNER_TABS,
  type PlannerHeaderViewModel,
  type PlannerShellProps,
} from '../shared/types';
import { cn } from '@/app/lib/cn';

export default function MobilePlannerShell({
  planner,
  ui,
}: PlannerShellProps) {
  const keyboardHeight = useKeyboardInset();
  const isKeyboardOpen = keyboardHeight > 0;
  const editingTask = ui.sheet.editingTask;
  const focusTask = ui.activeTask;

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

  const taskListProps = {
    dateKey: format(planner.selectedDate, 'yyyy-MM-dd'),
    tasks: planner.currentTasks,
    isLoading: planner.isLoading,
    onToggle: ui.toggleTask,
    onDelete: ui.deleteTask,
    onEdit: ui.openEdit,
    onMove: planner.moveTask,
    onAdd: ui.openCreate,
    onReorder: planner.handleReorder,
    onToggleActive: planner.toggleActiveTask,
    updateTask: planner.updateTask,
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

  const showFocusShortcut = Boolean(planner.activeTaskId && !ui.showFocus);
  const showPlannerHeader = ui.activeTab === 'tasks';

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--bg)] font-sans text-[var(--ink)]">
      {showPlannerHeader ? (
        <div className="relative z-10 flex-none">
          <PlannerHeader header={header} />
        </div>
      ) : null}

      <main
        className={cn(
          'relative h-full w-full flex-1 overflow-hidden',
          !showPlannerHeader &&
            'pt-[calc(max(env(safe-area-inset-top),var(--tg-content-safe-top,0px))+var(--tma-tg-controls-top,0px)+0.75rem)]',
        )}
      >
        {ui.activeTab === 'tasks' ? (
          <MobileTaskList {...taskListProps} />
        ) : (
          <MobileHabitsTab {...habitsTabProps} />
        )}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-16 bg-gradient-to-t from-[var(--bg)] to-transparent" />
      </main>

      {!isKeyboardOpen && (
        <div
          className="relative z-30 flex-none border-t border-[var(--border)] bg-[var(--surface)]"
          style={{
            paddingBottom:
              'max(env(safe-area-inset-bottom), var(--tg-content-safe-bottom, 0px))',
          }}
        >
          <div className="flex">
            {PLANNER_TABS.map((tab) => {
              const Icon = tab.id === 'tasks' ? ListTodo : Sparkles;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => ui.setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                    ui.activeTab === tab.id
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-[10px] font-bold">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {planner.isSyncing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed z-40 top-[calc(max(env(safe-area-inset-top),var(--tg-content-safe-top,0px))+0.75rem)] right-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))]"
            role="status"
            aria-live="polite"
          >
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] shadow-[var(--shadow-soft)]">
              Синхронизация...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {planner.syncError && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-[calc(10.5rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] left-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] right-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] z-40 mx-auto max-w-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--surface)] px-4 py-3 text-sm shadow-[var(--shadow-pop)]">
              <span className="text-[var(--ink)]">{planner.syncError}</span>
              <button
                type="button"
                onClick={planner.clearSyncError}
                className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-bold text-[var(--muted)] transition-transform active:scale-95"
              >
                Ок
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!ui.sheet.isOpen && ui.activeTab === 'tasks' && !isKeyboardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FloatingActionButton onClick={ui.openCreate} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ui.sheet.isOpen && <MobileTaskSheet key="task-sheet" {...taskSheetProps} />}
      </AnimatePresence>

      <AnimatePresence>
        {ui.showStats && <MobileStatsModal {...statsModalProps} />}

        {ui.showRecurring && <MobileRecurringTasksSheet {...recurringSheetProps} />}

        {ui.showFocus && focusOverlayProps && (
          <MobileFocusOverlay {...focusOverlayProps} />
        )}
      </AnimatePresence>

      {showFocusShortcut && (
        <motion.button
          layoutId="focus-fab"
          type="button"
          onClick={ui.openFocus}
          className="fixed bottom-[calc(6rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] right-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] z-40 flex h-14 items-center gap-2 rounded-full bg-[var(--accent)] px-6 font-bold text-[var(--accent-ink)] shadow-lg"
        >
          <Clock size={20} className="animate-pulse" /> В фокус
        </motion.button>
      )}

      <AnimatePresence>
        {ui.undoTask && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-[calc(6rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] left-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] right-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] z-40 mx-auto max-w-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm font-medium shadow-[var(--shadow-pop)] backdrop-blur-md">
              <span>Задача удалена</span>
              <button
                type="button"
                onClick={ui.undoDelete}
                className="rounded-full bg-[var(--ink)] px-3 py-1.5 font-bold text-[var(--bg)] transition-transform active:scale-95"
              >
                Отменить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ui.dayCompleteVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col items-center justify-center rounded-[32px] border border-[var(--accent)]/20 bg-[var(--surface-glass)] p-6 text-center shadow-[var(--shadow-pop)] backdrop-blur-xl">
              <div className="mb-2 text-[40px]">🎉</div>
              <h2 className="text-xl font-bold text-[var(--ink)] font-[var(--font-display)]">
                День завершен!
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Отличная работа, все цели достигнуты.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
