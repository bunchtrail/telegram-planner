import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HabitsTab from '@/app/components/HabitsTab';
import HabitCard from '@/app/components/planner/shared/habit/HabitCard';
import HabitWeekGrid from '@/app/components/planner/shared/habit/HabitWeekGrid';
import type { Habit } from '@/app/types/habit';

const today = new Date('2026-04-18T12:00:00.000Z');
const tomorrow = new Date('2026-04-19T12:00:00.000Z');
const monday = new Date('2026-04-13T12:00:00.000Z');

const baseHabit: Habit = {
  id: 'habit-1',
  name: 'Изучение физики',
  icon: '⚛️',
  color: '#2563eb',
  sortOrder: 0,
  archived: false,
};

describe('desktop habits UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today);
  });

  it('renders natural Russian copy for the desktop focus summary', () => {
    render(
      <HabitsTab
        habits={[baseHabit]}
        isLoading={false}
        isChecked={(_, date) => date === '2026-04-13'}
        isDesktop
        onAddHabit={vi.fn()}
        onDeleteHabit={vi.fn()}
        onToggleLog={vi.fn()}
        selectedDate={today}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'На сегодня осталась 1 привычка',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'За неделю: 1 отметка'),
    ).toBeInTheDocument();
  });

  it('does not show duplicated state copy for an incomplete focus habit', () => {
    render(
      <HabitCard
        habit={baseHabit}
        isChecked={() => false}
        isDesktop
        desktopFocusDate={today}
        onDelete={vi.fn()}
        onToggleLog={vi.fn()}
        weekDays={[monday, today, tomorrow]}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Отметить сегодня' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Не отмечено на сегодня')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Главное действие вынесено отдельно, чтобы не искать нужный день в сетке.',
      ),
    ).not.toBeInTheDocument();
  });

  it('renders future days as inactive instead of missed', () => {
    render(
      <HabitWeekGrid
        color={baseHabit.color}
        days={[tomorrow]}
        habitId={baseHabit.id}
        habitName={baseHabit.name}
        isChecked={() => false}
        layout="desktop"
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Будет позже')).toBeInTheDocument();
    expect(screen.queryByText('Не отмечено')).not.toBeInTheDocument();
  });

  it('disables the focus action for a future date', () => {
    render(
      <HabitCard
        habit={baseHabit}
        isChecked={() => false}
        isDesktop
        desktopFocusDate={tomorrow}
        onDelete={vi.fn()}
        onToggleLog={vi.fn()}
        weekDays={[monday, today, tomorrow]}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Будет доступно 19/i }),
    ).toBeDisabled();
  });
});
