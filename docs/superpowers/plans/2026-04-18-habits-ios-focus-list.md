# Habits iOS Focus List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile iOS habits hero panel with a compact today-first header so the screen behaves like a daily checklist.

**Architecture:** Keep the change local to `MobileHabitsTab` and preserve the shared `HabitWeekGrid` contract. Re-anchor the mobile tab to the current day/week, keep add/delete/haptics intact, and verify the new hierarchy through focused UI tests.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, date-fns

---

### Task 1: Lock the new mobile habits behavior in tests

**Files:**
- Modify: `app/components/planner/mobile/MobileHabitsTab.test.tsx`
- Run: `npm run test -- MobileHabitsTab`

- [ ] **Step 1: Write the failing test**

```tsx
it('anchors the mobile habits screen to today instead of selectedDate', () => {
  const focusHabits: Habit[] = [
    {
      id: 'habit-done',
      name: 'Чтение',
      icon: '📚',
      color: '#2563eb',
      sortOrder: 0,
      archived: false,
    },
    {
      id: 'habit-open',
      name: 'Вода',
      icon: '💧',
      color: '#14b8a6',
      sortOrder: 1,
      archived: false,
    },
  ];

  render(
    <MobileHabitsTab
      habits={focusHabits}
      isLoading={false}
      isChecked={(habitId, date) =>
        (habitId === 'habit-done' && date === '2026-04-18') ||
        (habitId === 'habit-open' && date === '2026-04-17')
      }
      onAddHabit={vi.fn()}
      onDeleteHabit={vi.fn()}
      onToggleLog={vi.fn()}
      selectedDate={new Date('2026-04-16T12:00:00.000Z')}
    />,
  );

  expect(screen.getByText('1 из 2 выполнено')).toBeInTheDocument();

  const items = screen.getAllByRole('listitem');
  expect(within(items[0]).getByText('Вода')).toBeInTheDocument();
  expect(within(items[1]).getByText('Чтение')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- MobileHabitsTab`
Expected: FAIL because the current component still derives summary and ordering from `selectedDate`.

- [ ] **Step 3: Keep the existing interaction tests**

```tsx
it('opens the create flow in a bottom sheet and submits the habit payload', async () => {
  // existing test remains unchanged
});

it('keeps delete as a two-step action from the row menu', async () => {
  // existing test remains unchanged
});

it('triggers iOS telegram haptics on row interactions', async () => {
  // existing test remains unchanged
});
```

- [ ] **Step 4: Re-run the focused suite after implementation**

Run: `npm run test -- MobileHabitsTab`
Expected: PASS

### Task 2: Simplify the mobile habits layout

**Files:**
- Modify: `app/components/planner/mobile/MobileHabitsTab.tsx`
- Verify: `npm run lint`
- Verify: `npm run build`

- [ ] **Step 1: Re-anchor the tab to today**

```tsx
const today = new Date();
const todayKey = format(today, 'yyyy-MM-dd');

const weekDays = useMemo(() => {
  const start = startOfWeek(today, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}, [todayKey]);
```

- [ ] **Step 2: Replace the hero card with a compact header**

```tsx
<div className="flex items-center justify-between gap-3 px-1">
  <div className="min-w-0">
    <h2 className="text-[24px] font-bold tracking-tight text-[var(--ink)] font-[var(--font-display)]">
      Привычки
    </h2>
    <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">
      Сегодняшний список без лишней панели сверху.
    </p>
  </div>

  <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setShowAddForm(true)}>
    <Plus size={16} strokeWidth={2.5} />
    <span>Добавить</span>
  </Button>
</div>
```

- [ ] **Step 3: Add compact progress pills instead of the old summary card**

```tsx
{habits.length > 0 ? (
  <div className="flex flex-wrap gap-2 px-1 text-[12px]">
    <div className="rounded-full bg-[var(--accent)]/10 px-3 py-1.5 font-semibold text-[var(--accent)]">
      {completedTodayCount} из {habits.length} выполнено
    </div>
    <div className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 font-medium text-[var(--muted)]">
      {totalChecks} отметок за неделю
    </div>
  </div>
) : null}
```

- [ ] **Step 4: Keep list, empty state, and bottom sheet behavior unchanged**

```tsx
{orderedHabits.length > 0 ? (
  <ul className="m-0 flex list-none flex-col gap-3 p-0">
    {/* existing rows */}
  </ul>
) : (
  <SurfaceCard>
    {/* existing empty state */}
  </SurfaceCard>
)}
```

- [ ] **Step 5: Run full verification**

Run: `npm run test -- MobileHabitsTab`
Expected: PASS

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS
