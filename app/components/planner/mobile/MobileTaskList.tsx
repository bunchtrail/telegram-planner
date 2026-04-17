import type { ComponentProps } from 'react';
import TaskList from '../../TaskList';
import { isIOSWithinMobile } from '../../../lib/platform';

type MobileTaskListProps = Omit<ComponentProps<typeof TaskList>, 'isDesktop'>;

export default function MobileTaskList(props: MobileTaskListProps) {
  return (
    <TaskList
      {...props}
      reduceHeavyEffectsOnPlatform={isIOSWithinMobile()}
    />
  );
}
