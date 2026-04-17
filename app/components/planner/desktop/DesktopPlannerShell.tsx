'use client';

import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  ListTodo,
  Plus,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import MonthGrid from '../../MonthGrid';
import DesktopFocusOverlay from './DesktopFocusOverlay';
import DesktopHabitsTab from './DesktopHabitsTab';
import DesktopRecurringTasksSheet from './DesktopRecurringTasksSheet';
import DesktopStatsModal from './DesktopStatsModal';
import DesktopTaskList from './DesktopTaskList';
import DesktopTaskSheet from './DesktopTaskSheet';
import {
  createPlannerShellViewModel,
  PLANNER_TABS,
  type PlannerShellProps,
} from '../shared/types';

export default function DesktopPlannerShell({
  planner,
  ui,
}: PlannerShellProps) {
  const shell = createPlannerShellViewModel(planner, ui);
  const header = shell.header;
  const isToday = isSameDay(header.selectedDate, new Date());

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)] font-sans text-[var(--ink)]">
      <aside className="z-10 flex w-80 flex-none flex-col gap-6 border-r border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--bg)] shadow-lg shadow-[var(--ink)]/20">
            <CalendarDays size={24} />
          </div>
          <h1 className="text-2xl font-bold font-[var(--font-display)]">
            Planner
          </h1>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-2)]/30 p-4">
            <div className="mb-4 flex items-center justify-between px-2">
              <span className="text-lg font-bold capitalize text-[var(--ink)]">
                {format(header.selectedDate, 'LLLL yyyy', { locale: ru })}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={header.onPrev}
                  className="rounded-lg p-1 transition-colors hover:bg-[var(--surface-2)]"
                  aria-label="Предыдущий месяц"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={header.onNext}
                  className="rounded-lg p-1 transition-colors hover:bg-[var(--surface-2)]"
                  aria-label="Следующий месяц"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <MonthGrid
              days={header.monthDays}
              selectedDate={header.selectedDate}
              onSelectDate={header.onSelectDate}
              taskDates={header.taskDates}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={header.onOpenStats}
              className="group flex flex-col gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm transition-colors hover:border-[var(--accent)]"
              aria-label="Статистика"
            >
              <div className="w-fit rounded-full bg-orange-500/10 p-2 text-orange-500 transition-transform group-hover:scale-110">
                <Flame size={18} fill="currentColor" />
              </div>
              <div>
                <div className="text-2xl font-bold leading-none tabular-nums">
                  {planner.streak}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Серия
                </div>
              </div>
            </button>

            <div className="flex flex-col gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="w-fit rounded-full bg-[var(--ink)]/5 p-2 text-[var(--ink)]">
                <Clock size={18} />
              </div>
              <div>
                <div className="flex items-baseline gap-0.5 text-xl font-bold leading-none tabular-nums">
                  {header.hours}
                  <span className="text-xs font-medium text-[var(--muted)]">
                    ч
                  </span>
                  {header.minutes}
                  <span className="text-xs font-medium text-[var(--muted)]">
                    м
                  </span>
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  За день
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          {ui.activeTask && (
            <button
              type="button"
              onClick={shell.overlays.openFocus}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 font-bold text-[var(--accent-ink)] shadow-lg transition-all hover:brightness-110 active:scale-95"
            >
              <Clock className="animate-pulse" /> Текущая задача
            </button>
          )}

          {shell.activeTab === 'tasks' && (
            <button
              type="button"
              onClick={header.onOpenRecurring}
              className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] font-bold text-[var(--ink)] shadow-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Repeat size={18} />
              <span>Повторы</span>
            </button>
          )}

          {shell.activeTab === 'tasks' && (
            <button
              type="button"
              onClick={ui.openCreate}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] font-bold text-[var(--bg)] shadow-xl shadow-[var(--ink)]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span>Новая задача</span>
            </button>
          )}
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--surface-2)]/30">
        <header className="sticky top-0 z-20 flex h-24 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/80 px-12 backdrop-blur">
          <div>
            <div className="mb-1 flex items-baseline gap-4">
              <h2 className="text-4xl font-bold capitalize tracking-tight font-[var(--font-display)]">
                {format(header.selectedDate, 'd MMMM', { locale: ru })}
              </h2>
              {isToday && (
                <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                  Сегодня
                </span>
              )}
            </div>
            <p className="text-lg font-medium capitalize text-[var(--muted)]">
              {format(header.selectedDate, 'EEEE', { locale: ru })} •{' '}
              {planner.currentTasks.length} задач
            </p>
          </div>

          {header.totalCount > 0 && (
            <div className="flex h-14 items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 shadow-sm">
              <div className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
                Прогресс
              </div>
              <div className="h-6 w-[1px] bg-[var(--border)]" />
              <div className="text-2xl font-bold tabular-nums text-[var(--ink)]">
                {header.completedCount}
                <span className="text-xl text-[var(--muted)]">
                  / {header.totalCount}
                </span>
              </div>
            </div>
          )}
        </header>

        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg)]/80 px-12 backdrop-blur">
          <div className="flex gap-1">
            {PLANNER_TABS.map((tab) => {
              const Icon = tab.id === 'tasks' ? ListTodo : Sparkles;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => shell.setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
                    shell.activeTab === tab.id
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Icon size={18} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="no-scrollbar absolute inset-0 mx-auto w-full max-w-6xl overflow-y-auto px-12 py-10">
            {shell.activeTab === 'tasks' ? (
              <DesktopTaskList {...shell.taskListProps} className="pl-0 pr-0" />
            ) : (
              <DesktopHabitsTab {...shell.habitsTabProps} />
            )}
            <div className="h-32" />
          </div>
        </div>
      </main>

      <AnimatePresence>
        {shell.overlays.showTaskSheet && (
          <DesktopTaskSheet key="task-sheet" {...shell.overlays.taskSheetProps} />
        )}

        {shell.overlays.showStats && (
          <DesktopStatsModal {...shell.overlays.statsModalProps} />
        )}

        {shell.overlays.showRecurring && (
          <DesktopRecurringTasksSheet {...shell.overlays.recurringSheetProps} />
        )}

        {shell.overlays.showFocus && shell.overlays.focusOverlayProps && (
          <DesktopFocusOverlay {...shell.overlays.focusOverlayProps} />
        )}

        {shell.overlays.undoTask && (
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
                onClick={shell.overlays.undoDelete}
                className="font-bold text-[var(--accent)] hover:underline"
              >
                Отменить
              </button>
            </div>
          </motion.div>
        )}

        {shell.overlays.dayCompleteVisible && (
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
