export type HabitDayVisualState =
  | 'idle'
  | 'done'
  | 'today'
  | 'future'
  | 'pending';

export const getHabitDayVisualState = ({
  dateKey,
  isChecked,
  isPending,
  todayKey,
}: {
  dateKey: string;
  isChecked: boolean;
  isPending: boolean;
  todayKey: string;
}): HabitDayVisualState => {
  if (dateKey > todayKey) {
    return 'future';
  }

  if (isPending) {
    return 'pending';
  }

  if (isChecked) {
    return 'done';
  }

  if (dateKey === todayKey) {
    return 'today';
  }

  return 'idle';
};
