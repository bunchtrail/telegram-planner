import { useCallback, useMemo, useState } from "react";
import { addDays, isSameDay, startOfWeek } from "date-fns";
import type { Task } from "../types/task";
import { seedTasks } from "../data/seedTasks";

const DEFAULT_DURATION = 30;

export function usePlanner(initialTasks: Task[] = seedTasks) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(DEFAULT_DURATION);

  const weekDays = useMemo(() => {
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, []);

  const currentTasks = useMemo(
    () => tasks.filter((task) => isSameDay(task.date, selectedDate)),
    [tasks, selectedDate],
  );

  const totalMinutes = useMemo(
    () =>
      currentTasks.reduce(
        (acc, task) => acc + (task.completed ? 0 : task.duration),
        0,
      ),
    [currentTasks],
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const isAddDisabled = newTaskTitle.trim().length === 0;

  const resetNewTask = useCallback(() => {
    setNewTaskTitle("");
    setNewTaskDuration(DEFAULT_DURATION);
  }, [setNewTaskTitle, setNewTaskDuration]);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title: newTaskTitle,
      duration: newTaskDuration,
      date: selectedDate,
      completed: false,
    };

    setTasks((prev) => [...prev, newTask]);
    resetNewTask();
    setIsAddOpen(false);
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
            }
          : task,
      ),
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const restoreTask = (task: Task) => {
    setTasks((prev) => [...prev, task]);
  };

  return {
    selectedDate,
    setSelectedDate,
    isAddOpen,
    setIsAddOpen,
    tasks,
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
  };
}
