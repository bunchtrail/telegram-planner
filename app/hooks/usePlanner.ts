import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { setSupabaseAccessToken, supabase } from "../lib/supabase";
import type { Task } from "../types/task";

const DEFAULT_DURATION = 30;

type TaskRow = {
  id: string;
  title: string;
  duration: number;
  date: string;
  completed: boolean;
};

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
};

const getTelegramWebApp = () => {
  if (typeof window === "undefined") return null;

  const telegram = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } })
    .Telegram;
  return telegram?.WebApp ?? null;
};

const getTelegramInitData = () => {
  const initData = getTelegramWebApp()?.initData;
  if (typeof initData === "string" && initData.length > 0) {
    return initData;
  }

  if (process.env.NODE_ENV !== "production") {
    const devInitData = process.env.NEXT_PUBLIC_TELEGRAM_INIT_DATA;
    if (devInitData) return devInitData;
  }

  return null;
};

const formatDateOnly = (value: Date) => format(value, "yyyy-MM-dd");

const parseDateOnly = (value: string) => {
  if (!value) return new Date();
  if (value.includes("T")) return new Date(value);

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};

export function usePlanner() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [userId, setUserId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(DEFAULT_DURATION);
  const toggleRequestRef = useRef(new Map<string, number>());

  const weekDays = useMemo(() => {
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, []);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    webApp?.ready?.();
    webApp?.expand?.();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const initAuthAndFetch = async () => {
      setIsLoading(true);

      try {
        const initData = getTelegramInitData();
        if (!initData) {
          console.error("Telegram initData is missing.");
          return;
        }

        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { token?: string; error?: string; user?: { id?: string | number } }
          | null;

        if (!response.ok || !payload?.token) {
          console.error(
            "Telegram auth error:",
            payload?.error ?? response.statusText,
          );
          return;
        }

        setSupabaseAccessToken(payload.token);
        if (payload.user?.id != null) {
          setUserId(String(payload.user.id));
        }

        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .order("date", { ascending: true })
          .order("created_at", { ascending: true });

        if (tasksError) {
          console.error("Error fetching tasks:", tasksError);
          return;
        }

        if (tasksData && !isCancelled) {
          const loadedTasks: Task[] = tasksData.map((t: TaskRow) => ({
            id: t.id,
            title: t.title,
            duration: t.duration,
            date: parseDateOnly(t.date),
            completed: t.completed,
          }));
          setTasks(loadedTasks);
        }
      } catch (error) {
        console.error("Error initializing planner:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initAuthAndFetch();
    return () => {
      isCancelled = true;
    };
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
  }, []);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    if (!userId) {
      console.error("User ID not found.");
      return;
    }

    const tempId = Math.random().toString(36).substring(2, 9);

    const newTask: Task = {
      id: tempId,
      title: newTaskTitle,
      duration: newTaskDuration,
      date: selectedDate,
      completed: false,
    };

    setTasks((prev) => [...prev, newTask]);
    resetNewTask();
    setIsAddOpen(false);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: newTask.title,
        duration: newTask.duration,
        date: formatDateOnly(newTask.date),
        completed: false,
        telegram_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding task:", error);
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    } else if (data) {
      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? { ...t, id: data.id } : t)),
      );
    }
  };

  const toggleTask = async (id: string) => {
    const requestId = (toggleRequestRef.current.get(id) ?? 0) + 1;
    toggleRequestRef.current.set(id, requestId);

    let newStatus: boolean | null = null;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        newStatus = !task.completed;
        return { ...task, completed: newStatus };
      }),
    );

    if (newStatus === null) {
      toggleRequestRef.current.delete(id);
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ completed: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Error toggling task:", error);
      if (toggleRequestRef.current.get(id) !== requestId) {
        return;
      }
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, completed: !newStatus } : task,
        ),
      );
    }
  };

  const deleteTask = async (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;
    const taskIndex = tasks.findIndex((t) => t.id === id);

    setTasks((prev) => prev.filter((task) => task.id !== id));

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting task:", error);
      setTasks((prev) => {
        const next = [...prev];
        const index =
          taskIndex >= 0 && taskIndex <= next.length
            ? taskIndex
            : next.length;
        next.splice(index, 0, taskToDelete);
        return next;
      });
      return null;
    }
    return taskToDelete;
  };

  const restoreTask = async (task: Task) => {
    setTasks((prev) => [...prev, task]);

    if (!userId) {
      console.error("User ID not found.");
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: task.title,
        duration: task.duration,
        date: formatDateOnly(task.date),
        completed: task.completed,
        telegram_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error restoring task", error);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } else if (data) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, id: data.id } : t)),
      );
    }
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
    isLoading,
  };
}
