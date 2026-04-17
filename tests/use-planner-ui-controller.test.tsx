import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { usePlanner } from '../app/hooks/usePlanner';
import type { Task } from '../app/types/task';
import { usePlannerUiController } from '../app/hooks/usePlannerUiController';

const impact = vi.fn();
const notification = vi.fn();
const fire = vi.fn();

vi.mock('../app/hooks/useHaptic', () => ({
  useHaptic: () => ({
    impact,
    notification,
    selection: vi.fn(),
  }),
}));

vi.mock('../app/hooks/useReward', () => ({
  useReward: () => ({
    fire,
  }),
}));

type PlannerModel = ReturnType<typeof usePlanner>;

const baseTask: Task = {
  clientId: 'client-task-1',
  id: 'task-1',
  title: 'Write tests',
  duration: 30,
  date: new Date('2026-04-17T00:00:00.000Z'),
  completed: false,
  position: 0,
  elapsedMs: 0,
  activeStartedAt: null,
  color: '#ff9f0a',
  isPinned: false,
  checklist: [],
  startMinutes: null,
  remindBeforeMinutes: 0,
};

const createPlanner = (): PlannerModel =>
  ({
    platform: 'mobile',
    selectedDate: new Date('2026-04-17T00:00:00.000Z'),
    setSelectedDate: vi.fn(),
    viewMode: 'week',
    setViewMode: vi.fn(),
    isAddOpen: false,
    setIsAddOpen: vi.fn(),
    tasks: [baseTask],
    streak: 0,
    currentTasks: [baseTask],
    weekDays: [],
    monthDays: [],
    taskDates: new Set<string>(),
    hours: 0,
    minutes: 30,
    activeTaskId: null,
    toggleActiveTask: vi.fn(),
    goToToday: vi.fn(),
    goToPreviousPeriod: vi.fn(),
    goToNextPeriod: vi.fn(),
    handleReorder: vi.fn(),
    addTask: vi.fn(),
    toggleTask: vi.fn(),
    deleteTask: vi.fn(async () => baseTask),
    restoreTask: vi.fn(),
    updateTask: vi.fn(),
    moveTask: vi.fn(),
    isLoading: false,
    recurringTasks: [],
    recurringSkips: [],
    fetchRecurringTasks: vi.fn(),
    deleteTaskSeries: vi.fn(),
    skipTaskSeriesDate: vi.fn(),
    runWithAuthRetry: vi.fn(),
    userId: '1',
    isSyncing: false,
    syncError: null,
    clearSyncError: vi.fn(),
    habits: [],
    habitsLoading: false,
    addHabit: vi.fn(),
    deleteHabit: vi.fn(),
    toggleHabitLog: vi.fn(),
    isHabitChecked: vi.fn(() => false),
    isHabitLogPending: vi.fn(() => false),
    pomodoroStats: {
      sessionsCompleted: 0,
      totalFocusMs: 0,
      daily: [],
    },
  }) as PlannerModel;

describe('usePlannerUiController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    impact.mockReset();
    notification.mockReset();
    fire.mockReset();
  });

  test('opens create and edit sheet flows without duplicating shell state', () => {
    const planner = createPlanner();
    const { result } = renderHook(() => usePlannerUiController(planner));

    act(() => {
      result.current.openCreate();
    });

    expect(result.current.sheet.isOpen).toBe(true);
    expect(result.current.sheet.mode).toBe('create');
    expect(result.current.sheet.editingTask).toBeNull();

    act(() => {
      result.current.openEdit(baseTask);
    });

    expect(result.current.sheet.mode).toBe('edit');
    expect(result.current.sheet.editingTask).toEqual(baseTask);
  });

  test('restores the last deleted task through a shared undo flow', async () => {
    const planner = createPlanner();
    const { result } = renderHook(() => usePlannerUiController(planner));

    await act(async () => {
      await result.current.deleteTask(baseTask.id);
    });

    expect(result.current.undoTask).toEqual(baseTask);

    act(() => {
      result.current.undoDelete();
    });

    expect(planner.restoreTask).toHaveBeenCalledWith(baseTask);
    expect(result.current.undoTask).toBeNull();
  });
});
