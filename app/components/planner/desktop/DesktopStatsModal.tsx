import type { ComponentProps } from 'react';
import StatsModal from '../../StatsModal';

type DesktopStatsModalProps = ComponentProps<typeof StatsModal>;

export default function DesktopStatsModal(props: DesktopStatsModalProps) {
  return <StatsModal {...props} />;
}
