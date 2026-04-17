import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import HabitsTab from '../../app/components/HabitsTab';
import HabitForm from '../../app/components/planner/shared/habit/HabitForm';

const originalScrollTo = window.scrollTo;

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterAll(() => {
  window.scrollTo = originalScrollTo;
});

describe('shared habit form composition', () => {
  test('HabitForm submits a trimmed payload from labeled controls', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<HabitForm onCancel={onCancel} onSubmit={onSubmit} />);

    const nameField = screen.getByRole('textbox', { name: /название привычки/i });

    await user.type(nameField, '  Пить воду  ');
    await user.click(screen.getByRole('button', { name: '💪' }));
    await user.click(screen.getByRole('button', { name: /цвет #ff2d55/i }));

    fireEvent.submit(nameField.closest('form')!);

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Пить воду',
      icon: '💪',
      color: '#ff2d55',
    });
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('HabitsTab preserves add, toggle, and delete flows through shared habit primitives', async () => {
    const user = userEvent.setup();
    const onAddHabit = vi.fn();
    const onDeleteHabit = vi.fn();
    const onToggleLog = vi.fn();

    render(
      <HabitsTab
        habits={[
          {
            id: 'habit-1',
            name: 'Чтение',
            icon: '📖',
            color: '#34c759',
            sortOrder: 0,
            archived: false,
          },
        ]}
        isLoading={false}
        isChecked={() => false}
        isLogPending={() => false}
        onToggleLog={onToggleLog}
        onAddHabit={onAddHabit}
        onDeleteHabit={onDeleteHabit}
        selectedDate={new Date('2026-04-17T00:00:00.000Z')}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Добавить привычку' }));
    await user.type(
      screen.getByRole('textbox', { name: /название привычки/i }),
      '  Пить воду  ',
    );
    await user.click(screen.getByRole('button', { name: '💧' }));
    await user.click(screen.getByRole('button', { name: /цвет #007aff/i }));
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(onAddHabit).toHaveBeenCalledWith('Пить воду', '💧', '#007aff');

    await user.click(screen.getByRole('button', { name: 'Чтение 2026-04-17' }));
    expect(onToggleLog).toHaveBeenCalledWith('habit-1', '2026-04-17');

    await user.click(screen.getByRole('button', { name: 'Удалить привычку' }));
    await user.click(screen.getByRole('button', { name: 'Подтвердить удаление' }));
    expect(onDeleteHabit).toHaveBeenCalledWith('habit-1');
  });
});
