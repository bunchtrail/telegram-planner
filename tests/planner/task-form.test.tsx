import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import TaskSheet from '../../app/components/TaskSheet';
import TaskForm from '../../app/components/planner/shared/task/TaskForm';

const { impactMock, notificationMock } = vi.hoisted(() => ({
  impactMock: vi.fn(),
  notificationMock: vi.fn(),
}));

vi.mock('../../app/hooks/useHaptic', () => ({
  useHaptic: () => ({
    impact: impactMock,
    notification: notificationMock,
    selection: vi.fn(),
  }),
}));

vi.mock('../../app/hooks/useKeyboardInset', () => ({
  useKeyboardInset: () => 0,
}));

class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver;
const originalScrollTo = window.scrollTo;

beforeAll(() => {
  globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;
  window.scrollTo = vi.fn();
});

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
  window.scrollTo = originalScrollTo;
});

beforeEach(() => {
  impactMock.mockReset();
  notificationMock.mockReset();
});

describe('shared task form composition', () => {
  test('TaskForm trims title and clears reminder payload when schedule is removed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <TaskForm
        mode="create"
        taskDate={new Date('2026-04-17T00:00:00.000Z')}
        initialValue={{
          title: '  Подготовить отчет  ',
          duration: 45,
          repeat: 'daily',
          repeatCount: 7,
          color: '#007aff',
          startMinutes: 9 * 60,
          remindBeforeMinutes: 30,
        }}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Сбросить' }));

    const titleField = screen.getByRole('textbox', {
      name: /название задачи/i,
    });

    fireEvent.submit(titleField.closest('form')!);

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Подготовить отчет',
      duration: 45,
      repeat: 'daily',
      repeatCount: 7,
      color: '#007aff',
      startMinutes: null,
      remindBeforeMinutes: 0,
    });
    expect(notificationMock).toHaveBeenCalledWith('success');
  });

  test('TaskSheet forwards shared form values through the existing positional submit contract', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <TaskSheet
        onClose={vi.fn()}
        mode="edit"
        initialTitle="Старое название"
        initialDuration={30}
        initialColor="#34c759"
        initialStartMinutes={9 * 60}
        initialRemindBeforeMinutes={10}
        taskDate={new Date('2026-04-17T00:00:00.000Z')}
        onSubmit={onSubmit}
        isDesktop
      />,
    );

    const titleField = screen.getByRole('textbox', {
      name: /название задачи/i,
    });

    await user.clear(titleField);
    await user.type(titleField, 'Встреча');
    await user.click(screen.getByRole('button', { name: '60 м' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onSubmit).toHaveBeenCalledWith(
      'Встреча',
      60,
      'none',
      7,
      '#34c759',
      9 * 60,
      10,
    );
  });
});
