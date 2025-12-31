import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { setSupabaseAccessToken, supabase } from "../lib/supabase";
import type { Task } from "../types/task";

const DEFAULT_DURATION = 30;
type PlannerViewMode = "week" | "month";

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

const mapTaskRow = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  duration: row.duration,
  date: parseDateOnly(row.date),
  completed: row.completed,
});

export function usePlanner() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<PlannerViewMode>("week");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(DEFAULT_DURATION);
  const toggleRequestRef = useRef(new Map<string, number>());
  const pendingInsertRef = useRef(new Map<string, TaskRow>());

  const activeMonthKey = useMemo(
    () => format(selectedDate, "yyyy-MM"),
    [selectedDate],
  );

  const { monthStart, monthEnd, monthStartKey, monthEndKey } = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(start);
    return {
      monthStart: start,
      monthEnd: end,
      monthStartKey: formatDateOnly(start),
      monthEndKey: formatDateOnly(end),
    };
  }, [activeMonthKey]);

  const weekDays = useMemo(() => {
    const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let cursor = gridStart;

    while (cursor <= gridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return days;
  }, [monthStartKey, monthEndKey, monthStart, monthEnd]);

  const taskDates = useMemo(() => {
    const dateSet = new Set<string>();
    tasks.forEach((task) => {
      dateSet.add(formatDateOnly(task.date));
    });
    return dateSet;
  }, [tasks]);

  const isDateInActiveMonth = useCallback(
    (value: string | Date | null | undefined) => {
      if (!value) return false;
      if (typeof value === "string") {
        return value.slice(0, 7) === activeMonthKey;
      }
      return format(value, "yyyy-MM") === activeMonthKey;
    },
    [activeMonthKey],
  );

  useEffect(() => {
    const webApp = getTelegramWebApp();
    webApp?.ready?.();
    webApp?.expand?.();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const initAuth = async () => {
      if (!isCancelled) {
        setIsLoading(true);
      }

      try {
        const initData = getTelegramInitData();
        if (!initData) {
          if (!isCancelled) {
            setIsLoading(false);
          }
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
          if (!isCancelled) {
            setIsLoading(false);
          }
          return;
        }

        setSupabaseAccessToken(payload.token);
        if (payload.user?.id != null) {
          setUserId(String(payload.user.id));
        } else if (!isCancelled) {
          setIsLoading(false);
        }
      } catch (error) {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`tasks-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `telegram_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as TaskRow;
            if (!row?.id || !isDateInActiveMonth(row.date)) return;

            setTasks((prev) => {
              if (prev.some((task) => task.id === row.id)) {
                return prev;
              }

              let pendingMatchId: string | null = null;
              for (const [tempId, pending] of pendingInsertRef.current) {
                if (
                  pending.title === row.title &&
                  pending.duration === row.duration &&
                  pending.date === row.date &&
                  pending.completed === row.completed
                ) {
                  pendingMatchId = tempId;
                  break;
                }
              }

              if (pendingMatchId) {
                pendingInsertRef.current.delete(pendingMatchId);
                return prev.map((task) =>
                  task.id === pendingMatchId ? mapTaskRow(row) : task,
                );
              }

              return [...prev, mapTaskRow(row)];
            });
          }

          if (payload.eventType === "UPDATE") {
            const row = payload.new as TaskRow;
            if (!row?.id) return;
            const isInMonth = isDateInActiveMonth(row.date);

            setTasks((prev) => {
              const exists = prev.some((task) => task.id === row.id);

              if (isInMonth) {
                if (exists) {
                  return prev.map((task) =>
                    task.id === row.id ? mapTaskRow(row) : task,
                  );
                }
                return [...prev, mapTaskRow(row)];
              }

              if (!exists) return prev;
              return prev.filter((task) => task.id !== row.id);
            });
          }

          if (payload.eventType === "DELETE") {
            const row = payload.old as TaskRow;
            if (!row?.id || !isDateInActiveMonth(row.date)) return;
            setTasks((prev) => prev.filter((task) => task.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isDateInActiveMonth]);

  useEffect(() => {
    if (!userId) return;
    let isCancelled = false;

    const fetchTasks = async () => {
      setIsLoading(true);
      setTasks([]);
      pendingInsertRef.current.clear();

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .gte("date", monthStartKey)
        .lte("date", monthEndKey)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isCancelled) {
        if (!tasksError && tasksData) {
          setTasks(tasksData.map((t: TaskRow) => mapTaskRow(t)));
        }
        setIsLoading(false);
      }
    };

    fetchTasks();
    return () => {
      isCancelled = true;
    };
  }, [userId, monthStartKey, monthEndKey]);

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

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const goToPreviousPeriod = useCallback(() => {
    setSelectedDate((current) =>
      viewMode === "month" ? subMonths(current, 1) : subWeeks(current, 1),
    );
  }, [viewMode]);

  const goToNextPeriod = useCallback(() => {
    setSelectedDate((current) =>
      viewMode === "month" ? addMonths(current, 1) : addWeeks(current, 1),
    );
  }, [viewMode]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      return;
    }
    if (!userId) {
      return;
    }

    const tempId = Math.random().toString(36).substring(2, 9);
    const pendingRow: TaskRow = {
      id: tempId,
      title: newTaskTitle,
      duration: newTaskDuration,
      date: formatDateOnly(selectedDate),
      completed: false,
    };
    pendingInsertRef.current.set(tempId, pendingRow);

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

    pendingInsertRef.current.delete(tempId);

    if (error) {
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
    viewMode,
    setViewMode,
    isAddOpen,
    setIsAddOpen,
    tasks,
    currentTasks,
    weekDays,
    monthDays,
    taskDates,
    hours,
    minutes,
    newTaskTitle,
    setNewTaskTitle,
    newTaskDuration,
    setNewTaskDuration,
    isAddDisabled,
    resetNewTask,
    goToToday,
    goToPreviousPeriod,
    goToNextPeriod,
    handleAddTask,
    toggleTask,
    deleteTask,
    restoreTask,
    isLoading,
  };
}
