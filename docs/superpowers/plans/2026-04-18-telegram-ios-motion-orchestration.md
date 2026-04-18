# Telegram iOS Motion Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the planner feel modern and smooth inside Telegram iOS WebView by preserving high-value motion while removing the architectural causes of dropped frames.

**Architecture:** Add a platform-aware motion budget layer, then refactor the hot paths around it: a single viewport/keyboard update source, stable React render boundaries, localized list motion instead of shared-layout animation, and iOS-safe surfaces/backdrops. Keep branded motion accents, but only where the runtime can sustain them.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Framer Motion 12, Telegram WebApp runtime, Supabase, Vitest, ESLint

---

## Preflight Notes

- Current unrelated blocker: `npm run build` fails on `vitest.config.ts` because `vitest/config` types are not resolved in the Next.js build worker.
- This blocker is not part of the motion root cause, but final sign-off still needs it addressed or explicitly isolated.
- The orchestration model below assumes one main coordinator agent and task-scoped worker/reviewer agents.

## Orchestration Model

**Main coordinator (this thread):**
- Owns sequence, scope, and merge decisions.
- Dispatches worker subagents only for file-disjoint tasks.
- Runs spec review first, then code-quality review, then verification.

**Recommended subagent roles:**
- `worker`: implementation in a bounded write scope.
- `reviewer`: correctness, regressions, and motion-budget review.
- `test_runner`: lint/build/test/browser verification.
- `explorer`: optional read-only context sweep if a task grows beyond its planned write set.

**Parallel windows:**
- After Task 1 lands, Tasks 2 and 3 can run in parallel.
- After Tasks 2 and 3 land, Tasks 4 and 5 can run in parallel.
- Task 6 is sequential and owned by coordinator + `test_runner`.

**Do not parallelize:**
- Two agents editing `TaskList` / `TaskItem` at the same time.
- Two agents editing `BottomSheet` / `Dialog` / `globals.css` at the same time.
- Verification before all implementation tasks are integrated.

---

### Task 1: Establish Motion Budget and Runtime Policy

**Files:**
- Create: `app/lib/motion.ts`
- Modify: `app/lib/platform.ts`
- Modify: `docs/FRONTEND_GUIDE.md`

**Intent:** Define one source of truth for which motion primitives are allowed on Telegram iOS versus desktop and Android.

- [ ] **Step 1: Add a pure motion-capability module**

```ts
// app/lib/motion.ts
export type MotionTier = 'full' | 'balanced' | 'lite';

export type MotionCapabilities = {
  tier: MotionTier;
  allowSharedLayout: boolean;
  allowBackdropBlur: boolean;
  allowInfiniteAccent: boolean;
  allowHeightAnimation: boolean;
};

export function getMotionCapabilities(input: {
  isTelegramIOS: boolean;
  isDesktop: boolean;
  prefersReducedMotion: boolean;
}): MotionCapabilities {
  if (input.prefersReducedMotion) {
    return {
      tier: 'lite',
      allowSharedLayout: false,
      allowBackdropBlur: false,
      allowInfiniteAccent: false,
      allowHeightAnimation: false,
    };
  }

  if (input.isTelegramIOS) {
    return {
      tier: 'balanced',
      allowSharedLayout: false,
      allowBackdropBlur: false,
      allowInfiniteAccent: false,
      allowHeightAnimation: true,
    };
  }

  return {
    tier: input.isDesktop ? 'full' : 'balanced',
    allowSharedLayout: true,
    allowBackdropBlur: true,
    allowInfiniteAccent: true,
    allowHeightAnimation: true,
  };
}
```

- [ ] **Step 2: Expose a cheap Telegram iOS predicate in platform helpers**

```ts
// app/lib/platform.ts
export const isTelegramIOS = () => {
  const platform = getTelegramPlatform();
  return platform === 'ios' && isIOSDevice();
};
```

- [ ] **Step 3: Document the motion budget in the frontend guide**

```md
## Telegram Motion Budget

- iOS Telegram: transform/opacity first, no shared-layout animation across long lists.
- Backdrop blur is static-only; animated overlays use solid or semi-solid backdrops.
- Infinite decorative animation is limited to one focal element outside active scroll regions.
```

