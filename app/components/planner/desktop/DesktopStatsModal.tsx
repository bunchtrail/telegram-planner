import type { ComponentProps } from 'react';
import StatsModal from '../../StatsModal';

type DesktopStatsModalProps = Omit<ComponentProps<typeof StatsModal>, 'isDesktop'>;

export default function DesktopStatsModal(props: DesktopStatsModalProps) {
  return <StatsModal {...props} isDesktop />;
}
