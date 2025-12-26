"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import AddTaskSheet, { type AddTaskSheetHandle } from "./AddTaskSheet";
import FloatingActionButton from "./FloatingActionButton";
import PlannerHeader from "./PlannerHeader";
import TaskList from "./TaskList";
import { usePlanner } from "../hooks/usePlanner";
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
    }, 6500);
  };

  const handleUndoDelete = () => {
    if (!undoTask) return;
    restoreTask(undoTask);
    setUndoTask(null);
    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  };

  const handleOpenAdd = () => {
    flushSync(() => setIsAddOpen(true));
    sheetRef.current?.focusTitleInput();
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
          onToggle={toggleTask}
          onDelete={handleDelete}
          onAdd={handleOpenAdd}
        />
      </main>

      <FloatingActionButton ref={fabRef} onClick={handleOpenAdd} />

      <AddTaskSheet
        ref={sheetRef}
        isOpen={isAddOpen}
        title={newTaskTitle}
        duration={newTaskDuration}
        onClose={() => setIsAddOpen(false)}
        onTitleChange={setNewTaskTitle}
        onDurationChange={setNewTaskDuration}
        onAdd={handleAddTask}
        isAddDisabled={isAddDisabled}
      />

      {undoTask && (
        <div
          className="fixed left-1/2 z-30 w-[min(92vw,420px)] -translate-x-1/2"
          style={{
            bottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--ink)] shadow-[0_16px_30px_-20px_rgba(16,12,8,0.45)]">
            <span>Задача удалена</span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="rounded-lg px-2 py-1 text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Отменить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
