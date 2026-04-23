import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import HabitsTab from '../../app/components/HabitsTab';
import type { Habit } from '../../app/types/habit';

const selectedDate = new Date('2026-04-18T12:00:00.000Z');

const habits: Habit[] = [
  {
    id: 'habit-reading',
    name: 'Чтение',
    icon: '📖',
    color: '#34c759',
    sortOrder: 0,
    archived: false,
  },
  {
    id: 'habit-water',
    name: 'Вода',
    icon: '💧',
    color: '#0a84ff',
    sortOrder: 1,
    archived: false,
  },
  {
    id: 'habit-walk',
    name: 'Прогулка',
    icon: '🚶',
    color: '#ff9f0a',
    sortOrder: 2,
    archived: false,
  },
];

type RenderOptions = {
  checkedKeys?: string[];
  onDeleteHabit?: (habitId: string) => void;
  onToggleLog?: (habitId: string, date: string) => void;
};

const renderDesktopHabits = ({
  checkedKeys = [],
  onDeleteHabit = vi.fn(),
  onToggleLog = vi.fn(),
}: RenderOptions = {}) => {
  const checked = new Set(checkedKeys);

  return render(
    <HabitsTab
      habits={habits}
      isLoading={false}
      isChecked={(habitId, date) => checked.has(`${habitId}:${date}`)}
      isLogPending={() => false}
      onToggleLog={onToggleLog}
      onAddHabit={vi.fn()}
      onDeleteHabit={onDeleteHabit}
      selectedDate={selectedDate}
      isDesktop
    />,
  );
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(selectedDate);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('desktop habits tab', () => {
  test('summarizes and groups habits around today with clear primary actions', () => {
    renderDesktopHabits({
      checkedKeys: ['habit-water:2026-04-18'],
    });

    expect(
      screen.getByRole('heading', { name: 'На сегодня осталось 2 привычки' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Уже выполнено 1 из 3')).toBeInTheDocument();

    const remainingSection = screen.getByRole('region', {
      name: 'Осталось сегодня',
    });
    const completedSection = screen.getByRole('region', {
      name: 'Уже выполнено',
    });

    expect(
      within(remainingSection).getAllByRole('heading', { level: 3 }).map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(['Чтение', 'Прогулка']);
    expect(
      within(completedSection).getAllByRole('heading', { level: 3 }).map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(['Вода']);

    expect(
      within(remainingSection).getAllByRole('button', { name: 'Отметить сегодня' }),
    ).toHaveLength(2);
    expect(
      within(completedSection).getByRole('button', { name: 'Снять отметку' }),
    ).toBeInTheDocument();

    expect(screen.queryByText('Свободно')).not.toBeInTheDocument();
    expect(screen.queryByText('Не отмечено')).not.toBeInTheDocument();
    expect(screen.getByText('Выполнено сегодня')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /без отметки/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', {
        name: /Вода, суббота, 18 апреля, выполнено/i,
      }),
    ).toBeInTheDocument();
  });

  test('moves a habit between today groups when the selected day becomes checked', () => {
    const { rerender } = renderDesktopHabits();

    expect(
      within(
        screen.getByRole('region', { name: 'Осталось сегодня' }),
      ).getByRole('heading', { level: 3, name: 'Чтение' }),
    ).toBeInTheDocument();

    rerender(
      <HabitsTab
        habits={habits}
        isLoading={false}
        isChecked={(habitId, date) =>
          `${habitId}:${date}` === 'habit-reading:2026-04-18'
        }
        isLogPending={() => false}
        onToggleLog={vi.fn()}
        onAddHabit={vi.fn()}
        onDeleteHabit={vi.fn()}
        selectedDate={selectedDate}
        isDesktop
      />,
    );

    expect(
      within(
        screen.getByRole('region', { name: 'Уже выполнено' }),
      ).getByRole('heading', { level: 3, name: 'Чтение' }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('region', { name: 'Уже выполнено' }),
      ).getByRole('button', { name: 'Снять отметку' }),
    ).toBeInTheDocument();
  });

  test('keeps delete inside overflow actions instead of showing it as a primary button', async () => {
    const onDeleteHabit = vi.fn();

    renderDesktopHabits({ onDeleteHabit });

    expect(
      screen.queryByRole('button', { name: 'Удалить привычку' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Действия для привычки Чтение' }),
    );

    expect(
      screen.getByRole('menuitem', { name: 'Удалить привычку' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Удалить привычку' }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Подтвердить удаление привычки' }),
    );

    expect(onDeleteHabit).toHaveBeenCalledWith('habit-reading');
  });
});
