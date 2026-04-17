import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import PlannerApp from '../app/components/PlannerApp';

const { usePlannerMock, usePlannerUiControllerMock } = vi.hoisted(() => ({
  usePlannerMock: vi.fn(),
  usePlannerUiControllerMock: vi.fn(),
}));

vi.mock('../app/hooks/usePlanner', () => ({
  usePlanner: usePlannerMock,
}));

vi.mock('../app/hooks/usePlannerUiController', () => ({
  usePlannerUiController: usePlannerUiControllerMock,
}));

vi.mock('../app/hooks/useHaptic', () => ({
  useHaptic: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}));

vi.mock('../app/hooks/useReward', () => ({
  useReward: () => ({
    fire: vi.fn(),
  }),
}));

vi.mock('../app/hooks/useKeyboardInset', () => ({
  useKeyboardInset: () => 0,
}));

vi.mock('../app/components/DesktopPlanner', () => ({
  default: () => <div data-testid="legacy-desktop-shell">legacy desktop</div>,
}));

vi.mock(
  '../app/components/planner/desktop/DesktopPlannerShell',
  () => ({
    default: () => <div data-testid="desktop-shell">desktop shell</div>,
  }),
  { virtual: true },
);

vi.mock(
  '../app/components/planner/mobile/MobilePlannerShell',
  () => ({
    default: () => <div data-testid="mobile-shell">mobile shell</div>,
  }),
  { virtual: true },
);

vi.mock('../app/components/PlannerHeader', () => ({
  default: () => <div data-testid="legacy-mobile-header">legacy mobile header</div>,
}));

vi.mock('../app/components/TaskList', () => ({
  default: () => <div data-testid="legacy-mobile-task-list">legacy mobile task list</div>,
}));

vi.mock('../app/components/HabitsTab', () => ({
  default: () => <div data-testid="legacy-mobile-habits">legacy mobile habits</div>,
}));

vi.mock('../app/components/FloatingActionButton', () => ({
  default: () => <button type="button">fab</button>,
}));

vi.mock('../app/components/TaskSheet', () => ({
  default: () => <div>sheet</div>,
}));

vi.mock('../app/components/FocusOverlay', () => ({
  default: () => <div>focus</div>,
}));

vi.mock('../app/components/StatsModal', () => ({
  default: () => <div>stats</div>,
}));

vi.mock('../app/components/RecurringTasksSheet', () => ({
  default: () => <div>recurring</div>,
}));

const createPlannerStub = (platform: 'mobile' | 'desktop') => ({
  platform,
  isDesktop: platform === 'mobile',
  selectedDate: new Date('2026-04-17T00:00:00.000Z'),
  setSelectedDate: vi.fn(),
  viewMode: 'week' as const,
  setViewMode: vi.fn(),
  isAddOpen: false,
  setIsAddOpen: vi.fn(),
  tasks: [],
  streak: 0,
  currentTasks: [],
  weekDays: [],
  monthDays: [],
  taskDates: new Set<string>(),
  hours: 0,
  minutes: 0,
  activeTaskId: null,
  toggleActiveTask: vi.fn(),
  goToToday: vi.fn(),
  goToPreviousPeriod: vi.fn(),
  goToNextPeriod: vi.fn(),
  handleReorder: vi.fn(),
  addTask: vi.fn(),
  toggleTask: vi.fn(),
  deleteTask: vi.fn(),
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
});

const createUiControllerStub = () => ({
  activeTab: 'tasks' as const,
  setActiveTab: vi.fn(),
  activeTask: null,
  completedCount: 0,
  totalCount: 0,
  dayCompleteVisible: false,
  sheet: {
    isOpen: false,
    mode: 'create' as const,
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
});

describe('PlannerApp platform routing', () => {
  beforeEach(() => {
    usePlannerMock.mockReset();
    usePlannerUiControllerMock.mockReset();
  });

  test('renders the desktop shell when planner platform is desktop', () => {
    usePlannerMock.mockReturnValue(createPlannerStub('desktop'));
    usePlannerUiControllerMock.mockReturnValue(createUiControllerStub());

    render(<PlannerApp />);

    expect(screen.getByTestId('desktop-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-shell')).not.toBeInTheDocument();
  });

  test('renders the mobile shell when planner platform is mobile', () => {
    usePlannerMock.mockReturnValue(createPlannerStub('mobile'));
    usePlannerUiControllerMock.mockReturnValue(createUiControllerStub());

    render(<PlannerApp />);

    expect(screen.getByTestId('mobile-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-shell')).not.toBeInTheDocument();
  });
});
