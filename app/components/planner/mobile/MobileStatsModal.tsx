import type { ComponentProps } from 'react';
import StatsModal from '../../StatsModal';

type MobileStatsModalProps = ComponentProps<typeof StatsModal>;

export default function MobileStatsModal(props: MobileStatsModalProps) {
  return <StatsModal {...props} />;
}
