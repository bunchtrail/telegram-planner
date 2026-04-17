import type { ComponentProps } from 'react';
import TaskList from '../../TaskList';

type DesktopTaskListProps = Omit<ComponentProps<typeof TaskList>, 'isDesktop'>;

export default function DesktopTaskList(props: DesktopTaskListProps) {
  return <TaskList {...props} isDesktop />;
}
