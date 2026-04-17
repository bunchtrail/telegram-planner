import type { ComponentProps } from 'react';
import RecurringTasksSheet from '../../RecurringTasksSheet';

type MobileRecurringTasksSheetProps = Omit<
  ComponentProps<typeof RecurringTasksSheet>,
  'isDesktop'
>;

export default function MobileRecurringTasksSheet(
  props: MobileRecurringTasksSheetProps,
) {
  return <RecurringTasksSheet {...props} />;
}