- [ ] **Step 4: Verify the new policy compiles cleanly**

Run: `npm run lint`
Expected: no new lint errors

- [ ] **Step 5: Commit**

```bash
git add app/lib/motion.ts app/lib/platform.ts docs/FRONTEND_GUIDE.md
git commit -m "docs: define telegram ios motion budget"
```

**Agent assignment:** Coordinator or one `worker` subagent. No parallel work yet.

---

### Task 2: Single-Source Viewport and Keyboard Updates

**Files:**
- Modify: `app/hooks/useKeyboardInset.ts`
- Modify: `app/components/planner/mobile/MobilePlannerShell.tsx`
- Modify: `app/components/TaskSheet.tsx`

**Intent:** Remove duplicate `visualViewport` subscriptions and keep keyboard-driven layout updates in one place.

- [ ] **Step 1: Restrict `useKeyboardInset` to a single owner in the mobile shell**

```tsx
// app/components/planner/mobile/MobilePlannerShell.tsx
const keyboardHeight = useKeyboardInset();
const isKeyboardOpen = keyboardHeight > 0;
```

```tsx
// app/components/TaskSheet.tsx
// remove the extra useKeyboardInset() call
```

- [ ] **Step 2: Make the hook idempotent and low-churn**

```ts
// app/hooks/useKeyboardInset.ts
if (nextHeight === lastHeightRef.current) return;
lastHeightRef.current = nextHeight;
setKeyboardHeight(nextHeight);
document.documentElement.style.setProperty('--keyboard-height', `${nextHeight}px`);
```

- [ ] **Step 3: Keep React updates off noisy viewport events when height did not change**

```ts
vv.addEventListener('resize', update);
vv.addEventListener('scroll', update);
```

Add the equality guard before `setKeyboardHeight`, not after.

- [ ] **Step 4: Verify mobile shell and task sheet still respect safe-area and keyboard spacing**

Run: `npm run lint`
Expected: no new lint errors

- [ ] **Step 5: Commit**

```bash
git add app/hooks/useKeyboardInset.ts app/components/planner/mobile/MobilePlannerShell.tsx app/components/TaskSheet.tsx
git commit -m "perf: centralize ios keyboard viewport updates"
```

**Agent assignment:** `worker` subagent A. Safe to run in parallel with Task 3 after Task 1 lands.

---

### Task 3: Stabilize React Render Boundaries Before Motion Refactors

**Files:**
- Modify: `app/hooks/usePlannerUiController.ts`
- Modify: `app/components/PlannerApp.tsx`
- Modify: `app/components/planner/mobile/MobilePlannerShell.tsx`

**Intent:** Make sure list items and shell branches are not re-rendering because controller callbacks capture the whole planner object.

- [ ] **Step 1: Destructure only the planner fields used by the UI controller**

```ts
const {
  tasks,
  currentTasks,
  activeTaskId,
  selectedDate,
  addTask,
  updateTask,
  deleteTask,
  restoreTask,
  toggleTask,
  syncError,
} = planner;
```

- [ ] **Step 2: Rebuild callbacks against narrowed dependencies**

```ts
const toggleTask = useCallback((id: string, coords?: { x: number; y: number }) => {
  const task = currentTasks.find((item) => item.id === id);
  if (!task) return;
  // existing completion logic
  togglePlannerTask(id);
}, [currentTasks, fire, notification, selectedDateKey, togglePlannerTask, totalCount]);
```

- [ ] **Step 3: Keep shell prop assembly stable and local**

```tsx
// MobilePlannerShell.tsx
const taskListProps = {
  dateKey: format(planner.selectedDate, 'yyyy-MM-dd'),
  tasks: planner.currentTasks,
  ...
};
```

Do not add broad new wrapper state; keep prop construction flat but avoid needless recomputation tied to unrelated UI flags.

- [ ] **Step 4: Verify no behavioral regression in sheet open/edit/delete/undo flows**

Run: `npm run lint`
Expected: no new lint errors

- [ ] **Step 5: Commit**

