import { format } from 'date-fns';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useHaptic } from './useHaptic';
import type { usePlanner } from './usePlanner';
import { useReward } from './useReward';
import type { Task, TaskRepeat } from '../types/task';

export type PlannerModel = ReturnType<typeof usePlanner>;
export type PlannerSheetMode = 'create' | 'edit';
export type PlannerTab = 'tasks' | 'habits';

export type PlannerUiController = {
  activeTab: PlannerTab;
  setActiveTab: (tab: PlannerTab) => void;
  activeTask: Task | null;
  completedCount: number;
  totalCount: number;
  dayCompleteVisible: boolean;
  sheet: {
    isOpen: boolean;
    mode: PlannerSheetMode;
    editingTask: Task | null;
  };
  showStats: boolean;
  showRecurring: boolean;
  showFocus: boolean;
  undoTask: Task | null;
  openCreate: () => void;
  openEdit: (task: Task) => void;
  closeSheet: () => void;
  submitSheet: (
    title: string,
    duration: number,
    repeat: TaskRepeat,
    repeatCount: number,
    color: string,
    startMinutes: number | null,
    remindBeforeMinutes: number,
  ) => void;
  toggleTask: (id: string, coords?: { x: number; y: number }) => void;
  deleteTask: (id: string) => Promise<void>;
  undoDelete: () => void;
  openStats: () => void;
  closeStats: () => void;
  openRecurring: () => void;
  closeRecurring: () => void;
  openFocus: () => void;
  closeFocus: () => void;
};

