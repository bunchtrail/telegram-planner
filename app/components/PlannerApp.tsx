"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import AddTaskSheet, { type AddTaskSheetHandle } from "./AddTaskSheet";
import FloatingActionButton from "./FloatingActionButton";
import PlannerHeader from "./PlannerHeader";
import TaskList from "./TaskList";
import { usePlanner } from "../hooks/usePlanner";
import { useHaptic } from "../hooks/useHaptic";
import type { Task } from "../types/task";

export default function PlannerApp() {
  const {
    selectedDate,
    setSelectedDate,
    isAddOpen,
    setIsAddOpen,
    currentTasks,
    weekDays,
    hours,
    minutes,
    newTaskTitle,
    setNewTaskTitle,
    newTaskDuration,
    setNewTaskDuration,
    isAddDisabled,
    resetNewTask,
    handleAddTask,
    toggleTask,
    deleteTask,
    restoreTask,
    isLoading,
  } = usePlanner();
  const fabRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<AddTaskSheetHandle>(null);
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  const prevIsAddOpenRef = useRef(isAddOpen);
  const { impact, notification } = useHaptic();

  const triggerConfetti = () => {
    const end = Date.now() + 1000;
    const colors = ["#1f7a6f", "#53c1ae", "#e2f2ee"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
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
      resetNewTask();
      fabRef.current?.focus();
    }
    prevIsAddOpenRef.current = isAddOpen;
  }, [isAddOpen, resetNewTask]);

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

  const handleOpenAdd = () => {
    impact("light");
    flushSync(() => setIsAddOpen(true));
    sheetRef.current?.focusTitleInput();
  };

  const handleSmartAddTask = () => {
    if (isAddDisabled) {
      notification("error");
      return;
    }
    notification("success");
    handleAddTask();
  };

  return (
    <div className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] font-sans text-[var(--ink)] selection:bg-[var(--accent-soft)]">
      <PlannerHeader
        selectedDate={selectedDate}
        weekDays={weekDays}
        hours={hours}
        minutes={minutes}
        onSelectDate={setSelectedDate}
      />

      <main className="px-4 py-6">
        <TaskList
          tasks={currentTasks}
          isLoading={isLoading}
          onToggle={handleTaskToggle}
          onDelete={handleDelete}
          onAdd={handleOpenAdd}
        />
      </main>

      <FloatingActionButton ref={fabRef} onClick={handleOpenAdd} />

      <AnimatePresence>
        {isAddOpen && (
          <AddTaskSheet
            key="add-task-sheet"
            ref={sheetRef}
            isOpen={isAddOpen}
            title={newTaskTitle}
            duration={newTaskDuration}
            onClose={() => setIsAddOpen(false)}
            onTitleChange={setNewTaskTitle}
            onDurationChange={setNewTaskDuration}
            onAdd={handleSmartAddTask}
            isAddDisabled={isAddDisabled}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {undoTask && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed left-1/2 z-30 w-[min(92vw,420px)]"
            style={{
              bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--ink)] px-5 py-4 text-sm font-medium text-[var(--bg)] shadow-[0_16px_30px_-20px_rgba(16,12,8,0.45)]">
              <span>Задача удалена</span>
              <button
                type="button"
                onClick={handleUndoDelete}
                className="rounded-lg px-2 py-1 font-bold text-[var(--accent)] transition-colors hover:text-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Отменить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
