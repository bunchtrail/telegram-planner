import { render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
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

vi.mock('../app/components/MonthGrid', () => ({
  default: () => <div data-testid="month-grid">month grid</div>,
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

vi.mock('../app/components/planner/mobile/MobileTaskList', () => ({
  default: () => <div data-testid="mobile-task-list">mobile task list</div>,
}));

vi.mock('../app/components/planner/mobile/MobileHabitsTab', () => ({
  default: () => <div data-testid="mobile-habits-tab">mobile habits tab</div>,
}));

vi.mock('../app/components/planner/mobile/MobileTaskSheet', () => ({
  default: () => <div data-testid="mobile-task-sheet">mobile task sheet</div>,
}));

vi.mock('../app/components/planner/mobile/MobileStatsModal', () => ({
  default: () => <div data-testid="mobile-stats-modal">mobile stats modal</div>,
}));

vi.mock('../app/components/planner/mobile/MobileRecurringTasksSheet', () => ({
  default: () => <div data-testid="mobile-recurring-sheet">mobile recurring sheet</div>,
}));

vi.mock('../app/components/planner/mobile/MobileFocusOverlay', () => ({
  default: () => <div data-testid="mobile-focus-overlay">mobile focus overlay</div>,
}));

vi.mock('../app/components/planner/desktop/DesktopTaskList', () => ({
  default: () => <div data-testid="desktop-task-list">desktop task list</div>,
}));

vi.mock('../app/components/planner/desktop/DesktopHabitsTab', () => ({
  default: () => <div data-testid="desktop-habits-tab">desktop habits tab</div>,
}));

vi.mock('../app/components/planner/desktop/DesktopTaskSheet', () => ({
  default: () => <div data-testid="desktop-task-sheet">desktop task sheet</div>,
}));

vi.mock('../app/components/planner/desktop/DesktopStatsModal', () => ({
  default: () => <div data-testid="desktop-stats-modal">desktop stats modal</div>,
}));

vi.mock('../app/components/planner/desktop/DesktopRecurringTasksSheet', () => ({
  default: () => <div data-testid="desktop-recurring-sheet">desktop recurring sheet</div>,
}));

vi.mock('../app/components/planner/desktop/DesktopFocusOverlay', () => ({
  default: () => <div data-testid="desktop-focus-overlay">desktop focus overlay</div>,
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

const mobilePlannerShellModulePromise = vi.importActual<
  typeof import('../app/components/planner/mobile/MobilePlannerShell')
>('../app/components/planner/mobile/MobilePlannerShell');

const desktopPlannerShellModulePromise = vi.importActual<
  typeof import('../app/components/planner/desktop/DesktopPlannerShell')
>('../app/components/planner/desktop/DesktopPlannerShell');

let MobilePlannerShell: typeof import('../app/components/planner/mobile/MobilePlannerShell').default;
let DesktopPlannerShell: typeof import('../app/components/planner/desktop/DesktopPlannerShell').default;

beforeAll(async () => {
  [{ default: MobilePlannerShell }, { default: DesktopPlannerShell }] =
    await Promise.all([
      mobilePlannerShellModulePromise,
      desktopPlannerShellModulePromise,
    ]);
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

describe('planner shells shared block orchestration', () => {
  test('does not expose a shared shell view-model builder from the shared shell module', async () => {
    const sharedShellModule = await import('../app/components/planner/shared/types');

    expect(sharedShellModule).not.toHaveProperty('createPlannerShellViewModel');
  });

  test('routes the mobile shell between tasks and habits blocks', () => {
    const planner = createPlannerStub('mobile');
    const ui = createUiControllerStub();

    const { rerender } = render(<MobilePlannerShell planner={planner} ui={ui} />);

    expect(screen.getByTestId('mobile-task-list')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-habits-tab')).not.toBeInTheDocument();

    rerender(
      <MobilePlannerShell
        planner={planner}
        ui={{ ...ui, activeTab: 'habits' }}
      />,
    );

    expect(screen.getByTestId('mobile-habits-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-task-list')).not.toBeInTheDocument();
  });

  test('routes the desktop shell between tasks and habits blocks', () => {
    const planner = createPlannerStub('desktop');
    const ui = createUiControllerStub();

    const { rerender } = render(<DesktopPlannerShell planner={planner} ui={ui} />);

    expect(screen.getByTestId('desktop-task-list')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-habits-tab')).not.toBeInTheDocument();

    rerender(
      <DesktopPlannerShell
        planner={planner}
        ui={{ ...ui, activeTab: 'habits' }}
      />,
    );

    expect(screen.getByTestId('desktop-habits-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-task-list')).not.toBeInTheDocument();
  });

  test('renders the recurring sheet from the desktop shell overlay layer', () => {
    const planner = createPlannerStub('desktop');
    const ui = createUiControllerStub();

    render(
      <DesktopPlannerShell
        planner={planner}
        ui={{ ...ui, showRecurring: true }}
      />,
    );

    expect(screen.getByTestId('desktop-recurring-sheet')).toBeInTheDocument();
  });

  test('renders the mobile task sheet and hides the mobile fab while it is open', () => {
    const planner = createPlannerStub('mobile');
    const ui = createUiControllerStub();

    render(
      <MobilePlannerShell
        planner={planner}
        ui={{
          ...ui,
          sheet: {
            isOpen: true,
            mode: 'create',
            editingTask: null,
          },
        }}
      />,
    );

    expect(screen.getByTestId('mobile-task-sheet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'fab' })).not.toBeInTheDocument();
  });

  test('renders mobile focus, sync, undo, and completion overlays from shell state', () => {
    const planner = {
      ...createPlannerStub('mobile'),
      activeTaskId: 'task-1',
      syncError: 'Sync failed',
    };
    const ui = {
      ...createUiControllerStub(),
      showFocus: true,
      undoTask: { id: 'deleted-task' },
      dayCompleteVisible: true,
      activeTask: {
        id: 'task-1',
        title: 'Focus task',
      },
    };

    render(<MobilePlannerShell planner={planner} ui={ui} />);

    expect(screen.getByTestId('mobile-focus-overlay')).toBeInTheDocument();
    expect(screen.getByText('Sync failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отменить' })).toBeInTheDocument();
    expect(screen.getByText('День завершен!')).toBeInTheDocument();
  });
});