export function usePlannerUiController(
  planner: PlannerModel,
): PlannerUiController {
  const {
    tasks,
    activeTaskId,
    currentTasks,
    selectedDate,
    syncError,
    addTask,
    updateTask,
    deleteTask: deletePlannerTask,
    restoreTask,
    toggleTask: togglePlannerTask,
  } = planner;
  const [activeTab, setActiveTab] = useState<PlannerTab>('tasks');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<PlannerSheetMode>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const [dayCompleteKey, setDayCompleteKey] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showFocus, setShowFocus] = useState(false);
  const undoTimeoutRef = useRef<number | null>(null);
  const dayCompleteTimeoutRef = useRef<number | null>(null);
  const prevIsSheetOpenRef = useRef(isSheetOpen);
  const prevSyncErrorRef = useRef<string | null>(null);
  const { impact, notification } = useHaptic();
  const { fire } = useReward();
  const sheetModeRef = useRef(sheetMode);
  const editingTaskRef = useRef(editingTask);
  const undoTaskRef = useRef(undoTask);
  const currentTasksRef = useRef(currentTasks);
  const totalCountRef = useRef(0);
  const selectedDateKeyRef = useRef('');

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, tasks],
  );

  const { completedCount, totalCount } = useMemo(
    () => ({
      completedCount: currentTasks.filter((task) => task.completed).length,
      totalCount: currentTasks.length,
    }),
    [currentTasks],
  );

  const selectedDateKey = useMemo(
    () => format(selectedDate, 'yyyy-MM-dd'),
    [selectedDate],
  );

  const dayCompleteVisible =
    dayCompleteKey === selectedDateKey &&
    totalCount > 0 &&
    completedCount === totalCount;

  useEffect(() => {
    sheetModeRef.current = sheetMode;
    editingTaskRef.current = editingTask;
    undoTaskRef.current = undoTask;
    currentTasksRef.current = currentTasks;
    totalCountRef.current = totalCount;
    selectedDateKeyRef.current = selectedDateKey;
  }, [
    currentTasks,
    editingTask,
    selectedDateKey,
    sheetMode,
    totalCount,
    undoTask,
  ]);

  useEffect(() => {
    if (prevIsSheetOpenRef.current && !isSheetOpen) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    prevIsSheetOpenRef.current = isSheetOpen;
  }, [isSheetOpen]);

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

  useEffect(() => {
    if (syncError && syncError !== prevSyncErrorRef.current) {
      notification('error');
    }
    prevSyncErrorRef.current = syncError;
  }, [notification, syncError]);

  const closeSheet = useCallback(() => {
    sheetModeRef.current = 'create';
    editingTaskRef.current = null;
    setIsSheetOpen(false);
    setEditingTask(null);
    setSheetMode('create');
  }, []);

  const openCreate = useCallback(() => {
    impact('light');
    sheetModeRef.current = 'create';
    editingTaskRef.current = null;
    setSheetMode('create');
    setEditingTask(null);
    setIsSheetOpen(true);
  }, [impact]);

  const openEdit = useCallback(
    (task: Task) => {
      impact('light');
      sheetModeRef.current = 'edit';
      editingTaskRef.current = task;
      setSheetMode('edit');
      setEditingTask(task);
      setIsSheetOpen(true);
    },
    [impact],
  );

  const submitSheet = useCallback(
    (
      title: string,
      duration: number,
      repeat: TaskRepeat,
      repeatCount: number,
      color: string,
      startMinutes: number | null,
      remindBeforeMinutes: number,
    ) => {
      if (sheetModeRef.current === 'create') {
        addTask(
          title,
          duration,
          repeat,
          repeatCount,
          color,
          startMinutes,
          remindBeforeMinutes,
        );
      } else if (editingTaskRef.current) {
        updateTask(editingTaskRef.current.id, {
          title,
          duration,
          color,
          startMinutes,
          remindBeforeMinutes,
        });
      }

      closeSheet();
    },
    [addTask, closeSheet, updateTask],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const deletedTask = await deletePlannerTask(id);
      if (!deletedTask) return;

      undoTaskRef.current = deletedTask;
      setUndoTask(deletedTask);

      if (undoTimeoutRef.current) {
        window.clearTimeout(undoTimeoutRef.current);
      }

      undoTimeoutRef.current = window.setTimeout(() => {
        undoTaskRef.current = null;
        setUndoTask(null);
        undoTimeoutRef.current = null;
      }, 4000);
    },
    [deletePlannerTask],
  );

  const undoDelete = useCallback(() => {
    const task = undoTaskRef.current;
    if (!task) return;

    notification('success');
    restoreTask(task);
    undoTaskRef.current = null;
    setUndoTask(null);

    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  }, [notification, restoreTask]);

  const toggleTask = useCallback(
    (id: string, coords?: { x: number; y: number }) => {
      const task = currentTasksRef.current.find((item) => item.id === id);
      if (!task) return;

      const isCompleting = !task.completed;

      if (isCompleting) {
        const othersCompleted = currentTasksRef.current.filter(
          (item) => item.id !== id && item.completed,
        ).length;
        const isLastOne = othersCompleted === totalCountRef.current - 1;

        if (isLastOne && totalCountRef.current > 1) {
          fire(window.innerWidth / 2, window.innerHeight, 'climax');
          notification('success');
          setDayCompleteKey(selectedDateKeyRef.current);

          if (dayCompleteTimeoutRef.current) {
            window.clearTimeout(dayCompleteTimeoutRef.current);
          }

          dayCompleteTimeoutRef.current = window.setTimeout(() => {
            setDayCompleteKey(null);
            dayCompleteTimeoutRef.current = null;
          }, 3000);
        } else if (coords) {
          fire(coords.x, coords.y, 'light');
        } else {
          fire(window.innerWidth / 2, window.innerHeight / 2, 'light');
        }
      }

      togglePlannerTask(id);
    },
    [fire, notification, togglePlannerTask],
  );

  const openStats = useCallback(() => setShowStats(true), []);
  const closeStats = useCallback(() => setShowStats(false), []);
  const openRecurring = useCallback(() => setShowRecurring(true), []);
  const closeRecurring = useCallback(() => setShowRecurring(false), []);
  const openFocus = useCallback(() => setShowFocus(true), []);
  const closeFocus = useCallback(() => setShowFocus(false), []);

  const sheet = useMemo(
    () => ({
      isOpen: isSheetOpen,
      mode: sheetMode,
      editingTask,
    }),
    [editingTask, isSheetOpen, sheetMode],
  );

  return useMemo(
    () => ({
      activeTab,
      setActiveTab,
      activeTask,
      completedCount,
      totalCount,
      dayCompleteVisible,
      sheet,
      showStats,
      showRecurring,
      showFocus,
      undoTask,
      openCreate,
      openEdit,
      closeSheet,
      submitSheet,
      toggleTask,
      deleteTask,
      undoDelete,
      openStats,
      closeStats,
      openRecurring,
      closeRecurring,
      openFocus,
      closeFocus,
    }),
    [
      activeTab,
      activeTask,
      closeFocus,
      closeRecurring,
      closeSheet,
      closeStats,
      completedCount,
      dayCompleteVisible,
      deleteTask,
      openCreate,
      openEdit,
      openFocus,
      openRecurring,
      openStats,
      sheet,
      showFocus,
      showRecurring,
      showStats,
      submitSheet,
      toggleTask,
      totalCount,
      undoDelete,
      undoTask,
    ],
  );
}
