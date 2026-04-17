'use client';

import DesktopPlannerShell from './planner/desktop/DesktopPlannerShell';
import MobilePlannerShell from './planner/mobile/MobilePlannerShell';
import { usePlanner } from '../hooks/usePlanner';
import { usePlannerUiController } from '../hooks/usePlannerUiController';

export default function PlannerApp() {
  const planner = usePlanner();
  const ui = usePlannerUiController(planner);

  if (planner.platform === 'desktop') {
    return <DesktopPlannerShell planner={planner} ui={ui} />;
  }

  return <MobilePlannerShell planner={planner} ui={ui} />;
}
