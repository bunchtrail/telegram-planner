import type { ComponentProps } from 'react';
import TaskSheet from '../../TaskSheet';

type DesktopTaskSheetProps = Omit<ComponentProps<typeof TaskSheet>, 'isDesktop'>;

export default function DesktopTaskSheet(props: DesktopTaskSheetProps) {
  return <TaskSheet {...props} isDesktop />;
}
