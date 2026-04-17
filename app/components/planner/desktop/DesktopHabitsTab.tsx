import type { ComponentProps } from 'react';
import HabitsTab from '../../HabitsTab';

type DesktopHabitsTabProps = Omit<ComponentProps<typeof HabitsTab>, 'isDesktop'>;

export default function DesktopHabitsTab(props: DesktopHabitsTabProps) {
  return <HabitsTab {...props} isDesktop />;
}
