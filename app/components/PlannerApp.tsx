"use client";

import AddTaskSheet from "./AddTaskSheet";
import FloatingActionButton from "./FloatingActionButton";
import PlannerHeader from "./PlannerHeader";
import TaskList from "./TaskList";
import { usePlanner } from "../hooks/usePlanner";

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
    handleAddTask,
    toggleTask,
    deleteTask,
  } = usePlanner();

  return (
    <div className="min-h-screen pb-24 font-sans text-[var(--ink)] selection:bg-[var(--accent-soft)]">
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
          onToggle={toggleTask}
          onDelete={deleteTask}
        />
      </main>

      <FloatingActionButton onClick={() => setIsAddOpen(true)} />

      <AddTaskSheet
        isOpen={isAddOpen}
        title={newTaskTitle}
        duration={newTaskDuration}
        onClose={() => setIsAddOpen(false)}
        onTitleChange={setNewTaskTitle}
        onDurationChange={setNewTaskDuration}
        onAdd={handleAddTask}
        isAddDisabled={isAddDisabled}
      />
    </div>
  );
}
