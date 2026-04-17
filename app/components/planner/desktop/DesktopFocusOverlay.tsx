import type { ComponentProps } from 'react';
import FocusOverlay from '../../FocusOverlay';

type DesktopFocusOverlayProps = ComponentProps<typeof FocusOverlay>;

export default function DesktopFocusOverlay(props: DesktopFocusOverlayProps) {
  return <FocusOverlay {...props} />;
}
