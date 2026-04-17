import { format } from 'date-fns';
import type { ComponentProps } from 'react';
import type FocusOverlay from '../../FocusOverlay';
import type HabitsTab from '../../HabitsTab';
import type RecurringTasksSheet from '../../RecurringTasksSheet';
import type StatsModal from '../../StatsModal';
import type TaskList from '../../TaskList';
import type TaskSheet from '../../TaskSheet';
import type {
  PlannerModel,
  PlannerTab,
  PlannerUiController,
} from '../../../hooks/usePlannerUiController';

export type PlannerShellProps = {
  planner: PlannerModel;
  ui: PlannerUiController;
};

export type PlannerHeaderViewModel = {
  selectedDate: Date;
  weekDays: Date[];
  monthDays: Date[];
  taskDates: Set<string>;
  viewMode: PlannerModel['viewMode'];
  hours: number;
  minutes: number;
  completedCount: number;
  totalCount: number;
  onSelectDate: PlannerModel['setSelectedDate'];
  onViewModeChange: PlannerModel['setViewMode'];
  onPrev: PlannerModel['goToPreviousPeriod'];
  onNext: PlannerModel['goToNextPeriod'];
  onToday: PlannerModel['goToToday'];
  onOpenStats: PlannerUiController['openStats'];
  onOpenRecurring: PlannerUiController['openRecurring'];
};

export type PlannerTaskListProps = Omit<
  ComponentProps<typeof TaskList>,
  'isDesktop'
>;

export type PlannerHabitsTabProps = Omit<
  ComponentProps<typeof HabitsTab>,
  'isDesktop'
>;

export type PlannerTaskSheetProps = Omit<
  ComponentProps<typeof TaskSheet>,
  'isDesktop'
>;

export type PlannerStatsModalProps = ComponentProps<typeof StatsModal>;

export type PlannerRecurringSheetProps = Omit<
  ComponentProps<typeof RecurringTasksSheet>,
  'isDesktop'
>;

export type PlannerFocusOverlayProps = ComponentProps<typeof FocusOverlay>;

export type PlannerShellOverlayViewModel = {
  isSyncing: boolean;
  syncError: string | null;
  clearSyncError: PlannerModel['clearSyncError'];
  showTaskSheet: boolean;
  taskSheetProps: PlannerTaskSheetProps;
  showStats: boolean;
  statsModalProps: PlannerStatsModalProps;
  showRecurring: boolean;
  recurringSheetProps: PlannerRecurringSheetProps;
  showFocus: boolean;
  focusOverlayProps: PlannerFocusOverlayProps | null;
  showFocusShortcut: boolean;
  openFocus: PlannerUiController['openFocus'];
  undoTask: PlannerUiController['undoTask'];
  undoDelete: PlannerUiController['undoDelete'];
  dayCompleteVisible: boolean;
};

export type PlannerShellViewModel = {
  header: PlannerHeaderViewModel;
  activeTab: PlannerTab;
  setActiveTab: PlannerUiController['setActiveTab'];
  taskListProps: PlannerTaskListProps;
  habitsTabProps: PlannerHabitsTabProps;
  overlays: PlannerShellOverlayViewModel;
};

export const PLANNER_TABS: ReadonlyArray<{
  id: PlannerTab;
  label: string;
}> = [
  { id: 'tasks', label: 'Задачи' },
  { id: 'habits', label: 'Привычки' },
];

export function createPlannerShellViewModel(
  planner: PlannerModel,
  ui: PlannerUiController,
): PlannerShellViewModel {
  const dateKey = format(planner.selectedDate, 'yyyy-MM-dd');
  const editingTask = ui.sheet.editingTask;
  const focusTask = ui.activeTask;

  return {
    header: {
      selectedDate: planner.selectedDate,
      weekDays: planner.weekDays,
      monthDays: planner.monthDays,
      taskDates: planner.taskDates,
      viewMode: planner.viewMode,
      hours: planner.hours,
      minutes: planner.minutes,
      completedCount: ui.completedCount,
      totalCount: ui.totalCount,
      onSelectDate: planner.setSelectedDate,
      onViewModeChange: planner.setViewMode,
      onPrev: planner.goToPreviousPeriod,
      onNext: planner.goToNextPeriod,
      onToday: planner.goToToday,
      onOpenStats: ui.openStats,
      onOpenRecurring: ui.openRecurring,
    },
    activeTab: ui.activeTab,
    setActiveTab: ui.setActiveTab,
    taskListProps: {
      dateKey,
      tasks: planner.currentTasks,
      isLoading: planner.isLoading,
      onToggle: ui.toggleTask,
      onDelete: ui.deleteTask,
      onEdit: ui.openEdit,
      onMove: planner.moveTask,
      onAdd: ui.openCreate,
      onReorder: planner.handleReorder,
      onToggleActive: planner.toggleActiveTask,
      updateTask: planner.updateTask,
    },
    habitsTabProps: {
      habits: planner.habits,
      isLoading: planner.habitsLoading,
      isChecked: planner.isHabitChecked,
      isLogPending: planner.isHabitLogPending,
      onToggleLog: planner.toggleHabitLog,
      onAddHabit: planner.addHabit,
      onDeleteHabit: planner.deleteHabit,
      selectedDate: planner.selectedDate,
    },
    overlays: {
      isSyncing: planner.isSyncing,
      syncError: planner.syncError,
      clearSyncError: planner.clearSyncError,
      showTaskSheet: ui.sheet.isOpen,
      taskSheetProps: {
        onClose: ui.closeSheet,
        mode: ui.sheet.mode,
        initialTitle: ui.sheet.mode === 'edit' ? editingTask?.title : '',
        initialDuration: ui.sheet.mode === 'edit' ? editingTask?.duration : 30,
        initialColor: ui.sheet.mode === 'edit' ? editingTask?.color : undefined,
        initialRepeat: 'none',
        initialRepeatCount: 7,
        initialStartMinutes:
          ui.sheet.mode === 'edit' ? editingTask?.startMinutes : null,
        initialRemindBeforeMinutes:
          ui.sheet.mode === 'edit' ? editingTask?.remindBeforeMinutes : 0,
        taskDate:
          ui.sheet.mode === 'edit'
            ? (editingTask?.date ?? planner.selectedDate)
            : planner.selectedDate,
        onSubmit: ui.submitSheet,
      },
      showStats: ui.showStats,
      statsModalProps: {
        streak: planner.streak,
        tasks: planner.tasks,
        selectedDate: planner.selectedDate,
        onClose: ui.closeStats,
        pomodoroStats: planner.pomodoroStats,
      },
      showRecurring: ui.showRecurring,
      recurringSheetProps: {
        onClose: ui.closeRecurring,
        recurringTasks: planner.recurringTasks,
        recurringSkips: planner.recurringSkips,
        onDeleteSeries: planner.deleteTaskSeries,
        onSkipDate: planner.skipTaskSeriesDate,
      },
      showFocus: ui.showFocus,
      focusOverlayProps: focusTask
        ? {
            task: focusTask,
            isActive: planner.activeTaskId === focusTask.id,
            onToggleTimer: () => planner.toggleActiveTask(focusTask.id),
            onClose: ui.closeFocus,
            runWithAuthRetry: planner.runWithAuthRetry,
          }
        : null,
      showFocusShortcut: Boolean(planner.activeTaskId && !ui.showFocus),
      openFocus: ui.openFocus,
      undoTask: ui.undoTask,
      undoDelete: ui.undoDelete,
      dayCompleteVisible: ui.dayCompleteVisible,
    },
  };
}
