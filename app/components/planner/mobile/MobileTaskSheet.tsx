import type { ComponentProps } from 'react';
import TaskSheet from '../../TaskSheet';

type MobileTaskSheetProps = Omit<ComponentProps<typeof TaskSheet>, 'isDesktop'>;

export default function MobileTaskSheet(props: MobileTaskSheetProps) {
  return <TaskSheet {...props} />;
}
