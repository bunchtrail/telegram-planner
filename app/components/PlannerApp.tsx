"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import TaskSheet from "./TaskSheet";
import FloatingActionButton from "./FloatingActionButton";
import PlannerHeader from "./PlannerHeader";
import TaskList from "./TaskList";
import KeyboardManager from "./KeyboardManager";
import { usePlanner } from "../hooks/usePlanner";
import { useHaptic } from "../hooks/useHaptic";
import type { Task, TaskRepeat } from "../types/task";

export default function PlannerApp() {
  const {
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    isAddOpen,
    setIsAddOpen,
    currentTasks,
    weekDays,
    monthDays,
    taskDates,
    hours,
    minutes,
    goToToday,
    goToPreviousPeriod,
    goToNextPeriod,
    handleReorder,
    addTask,
    toggleTask,
    deleteTask,
    restoreTask,
    updateTask,
    isLoading,
  } = usePlanner();
  const fabRef = useRef<HTMLButtonElement>(null);
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  const prevIsAddOpenRef = useRef(isAddOpen);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { impact, notification } = useHaptic();

  const triggerConfetti = () => {
    const end = Date.now() + 1000;
    const colors = ["#ff9500", "#ffb340", "#ffffff"];

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
        zIndex: 9999,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  useEffect(() => {
    if (prevIsAddOpenRef.current && !isAddOpen) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    prevIsAddOpenRef.current = isAddOpen;
  }, [isAddOpen]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        window.clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

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

  const handleTaskToggle = (id: string) => {
    const task = currentTasks.find((item) => item.id === id);
    if (task && !task.completed) {
      triggerConfetti();
    }
    toggleTask(id);
  };

  const handleUndoDelete = () => {
    if (!undoTask) return;
    notification("success");
    restoreTask(undoTask);
    setUndoTask(null);
    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  };

  const handleOpenCreate = () => {
    impact("light");
    setSheetMode("create");
    setEditingTask(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    impact("light");
    setSheetMode("edit");
    setEditingTask(task);
    setIsAddOpen(true);
  };

  const handleCloseSheet = () => {
    setIsAddOpen(false);
    setEditingTask(null);
    setSheetMode("create");
  };

  const handleSheetSubmit = (
    title: string,
    duration: number,
    repeat: TaskRepeat,
    repeatCount: number,
  ) => {
    if (sheetMode === "create") {
      addTask(title, duration, repeat, repeatCount);
    } else if (editingTask) {
      updateTask(editingTask.id, { title, duration });
    }
    handleCloseSheet();
  };

  return (
    <>
      <KeyboardManager />
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--bg)] font-sans text-[var(--ink)]">
        <div className="relative z-10 flex-none">
          <PlannerHeader
            selectedDate={selectedDate}
            weekDays={weekDays}
            monthDays={monthDays}
            taskDates={taskDates}
            viewMode={viewMode}
            hours={hours}
            minutes={minutes}
            onSelectDate={setSelectedDate}
            onViewModeChange={setViewMode}
            onPrev={goToPreviousPeriod}
            onNext={goToNextPeriod}
            onToday={goToToday}
          />
        </div>

        <main className="relative h-full w-full flex-1 overflow-hidden">
          <TaskList
            tasks={currentTasks}
            isLoading={isLoading}
            onToggle={handleTaskToggle}
            onDelete={handleDelete}
            onEdit={handleOpenEdit}
            onAdd={handleOpenCreate}
            onReorder={handleReorder}
          />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-16 bg-gradient-to-t from-[var(--bg)] to-transparent" />
        </main>

        <AnimatePresence>
          {!isAddOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FloatingActionButton ref={fabRef} onClick={handleOpenCreate} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAddOpen && (
            <TaskSheet
              key="task-sheet"
              isOpen={isAddOpen}
              onClose={handleCloseSheet}
              mode={sheetMode}
              initialTitle={sheetMode === "edit" ? editingTask?.title : ""}
              initialDuration={sheetMode === "edit" ? editingTask?.duration : 30}
              initialRepeat="none"
              initialRepeatCount={7}
              onSubmit={handleSheetSubmit}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {undoTask && (
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
                  onClick={handleUndoDelete}
                  className="rounded-full bg-[var(--ink)] px-3 py-1.5 font-bold text-[var(--bg)] transition-transform active:scale-95"
                >
                  Отменить
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
