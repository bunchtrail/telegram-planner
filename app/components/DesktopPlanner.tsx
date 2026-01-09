'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import MonthGrid from './MonthGrid';
import TaskList from './TaskList';
import TaskSheet from './TaskSheet';
import FocusOverlay from './FocusOverlay';
import StatsModal from './StatsModal';
import { useHaptic } from '../hooks/useHaptic';
import { useReward } from '../hooks/useReward';
import type { Task, TaskRepeat } from '../types/task';
import type { usePlanner } from '../hooks/usePlanner';
import { cn } from '../lib/cn';

type DesktopPlannerProps = {
  planner: ReturnType<typeof usePlanner>;
};

export default function DesktopPlanner({ planner }: DesktopPlannerProps) {
  const {
    selectedDate,
    setSelectedDate,
    tasks,
    streak,
    currentTasks,
    monthDays,
    taskDates,
    hours,
    minutes,
    activeTaskId,
    toggleActiveTask,
    goToPreviousPeriod,
    goToNextPeriod,
    goToToday,
    handleReorder,
    addTask,
    toggleTask,
    deleteTask,
    restoreTask,
    updateTask,
    moveTask,
    isLoading,
  } = planner;

  const { impact, notification } = useHaptic();
  const { fire } = useReward();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showFocus, setShowFocus] = useState(false);
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const [showDayComplete, setShowDayComplete] = useState(false);
  const undoTimeoutRef = useRef<number | null>(null);
  const dayCompleteTimeoutRef = useRef<number | null>(null);

  const activeTaskObj = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [tasks, activeTaskId]
  );

  const { completedCount, totalCount } = useMemo(() => {
    return {
      completedCount: currentTasks.filter((task) => task.completed).length,
      totalCount: currentTasks.length,
    };
  }, [currentTasks]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        window.clearTimeout(undoTimeoutRef.current);
      }
      if (dayCompleteTimeoutRef.current) {
        window.clearTimeout(dayCompleteTimeoutRef.current);
      }
    };
  }, []);

  const handleOpenCreate = () => {
    impact('light');
    setSheetMode('create');
    setEditingTask(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    impact('light');
    setSheetMode('edit');
    setEditingTask(task);
    setIsAddOpen(true);
  };

  const handleCloseSheet = () => {
    setIsAddOpen(false);
    setEditingTask(null);
    setSheetMode('create');
  };

  const handleSheetSubmit = (
    title: string,
    duration: number,
    repeat: TaskRepeat,
    repeatCount: number,
    color: string,
    startMinutes: number | null,
    remindBeforeMinutes: number
  ) => {
    if (sheetMode === 'create') {
      addTask(
        title,
        duration,
        repeat,
        repeatCount,
        color,
        startMinutes,
        remindBeforeMinutes
      );
    } else if (editingTask) {
      updateTask(editingTask.id, {
        title,
        duration,
        color,
        startMinutes,
        remindBeforeMinutes,
      });
    }
    handleCloseSheet();
  };

  const handleTaskToggle = (id: string, coords?: { x: number; y: number }) => {
    const task = currentTasks.find((item) => item.id === id);
    if (!task) return;
    const isCompleting = !task.completed;

    if (isCompleting) {
      const othersCompleted = currentTasks.filter(
        (item) => item.id !== id && item.completed
      ).length;
      const isLastOne = othersCompleted === totalCount - 1;

      if (isLastOne && totalCount > 1) {
        fire(window.innerWidth / 2, window.innerHeight, 'climax');
        notification('success');
        setShowDayComplete(true);
        if (dayCompleteTimeoutRef.current) {
          window.clearTimeout(dayCompleteTimeoutRef.current);
        }
        dayCompleteTimeoutRef.current = window.setTimeout(() => {
          setShowDayComplete(false);
          dayCompleteTimeoutRef.current = null;
        }, 3000);
      } else if (coords) {
        fire(coords.x, coords.y, 'light');
      }
    }
    toggleTask(id);
  };

  const handleDelete = async (id: string) => {
    const deletedTask = await deleteTask(id);
    if (!deletedTask) return;
    setUndoTask(deletedTask);
    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = window.setTimeout(() => {
      setUndoTask(null);
      undoTimeoutRef.current = null;
    }, 4000);
  };

  const handleUndoDelete = () => {
    if (!undoTask) return;
    notification('success');
    restoreTask(undoTask);
    setUndoTask(null);
    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg)] text-[var(--ink)] overflow-hidden font-sans selection:bg-[var(--accent)] selection:text-[var(--accent-ink)]">
      {/* 
        LEFT PANEL REWORK
        Wider panel (380px), modern dashboard aesthetic, cleaner typography.
      */}
      <aside className="w-[380px] flex-none border-r border-[var(--border)] bg-[var(--surface)] flex flex-col relative z-30 shadow-2xl shadow-[var(--shadow-soft)]">
        {/* Header Title */}
        <div className="pt-10 px-8 pb-6 flex items-center gap-3">
          <div className="h-10 w-10 bg-[var(--ink)] text-[var(--bg)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--ink)]/20">
            <Zap
              size={24}
              strokeWidth={2.5}
              fill="currentColor"
              className="text-[var(--bg)]"
            />
          </div>
          <h1 className="text-3xl font-bold font-[var(--font-display)] tracking-tight text-[var(--ink)]">
            Planner
          </h1>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-8 no-scrollbar space-y-10 pb-4">
          {/* Calendar Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={goToToday}
                className="text-xl font-bold capitalize font-[var(--font-display)] text-[var(--ink)] hover:text-[var(--accent)] transition-colors text-left"
                title="Перейти к сегодня"
              >
                {format(selectedDate, 'LLLL yyyy', { locale: ru })}
              </button>
              <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
                <button
                  onClick={goToPreviousPeriod}
                  className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all text-[var(--muted)] hover:text-[var(--ink)] active:scale-90"
                  aria-label="Назад"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goToNextPeriod}
                  className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all text-[var(--muted)] hover:text-[var(--ink)] active:scale-90"
                  aria-label="Вперед"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="-mx-2 select-none">
              <MonthGrid
                days={monthDays}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                taskDates={taskDates}
              />
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] opacity-80">
                Обзор дня
              </h3>
              <button
                onClick={() => setShowStats(true)}
                className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:underline flex items-center gap-0.5"
              >
                Подробнее <ArrowUpRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Streak Card */}
              <button
                onClick={() => setShowStats(true)}
                className="group relative overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] hover:border-orange-500/30 p-4 rounded-[24px] transition-all hover:shadow-lg hover:shadow-orange-500/5 text-left flex flex-col justify-between h-32"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform duration-300">
                    <Flame size={18} fill="currentColor" />
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-500">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums text-[var(--ink)] leading-none mb-1">
                    {streak}
                  </div>
                  <div className="text-[12px] font-medium text-[var(--muted)]">
                    Серия дней
                  </div>
                </div>
              </button>

              {/* Focus Time Card */}
              <div className="group relative overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-[24px] transition-all flex flex-col justify-between h-32">
                <div className="w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-[var(--ink)]/10">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums text-[var(--ink)] leading-none mb-1 flex items-baseline gap-0.5">
                    {hours}
                    <span className="text-sm font-semibold text-[var(--muted)] opacity-70">
                      ч
                    </span>
                    {minutes}
                    <span className="text-sm font-semibold text-[var(--muted)] opacity-70">
                      м
                    </span>
                  </div>
                  <div className="text-[12px] font-medium text-[var(--muted)]">
                    В фокусе
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Task Widget (Appears when task is running) */}
          <AnimatePresence>
            {activeTaskObj && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="relative"
              >
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3 opacity-80 pl-1">
                  Сейчас в работе
                </h3>
                <button
                  onClick={() => setShowFocus(true)}
                  className="w-full text-left group"
                >
                  <div className="bg-[var(--surface)] border border-[var(--accent)]/30 rounded-[24px] p-1 shadow-lg shadow-[var(--accent)]/5 hover:shadow-[var(--accent)]/10 transition-all hover:-translate-y-0.5">
                    <div className="bg-[var(--surface-2)] rounded-[20px] p-4 flex items-center gap-4 relative overflow-hidden">
                      {/* Subtle gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent opacity-50 pointer-events-none" />

                      <div className="h-11 w-11 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--accent)]/20 z-10">
                        <Clock
                          className="animate-pulse"
                          size={22}
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="z-10 min-w-0 pr-2">
                        <div className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mb-0.5">
                          Таймер запущен
                        </div>
                        <div className="font-bold truncate text-[var(--ink)] text-[15px]">
                          {activeTaskObj.title}
                        </div>
                      </div>
                      <div className="ml-auto text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors z-10">
                        <ArrowUpRight size={18} />
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Action Area */}
        <div className="p-8 mt-auto bg-gradient-to-t from-[var(--surface)] via-[var(--surface)] to-transparent pt-6">
          <button
            onClick={handleOpenCreate}
            className="w-full h-[68px] bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-[var(--bg)] rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 shadow-[var(--shadow-pop)] hover:shadow-2xl hover:shadow-[var(--ink)]/20 hover:-translate-y-1 active:translate-y-0 active:shadow-sm transition-all duration-300 group"
          >
            <div className="bg-[var(--bg)]/20 p-1.5 rounded-full group-hover:rotate-90 transition-transform duration-500">
              <Plus size={22} strokeWidth={3} />
            </div>
            <span className="font-[var(--font-display)] tracking-tight">
              Новая задача
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--surface-2)] relative">
        {/* Optional pattern for main content */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--ink) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        <header className="h-28 shrink-0 px-12 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur sticky top-0 z-20">
          <div>
            <div className="flex items-baseline gap-4 mb-1">
              <h2 className="text-4xl font-bold font-[var(--font-display)] capitalize tracking-tight text-[var(--ink)]">
                {format(selectedDate, 'd MMMM', { locale: ru })}
              </h2>
              {isSameDay(selectedDate, new Date()) && (
                <span className="text-[var(--accent)] font-bold text-xs bg-[var(--accent)]/10 px-3 py-1.5 rounded-full uppercase tracking-wider border border-[var(--accent)]/10">
                  Сегодня
                </span>
              )}
            </div>
            <p className="text-[var(--muted)] font-medium capitalize text-lg flex items-center gap-2">
              {format(selectedDate, 'EEEE', { locale: ru })}
              <span className="w-1 h-1 rounded-full bg-[var(--muted)] opacity-50" />
              {currentTasks.length}{' '}
              {currentTasks.length === 1
                ? 'задача'
                : currentTasks.length > 1 && currentTasks.length < 5
                ? 'задачи'
                : 'задач'}
            </p>
          </div>

          {totalCount > 0 && (
            <div className="h-16 px-6 bg-[var(--surface)] rounded-[20px] border border-[var(--border)] shadow-sm flex items-center gap-5">
              <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                Прогресс
              </div>
              <div className="h-8 w-[1px] bg-[var(--border)]" />
              <div className="text-3xl font-bold text-[var(--ink)] tabular-nums font-[var(--font-display)]">
                {completedCount}
                <span className="text-[var(--muted)] text-xl opacity-60 font-sans font-semibold">
                  / {totalCount}
                </span>
              </div>
              {completedCount === totalCount && (
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center animate-in fade-in zoom-in duration-300">
                  <CheckCircle2 size={18} />
                </div>
              )}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto px-12 py-10 max-w-6xl mx-auto w-full no-scrollbar">
            <TaskList
              dateKey={format(selectedDate, 'yyyy-MM-dd')}
              tasks={currentTasks}
              isLoading={isLoading}
              onToggle={handleTaskToggle}
              onDelete={handleDelete}
              onEdit={handleOpenEdit}
              onMove={moveTask}
              onAdd={handleOpenCreate}
              onReorder={handleReorder}
              onToggleActive={toggleActiveTask}
              updateTask={updateTask}
              isDesktop
              className="pl-0 pr-0"
            />
            <div className="h-32" />
          </div>
        </div>
      </main>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {isAddOpen && (
          <TaskSheet
            key="task-sheet"
            onClose={handleCloseSheet}
            mode={sheetMode}
            initialTitle={sheetMode === 'edit' ? editingTask?.title : ''}
            initialDuration={sheetMode === 'edit' ? editingTask?.duration : 30}
            initialColor={sheetMode === 'edit' ? editingTask?.color : undefined}
            initialRepeat="none"
            initialRepeatCount={7}
            initialStartMinutes={
              sheetMode === 'edit' ? editingTask?.startMinutes : null
            }
            initialRemindBeforeMinutes={
              sheetMode === 'edit' ? editingTask?.remindBeforeMinutes : 0
            }
            taskDate={
              sheetMode === 'edit'
                ? editingTask?.date ?? selectedDate
                : selectedDate
            }
            isDesktop
            onSubmit={handleSheetSubmit}
          />
        )}

        {showStats && (
          <StatsModal
            streak={streak}
            tasks={tasks}
            selectedDate={selectedDate}
            onClose={() => setShowStats(false)}
          />
        )}

        {showFocus && activeTaskObj && (
          <FocusOverlay
            task={activeTaskObj}
            isActive={activeTaskId === activeTaskObj.id}
            onToggleTimer={() => toggleActiveTask(activeTaskObj.id)}
            onClose={() => setShowFocus(false)}
          />
        )}

        {undoTask && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--ink)] text-[var(--bg)] px-6 py-4 text-sm font-medium shadow-2xl">
              <span>Задача удалена</span>
              <button
                type="button"
                onClick={handleUndoDelete}
                className="text-[var(--accent)] font-bold hover:underline"
              >
                Отменить
              </button>
            </div>
          </motion.div>
        )}

        {showDayComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="bg-[var(--surface)]/90 backdrop-blur-xl border border-[var(--border)] shadow-2xl rounded-[32px] p-10 flex flex-col items-center justify-center text-center max-w-sm">
              <div className="text-[64px] mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-[var(--ink)] font-[var(--font-display)]">
                День завершен!
              </h2>
              <p className="text-[var(--muted)] mt-2 text-lg">
                Отличная работа, все цели достигнуты.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
