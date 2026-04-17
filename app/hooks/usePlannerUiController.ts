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

  const activeTask = useMemo(
    () => planner.tasks.find((task) => task.id === planner.activeTaskId) ?? null,
    [planner.activeTaskId, planner.tasks],
  );

  const { completedCount, totalCount } = useMemo(
    () => ({
      completedCount: planner.currentTasks.filter((task) => task.completed).length,
      totalCount: planner.currentTasks.length,
    }),
    [planner.currentTasks],
  );

  const selectedDateKey = useMemo(
    () => format(planner.selectedDate, 'yyyy-MM-dd'),
    [planner.selectedDate],
  );

  const dayCompleteVisible =
    dayCompleteKey === selectedDateKey &&
    totalCount > 0 &&
    completedCount === totalCount;

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
    if (planner.syncError && planner.syncError !== prevSyncErrorRef.current) {
      notification('error');
    }
    prevSyncErrorRef.current = planner.syncError;
  }, [notification, planner.syncError]);

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    setEditingTask(null);
    setSheetMode('create');
  }, []);

  const openCreate = useCallback(() => {
    impact('light');
    setSheetMode('create');
    setEditingTask(null);
    setIsSheetOpen(true);
  }, [impact]);

  const openEdit = useCallback(
    (task: Task) => {
      impact('light');
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
      if (sheetMode === 'create') {
        planner.addTask(
          title,
          duration,
          repeat,
          repeatCount,
          color,
          startMinutes,
          remindBeforeMinutes,
        );
      } else if (editingTask) {
        planner.updateTask(editingTask.id, {
          title,
          duration,
          color,
          startMinutes,
          remindBeforeMinutes,
        });
      }

      closeSheet();
    },
    [closeSheet, editingTask, planner, sheetMode],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const deletedTask = await planner.deleteTask(id);
      if (!deletedTask) return;

      setUndoTask(deletedTask);

      if (undoTimeoutRef.current) {
        window.clearTimeout(undoTimeoutRef.current);
      }

      undoTimeoutRef.current = window.setTimeout(() => {
        setUndoTask(null);
        undoTimeoutRef.current = null;
      }, 4000);
    },
    [planner],
  );

  const undoDelete = useCallback(() => {
    if (!undoTask) return;

    notification('success');
    planner.restoreTask(undoTask);
    setUndoTask(null);

    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  }, [notification, planner, undoTask]);

  const toggleTask = useCallback(
    (id: string, coords?: { x: number; y: number }) => {
      const task = planner.currentTasks.find((item) => item.id === id);
      if (!task) return;

      const isCompleting = !task.completed;

      if (isCompleting) {
        const othersCompleted = planner.currentTasks.filter(
          (item) => item.id !== id && item.completed,
        ).length;
        const isLastOne = othersCompleted === totalCount - 1;

        if (isLastOne && totalCount > 1) {
          fire(window.innerWidth / 2, window.innerHeight, 'climax');
          notification('success');
          setDayCompleteKey(selectedDateKey);

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

      planner.toggleTask(id);
    },
    [fire, notification, planner, selectedDateKey, totalCount],
  );

  return {
    activeTab,
    setActiveTab,
    activeTask,
    completedCount,
    totalCount,
    dayCompleteVisible,
    sheet: {
      isOpen: isSheetOpen,
      mode: sheetMode,
      editingTask,
    },
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
    openStats: () => setShowStats(true),
    closeStats: () => setShowStats(false),
    openRecurring: () => setShowRecurring(true),
    closeRecurring: () => setShowRecurring(false),
    openFocus: () => setShowFocus(true),
    closeFocus: () => setShowFocus(false),
  };
}
