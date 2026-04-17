import type { ComponentProps } from 'react';
import RecurringTasksSheet from '../../RecurringTasksSheet';

type DesktopRecurringTasksSheetProps = Omit<
  ComponentProps<typeof RecurringTasksSheet>,
  'isDesktop'
>;

export default function DesktopRecurringTasksSheet(
  props: DesktopRecurringTasksSheetProps,
) {
  return <RecurringTasksSheet {...props} isDesktop />;
}