```bash
git add app/hooks/usePlannerUiController.ts app/components/PlannerApp.tsx app/components/planner/mobile/MobilePlannerShell.tsx
git commit -m "perf: narrow planner ui controller dependencies"
```

**Agent assignment:** `worker` subagent B. Safe to run in parallel with Task 2 after Task 1 lands.

---

### Task 4: Refactor Task List Motion to Localized, Scroll-Safe Animation

**Files:**
- Modify: `app/components/TaskList.tsx`
- Modify: `app/components/TaskItem.tsx`
- Modify: `app/components/planner/shared/task/TaskCardMeta.tsx`
- Optional modify: `app/components/planner/shared/task/TaskCard.tsx`

**Intent:** Preserve a premium feel in the task list without using shared-layout animation that forces broad measurement and relayout in iOS WebView.

- [ ] **Step 1: Remove global shared-layout from cross-section list transitions**

```tsx
const sharedLayoutEnabled = listMotionEnabled && !reduceHeavyEffectsOnPlatform;

return sharedLayoutEnabled ? <LayoutGroup>{groups}</LayoutGroup> : groups;
```

For non-reorder groups, use `motion.ul` / `motion.li` with local `layout="position"` only.

- [ ] **Step 2: Keep reorder only where reorder is actually possible**

```tsx
if (!canReorder) {
  return <motion.ul layout={sharedLayoutEnabled ? 'position' : undefined}>{items}</motion.ul>;
}

return (
  <Reorder.Group ...>
    {items}
  </Reorder.Group>
);
```

- [ ] **Step 3: Gate heavy accent motion separately from reduced motion**

```tsx
const reduceHeavyEffects = reduceMotion || reduceHeavyEffectsOnPlatform;
```

Use this flag for:
- active glow
- active border
- wave meter
- repeated pulsing accent layers

Do not remove:
- subtle enter/exit fade
- localized press/tap feedback
- progress fill that only animates width

- [ ] **Step 4: Keep expand/collapse premium but cheap**

```tsx
<motion.div
  animate={{ height: isExpanded ? detailsHeight : 0, opacity: isExpanded ? 1 : 0 }}
  transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
/>
```

No shared layout IDs for expand/collapse. The card owns its own detail animation.

- [ ] **Step 5: Verify list interactions stay smooth**

Run:
```bash
npm run lint
```

Manual smoke:
- scroll task list with 20+ items
- toggle complete on mid-list item
- pin/unpin item
- reorder two normal tasks
- expand/collapse active task

Expected: no visible hitch where header, other sections, and list all animate together.

- [ ] **Step 6: Commit**

```bash
git add app/components/TaskList.tsx app/components/TaskItem.tsx app/components/planner/shared/task/TaskCardMeta.tsx app/components/planner/shared/task/TaskCard.tsx
git commit -m "perf: localize task list motion for telegram ios"
```

**Agent assignment:** `worker` subagent C. Start only after Task 3 is merged.

---

### Task 5: Make Sheets, Dialogs, and Header Feel Premium Without Animated Blur

**Files:**
- Modify: `app/components/planner/shared/ui/BottomSheet.tsx`
- Modify: `app/components/planner/shared/ui/Dialog.tsx`
- Modify: `app/components/TaskSheet.tsx`
- Modify: `app/components/PlannerHeader.tsx`
- Modify: `app/components/StatsModal.tsx`
- Modify: `app/components/RecurringTasksSheet.tsx`
- Modify: `app/globals.css`

**Intent:** Keep the interface modern, but move iOS Telegram away from blur-heavy moving layers.

- [ ] **Step 1: Standardize the iOS fallback backdrop**

```tsx
<BottomSheet backdropClassName="sheet-backdrop" ... />
<Dialog backdropClassName="sheet-backdrop" ... />
```

```css
@supports (-webkit-touch-callout: none) {
  .sheet-backdrop {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    background: rgba(0, 0, 0, 0.5) !important;
  }
}
```

- [ ] **Step 2: Keep header glass visually rich but layout-static**

```tsx
<div aria-hidden className="absolute inset-0 glass pointer-events-none" />
```

Do not couple the glass layer to `AnimatePresence` or shared-layout transitions.

