import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MobileHabitsTab from './MobileHabitsTab';
import type { Habit } from '@/app/types/habit';

const today = new Date('2026-04-18T12:00:00.000Z');

const habits: Habit[] = [
  {
    id: 'habit-done',
    name: 'Чтение',
    icon: '📚',
    color: '#2563eb',
    sortOrder: 1,
    archived: false,
  },
  {
    id: 'habit-open',
    name: 'Вода',
    icon: '💧',
    color: '#14b8a6',
    sortOrder: 0,
    archived: false,
  },
];

const installTelegramHaptics = () => {
  const impactOccurred = vi.fn();
  const notificationOccurred = vi.fn();
  const selectionChanged = vi.fn();

  Object.defineProperty(window, 'Telegram', {
    configurable: true,
    value: {
      WebApp: {
        HapticFeedback: {
          impactOccurred,
          notificationOccurred,
          selectionChanged,
        },
      },
    },
  });

  return { impactOccurred, notificationOccurred, selectionChanged };
};

describe('MobileHabitsTab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today);
  });

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

  it('opens the create flow in a bottom sheet and submits the habit payload', async () => {
    const onAddHabit = vi.fn();

    render(
      <MobileHabitsTab
        habits={[]}
        isLoading={false}
        isChecked={() => false}
        onAddHabit={onAddHabit}
        onDeleteHabit={vi.fn()}
        onToggleLog={vi.fn()}
        selectedDate={today}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Добавить привычку' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');

    fireEvent.change(screen.getByRole('textbox', { name: 'Название привычки' }), {
      target: { value: 'Растяжка' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Добавить' }));

    expect(onAddHabit).toHaveBeenCalledWith(
      'Растяжка',
      expect.any(String),
      expect.any(String),
    );
  });

  it('keeps delete as a two-step action from the row menu', async () => {
    const onDeleteHabit = vi.fn();

    render(
      <MobileHabitsTab
        habits={[habits[0]]}
        isLoading={false}
        isChecked={() => false}
        onAddHabit={vi.fn()}
        onDeleteHabit={onDeleteHabit}
        onToggleLog={vi.fn()}
        selectedDate={today}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Действия для привычки Чтение' }),
    );

    const deleteButton = screen.getByRole('menuitem', {
      name: 'Удалить привычку',
    });
    fireEvent.click(deleteButton);
    expect(onDeleteHabit).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Подтвердить удаление привычки' }),
    );
    expect(onDeleteHabit).toHaveBeenCalledWith('habit-done');
  });

  it('triggers iOS telegram haptics on row interactions', async () => {
    const haptics = installTelegramHaptics();
    const onToggleLog = vi.fn();

    render(
      <MobileHabitsTab
        habits={[habits[1]]}
        isLoading={false}
        isChecked={() => false}
        onAddHabit={vi.fn()}
        onDeleteHabit={vi.fn()}
        onToggleLog={onToggleLog}
        selectedDate={today}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Вода, суббота, 18 апреля/i,
      }),
    );

    expect(onToggleLog).toHaveBeenCalledWith('habit-open', '2026-04-18');
    expect(haptics.selectionChanged).toHaveBeenCalled();
    expect(haptics.notificationOccurred).toHaveBeenCalledWith('success');
  });
});
