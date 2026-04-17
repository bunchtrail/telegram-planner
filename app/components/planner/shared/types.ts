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

export const PLANNER_TABS: ReadonlyArray<{
  id: PlannerTab;
  label: string;
}> = [
  { id: 'tasks', label: 'Задачи' },
  { id: 'habits', label: 'Привычки' },
];
