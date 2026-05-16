import type { ComponentProps } from 'react';
import FocusOverlay from '../../FocusOverlay';

type DesktopFocusOverlayProps = Omit<ComponentProps<typeof FocusOverlay>, 'isDesktop'>;

export default function DesktopFocusOverlay(props: DesktopFocusOverlayProps) {
  return <FocusOverlay {...props} isDesktop />;
}
