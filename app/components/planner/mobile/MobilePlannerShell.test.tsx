import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MobilePlannerShell from './MobilePlannerShell';
import type { PlannerShellProps } from '../shared/types';

vi.mock('../../PlannerHeader', () => ({
  default: () => <div data-testid="planner-header" />,
}));

vi.mock('../../FloatingActionButton', () => ({
  default: () => <div data-testid="floating-action-button" />,
}));

vi.mock('../../../hooks/useKeyboardInset', () => ({
  useKeyboardInset: () => 0,
}));

vi.mock('./MobileTaskList', () => ({
  default: () => <div data-testid="mobile-task-list" />,
}));

vi.mock('./MobileHabitsTab', () => ({
  default: () => <div data-testid="mobile-habits-tab" />,
}));

vi.mock('./MobileTaskSheet', () => ({
  default: () => null,
}));

vi.mock('./MobileStatsModal', () => ({
  default: () => null,
}));

vi.mock('./MobileRecurringTasksSheet', () => ({
  default: () => null,
}));

vi.mock('./MobileFocusOverlay', () => ({
  default: () => null,
}));

const createProps = (
  activeTab: 'tasks' | 'habits',
): PlannerShellProps => {
  const planner = {
    selectedDate: new Date('2026-04-18T12:00:00.000Z'),
    weekDays: [],
    monthDays: [],
    taskDates: new Set<string>(),
    viewMode: 'week',
    hours: 0,
    minutes: 0,
    setSelectedDate: vi.fn(),
    setViewMode: vi.fn(),
    goToPreviousPeriod: vi.fn(),
    goToNextPeriod: vi.fn(),
    goToToday: vi.fn(),
    currentTasks: [],
    isLoading: false,
    moveTask: vi.fn(),
    handleReorder: vi.fn(),
    toggleActiveTask: vi.fn(),
    updateTask: vi.fn(),
    habits: [],
    habitsLoading: false,
    isHabitChecked: vi.fn(() => false),
    isHabitLogPending: vi.fn(() => false),
    toggleHabitLog: vi.fn(),
    addHabit: vi.fn(),
    deleteHabit: vi.fn(),
    streak: 0,
    tasks: [],
    pomodoroStats: null,
    recurringTasks: [],
    recurringSkips: [],
    deleteTaskSeries: vi.fn(),
    skipTaskSeriesDate: vi.fn(),
    activeTaskId: null,
    isSyncing: false,
    syncError: null,
    clearSyncError: vi.fn(),
    runWithAuthRetry: vi.fn(),
  } as PlannerShellProps['planner'];

  const ui = {
    activeTab,
    setActiveTab: vi.fn(),
    activeTask: null,
    completedCount: 0,
    totalCount: 0,
    dayCompleteVisible: false,
    sheet: {
      isOpen: false,
      mode: 'create',
      editingTask: null,
    },
    showStats: false,
    showRecurring: false,
    showFocus: false,
    undoTask: null,
    openCreate: vi.fn(),
    openEdit: vi.fn(),
    closeSheet: vi.fn(),
    submitSheet: vi.fn(),
    toggleTask: vi.fn(),
    deleteTask: vi.fn(),
    undoDelete: vi.fn(),
    openStats: vi.fn(),
    closeStats: vi.fn(),
    openRecurring: vi.fn(),
    closeRecurring: vi.fn(),
    openFocus: vi.fn(),
    closeFocus: vi.fn(),
  } as PlannerShellProps['ui'];

  return { planner, ui };
};

describe('MobilePlannerShell', () => {
  it('hides the planner header on the habits tab', () => {
    render(<MobilePlannerShell {...createProps('habits')} />);

    expect(screen.queryByTestId('planner-header')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-habits-tab')).toBeInTheDocument();
  });

  it('shows the planner header on the tasks tab', () => {
    render(<MobilePlannerShell {...createProps('tasks')} />);

    expect(screen.getByTestId('planner-header')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-task-list')).toBeInTheDocument();
  });
});
