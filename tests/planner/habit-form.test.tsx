import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import HabitsTab from '../../app/components/HabitsTab';
import HabitForm from '../../app/components/planner/shared/habit/HabitForm';

const originalScrollTo = window.scrollTo;
const selectedDate = new Date('2026-04-17T00:00:00.000Z');

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterAll(() => {
  window.scrollTo = originalScrollTo;
});

afterEach(() => {
  vi.useRealTimers();
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

  test('HabitForm reacts to initialValue updates after mount', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <HabitForm
        onSubmit={onSubmit}
        initialValue={{ name: 'Вода', icon: '💧', color: '#007aff' }}
      />,
    );

    const nameField = screen.getByRole('textbox', { name: /название привычки/i });

    await user.clear(nameField);
    await user.type(nameField, 'Черновик');
    await user.click(screen.getByRole('button', { name: '💪' }));

    rerender(
      <HabitForm
        onSubmit={onSubmit}
        initialValue={{ name: 'Чтение', icon: '📖', color: '#34c759' }}
      />,
    );

    expect(screen.getByRole('textbox', { name: /название привычки/i })).toHaveValue(
      'Чтение',
    );
    expect(screen.getByRole('button', { name: '📖' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /цвет #34c759/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('HabitForm binds picker groups to visible labels', () => {
    render(<HabitForm onSubmit={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'Иконка' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Цвет' })).toBeInTheDocument();
  });

  test('HabitsTab preserves add, toggle, and delete flows through shared habit primitives', async () => {
    const user = userEvent.setup();
    const onAddHabit = vi.fn();
    const onDeleteHabit = vi.fn();
    const onToggleLog = vi.fn();
    const expectedDayLabel = `Чтение, ${format(selectedDate, 'EEEE, d MMMM', {
      locale: ru,
    })}`;

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
        selectedDate={selectedDate}
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

    await user.click(
      screen.getByRole('button', { name: new RegExp(expectedDayLabel) }),
    );
    expect(onToggleLog).toHaveBeenCalledWith('habit-1', '2026-04-17');

    await user.click(screen.getByRole('button', { name: 'Удалить привычку' }));
    await user.click(screen.getByRole('button', { name: 'Подтвердить удаление' }));
    expect(onDeleteHabit).toHaveBeenCalledWith('habit-1');
  });

  test('HabitsTab does not toggle a pending habit day cell', async () => {
    const user = userEvent.setup();
    const onToggleLog = vi.fn();
    const expectedDayLabel = `Чтение, ${format(selectedDate, 'EEEE, d MMMM', {
      locale: ru,
    })}`;

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
        isLogPending={(_, date) => date === '2026-04-17'}
        onToggleLog={onToggleLog}
        onAddHabit={vi.fn()}
        onDeleteHabit={vi.fn()}
        selectedDate={selectedDate}
      />,
    );

    const dayButton = screen.getByRole('button', {
      name: new RegExp(expectedDayLabel),
    });
    expect(dayButton).toBeDisabled();

    await user.click(dayButton);

    expect(onToggleLog).not.toHaveBeenCalled();
  });

  test('HabitsTab resets delete confirmation after the timeout window', async () => {
    vi.useFakeTimers();

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
        onToggleLog={vi.fn()}
        onAddHabit={vi.fn()}
        onDeleteHabit={vi.fn()}
        selectedDate={selectedDate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Удалить привычку' }));
    expect(
      screen.getByRole('button', { name: 'Подтвердить удаление' }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByRole('button', { name: 'Удалить привычку' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Подтвердить удаление' }),
    ).not.toBeInTheDocument();
  });
});