- [ ] **Step 3: Tone down nested motion in stats and recurring screens on iOS-tier paths**

Use the motion-capability tier to preserve:
- sheet entrance
- local section reveal
- small progress-bar fills

But remove or simplify:
- glowing blur blobs
- springy nested card stacks
- multiple delayed height animations inside the same sheet

- [ ] **Step 4: Verify modal/sheet stack quality**

Manual smoke:
- open task sheet from task tab
- close task sheet with drag and close button
- open recurring sheet, expand one series, open confirm dialog
- open stats modal

Expected: each frame animates cleanly with no blur-smear or lag spike when the backdrop is moving.

- [ ] **Step 5: Commit**

```bash
git add app/components/planner/shared/ui/BottomSheet.tsx app/components/planner/shared/ui/Dialog.tsx app/components/TaskSheet.tsx app/components/PlannerHeader.tsx app/components/StatsModal.tsx app/components/RecurringTasksSheet.tsx app/globals.css
git commit -m "perf: replace animated blur surfaces on telegram ios"
```

**Agent assignment:** `worker` subagent D. Safe to run in parallel with Task 4 after Tasks 2 and 3 are merged.

---

### Task 6: Tune High-Impact Accent Effects and Verify in Telegram Runtime

**Files:**
- Modify: `app/components/FocusOverlay.tsx`
- Modify: `app/hooks/useReward.ts`
- Modify: `app/components/planner/mobile/MobileFocusOverlay.tsx`
- Modify: `docs/TESTING_QA.md`

**Intent:** Keep the “wow” moments, but ensure only one expensive accent is active at a time and validate the result in the real Telegram runtime.

- [ ] **Step 1: Make focus mode use one accent channel at a time**

```tsx
const reduceHeavyEffects = reduceMotion || reduceHeavyEffectsOnPlatform;
```

Preserve:
- sheet entrance
- progress ring
- primary CTA feedback

Simplify:
- blurred pulse halo
- additional background breathing layers

- [ ] **Step 2: Put a hard budget on reward effects**

```ts
if (type === 'climax' && isTelegramIOS()) {
  confetti({ particleCount: 20, spread: 50, ... });
  return;
}
```

On Telegram iOS, do not combine long-running confetti bursts with a full-screen celebration overlay.

- [ ] **Step 3: Add Telegram runtime verification notes**

```md
## Motion QA for Telegram iOS

- Test on a real iPhone inside Telegram, not only Safari.
- Record: task scroll, complete toggle, reorder, open sheet, close sheet, focus overlay.
- Reject the change if header blur, list reorder, and overlay motion overlap in one interaction.
```

- [ ] **Step 4: Run final verification**

Run:
```bash
npm run lint
npm run build
```

Expected:
- `npm run lint` passes
- `npm run build` passes, including resolution of the existing `vitest.config.ts` blocker

Manual Telegram QA:
- iPhone + Telegram runtime
- tasks tab scroll
- habits tab switch
- open/close task sheet with keyboard
- open recurring sheet
- enter focus mode
- complete last task of the day

- [ ] **Step 5: Commit**

```bash
git add app/components/FocusOverlay.tsx app/hooks/useReward.ts app/components/planner/mobile/MobileFocusOverlay.tsx docs/TESTING_QA.md
git commit -m "perf: tune telegram ios accent effects and qa flow"
```

**Agent assignment:** Coordinator + `test_runner`, then `reviewer` for the full integrated pass.

---

## Execution Handoff

This plan is optimized for **Subagent-Driven execution**:

1. Coordinator lands Task 1.
2. Dispatch Task 2 and Task 3 in parallel.
3. Integrate both.
4. Dispatch Task 4 and Task 5 in parallel.
5. Integrate both.
6. Coordinator lands Task 6 and runs final verification.

**Review protocol after every implementation task:**
- Spec review first: did the task preserve the intended motion budget and file scope?
- Code review second: did the task introduce regressions, wide rerenders, or accidental animation loss?

**Recommended execution choice for this repo:** Subagent-Driven orchestration, with this thread acting as the main coordinator and reviewer gatekeeper.
