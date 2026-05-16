import type { ComponentProps } from 'react';
import HabitsTab from '../../HabitsTab';

type MobileHabitsTabProps = Omit<ComponentProps<typeof HabitsTab>, 'isDesktop'>;

export default function MobileHabitsTab(props: MobileHabitsTabProps) {
  return <HabitsTab {...props} />;
}
