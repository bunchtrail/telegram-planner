import type { ComponentProps } from 'react';
import FocusOverlay from '../../FocusOverlay';
import { isIOSWithinMobile } from '../../../lib/platform';

type MobileFocusOverlayProps = ComponentProps<typeof FocusOverlay>;

export default function MobileFocusOverlay(props: MobileFocusOverlayProps) {
  return (
    <FocusOverlay
      {...props}
      reduceHeavyEffectsOnPlatform={isIOSWithinMobile()}
    />
  );
}
