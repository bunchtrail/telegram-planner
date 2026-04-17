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
import type { PlannerShellProps } from '../shared/types';

export default function MobilePlannerShell({
  planner,
  ui,
}: PlannerShellProps) {
  const keyboardHeight = useKeyboardInset();
  const isKeyboardOpen = keyboardHeight > 0;

  return (
    <>
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--bg)] font-sans text-[var(--ink)]">
        <div className="relative z-10 flex-none">
          <PlannerHeader
            selectedDate={planner.selectedDate}
            weekDays={planner.weekDays}
            monthDays={planner.monthDays}
            taskDates={planner.taskDates}
            viewMode={planner.viewMode}
            hours={planner.hours}
            minutes={planner.minutes}
            completedCount={ui.completedCount}
            totalCount={ui.totalCount}
            onSelectDate={planner.setSelectedDate}
            onViewModeChange={planner.setViewMode}
            onPrev={planner.goToPreviousPeriod}
            onNext={planner.goToNextPeriod}
            onToday={planner.goToToday}
            onOpenStats={ui.openStats}
            onOpenRecurring={ui.openRecurring}
          />
        </div>

        <main className="relative h-full w-full flex-1 overflow-hidden">
          {ui.activeTab === 'tasks' ? (
            <MobileTaskList
              dateKey={format(planner.selectedDate, 'yyyy-MM-dd')}
              tasks={planner.currentTasks}
              isLoading={planner.isLoading}
              onToggle={ui.toggleTask}
              onDelete={ui.deleteTask}
              onEdit={ui.openEdit}
              onMove={planner.moveTask}
              onAdd={ui.openCreate}
              onReorder={planner.handleReorder}
              onToggleActive={planner.toggleActiveTask}
              updateTask={planner.updateTask}
            />
          ) : (
            <MobileHabitsTab
              habits={planner.habits}
              isLoading={planner.habitsLoading}
              isChecked={planner.isHabitChecked}
              isLogPending={planner.isHabitLogPending}
              onToggleLog={planner.toggleHabitLog}
              onAddHabit={planner.addHabit}
              onDeleteHabit={planner.deleteHabit}
              selectedDate={planner.selectedDate}
            />
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
              <button
                onClick={() => ui.setActiveTab('tasks')}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  ui.activeTab === 'tasks'
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                <ListTodo size={22} />
                <span className="text-[10px] font-bold">Задачи</span>
              </button>
              <button
                onClick={() => ui.setActiveTab('habits')}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  ui.activeTab === 'habits'
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                <Sparkles size={22} />
                <span className="text-[10px] font-bold">Привычки</span>
              </button>
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
          {ui.sheet.isOpen && (
            <MobileTaskSheet
              key="task-sheet"
              onClose={ui.closeSheet}
              mode={ui.sheet.mode}
              initialTitle={ui.sheet.mode === 'edit' ? ui.sheet.editingTask?.title : ''}
              initialDuration={ui.sheet.mode === 'edit' ? ui.sheet.editingTask?.duration : 30}
              initialColor={ui.sheet.mode === 'edit' ? ui.sheet.editingTask?.color : undefined}
              initialRepeat="none"
              initialRepeatCount={7}
              initialStartMinutes={
                ui.sheet.mode === 'edit' ? ui.sheet.editingTask?.startMinutes : null
              }
              initialRemindBeforeMinutes={
                ui.sheet.mode === 'edit'
                  ? ui.sheet.editingTask?.remindBeforeMinutes
                  : 0
              }
              taskDate={
                ui.sheet.mode === 'edit'
                  ? (ui.sheet.editingTask?.date ?? planner.selectedDate)
                  : planner.selectedDate
              }
              onSubmit={ui.submitSheet}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {ui.showStats && (
            <MobileStatsModal
              streak={planner.streak}
              tasks={planner.tasks}
              selectedDate={planner.selectedDate}
              onClose={ui.closeStats}
              pomodoroStats={planner.pomodoroStats}
            />
          )}

          {ui.showRecurring && (
            <MobileRecurringTasksSheet
              onClose={ui.closeRecurring}
              recurringTasks={planner.recurringTasks}
              recurringSkips={planner.recurringSkips}
              onDeleteSeries={planner.deleteTaskSeries}
              onSkipDate={planner.skipTaskSeriesDate}
            />
          )}

          {ui.showFocus && ui.activeTask && (
            <MobileFocusOverlay
              task={ui.activeTask}
              isActive={planner.activeTaskId === ui.activeTask.id}
              onToggleTimer={() => planner.toggleActiveTask(ui.activeTask!.id)}
              onClose={ui.closeFocus}
              runWithAuthRetry={planner.runWithAuthRetry}
            />
          )}
        </AnimatePresence>

        {planner.activeTaskId && !ui.showFocus && (
          <motion.button
            layoutId="focus-fab"
            onClick={ui.openFocus}
            className="fixed bottom-[calc(6rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] right-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] h-14 px-6 bg-[var(--accent)] text-[var(--accent-ink)] rounded-full font-bold shadow-lg z-40 flex items-center gap-2"
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
              role="status"
              aria-live="polite"
            >
              <div className="bg-[var(--surface-glass)] backdrop-blur-xl border border-[var(--accent)]/20 shadow-[var(--shadow-pop)] rounded-[32px] p-6 flex flex-col items-center justify-center text-center">
                <div className="text-[40px] mb-2">🎉</div>
                <h2 className="text-xl font-bold text-[var(--ink)] font-[var(--font-display)]">
                  День завершен!
                </h2>
                <p className="text-sm text-[var(--muted)] mt-1">
                  Отличная работа, все цели достигнуты.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
