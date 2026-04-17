import {
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { TaskSeriesRow } from '../../app/hooks/usePlanner';
import RecurringTasksSheet from '../../app/components/RecurringTasksSheet';
import BottomSheet from '../../app/components/planner/shared/ui/BottomSheet';
import Dialog from '../../app/components/planner/shared/ui/Dialog';
import ModalHeader from '../../app/components/planner/shared/ui/ModalHeader';

vi.mock('../../app/hooks/useHaptic', () => ({
  useHaptic: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}));

const originalScrollTo = window.scrollTo;

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterAll(() => {
  window.scrollTo = originalScrollTo;
});

describe('shared dialog and sheet primitives', () => {
  test('Dialog closes on Escape and backdrop click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Dialog
        ariaLabelledby="dialog-title"
        onClose={onClose}
        contentClassName="max-w-sm"
      >
        <ModalHeader title="Статистика" titleId="dialog-title" onClose={onClose} />
        <p>Контент</p>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Статистика' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');
    await user.click(screen.getByTestId('dialog-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('Dialog prefers onRequestClose over onClose for Escape and backdrop paths', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onRequestClose = vi.fn();

    render(
      <Dialog
        ariaLabelledby="request-close-title"
        onClose={onClose}
        onRequestClose={onRequestClose}
      >
        <ModalHeader
          title="Подтверждение"
          titleId="request-close-title"
          onClose={onClose}
        />
        <button type="button">Внутренняя кнопка</button>
      </Dialog>,
    );

    await user.keyboard('{Escape}');
    await user.click(screen.getByTestId('dialog-backdrop'));

    expect(onRequestClose).toHaveBeenCalledTimes(2);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('BottomSheet renders the shared mobile sheet shell and forwards dialog semantics', () => {
    const onClose = vi.fn();

    render(
      <BottomSheet ariaLabelledby="sheet-title" onClose={onClose}>
        <ModalHeader title="Новая задача" titleId="sheet-title" onClose={onClose} />
        <div>Форма</div>
      </BottomSheet>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Новая задача' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(screen.getByText('Форма'));
    expect(screen.getByTestId('bottom-sheet-handle')).toBeInTheDocument();
  });

  test('Dialog traps focus inside the frame and restores the previous focus on unmount', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <>
        <button type="button">Открыть статистику</button>
        <button type="button">Фон</button>
      </>,
    );

    const opener = screen.getByRole('button', { name: 'Открыть статистику' });
    opener.focus();

    rerender(
      <>
        <button type="button">Открыть статистику</button>
        <Dialog ariaLabelledby="focus-title" onClose={vi.fn()}>
          <ModalHeader title="Фокус" titleId="focus-title" onClose={vi.fn()} />
          <div>
            <button type="button">Первое действие</button>
            <button type="button">Второе действие</button>
          </div>
        </Dialog>
        <button type="button">Фон</button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Первое действие' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Второе действие' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Второе действие' })).toHaveFocus();

    rerender(
      <>
        <button type="button">Открыть статистику</button>
        <button type="button">Фон</button>
      </>,
    );

    expect(opener).toHaveFocus();
  });

  test('ModalHeader exposes the shared title and close button structure', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ModalHeader
        title="Повторяющиеся задачи"
        titleId="recurring-title"
        onClose={onClose}
        action={<button type="button">Сохранить</button>}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Повторяющиеся задачи',
        level: 2,
      }),
    ).toHaveAttribute('id', 'recurring-title');
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('RecurringTasksSheet keeps close requests inside the stacked confirm flow until the confirm is dismissed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const recurringTasks: TaskSeriesRow[] = [
      {
        id: 'series-1',
        title: 'Повтор задачи',
        duration: 30,
        repeat: 'daily',
        weekday: null,
        start_minutes: 540,
        remind_before_minutes: 10,
        start_date: '2026-04-17',
        end_date: null,
      },
    ];

    render(
      <RecurringTasksSheet
        onClose={onClose}
        recurringTasks={recurringTasks}
        recurringSkips={[]}
        onDeleteSeries={vi.fn()}
        onSkipDate={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Повтор задачи/i }));
    await user.click(screen.getByRole('button', { name: /Остановить серию/i }));

    const confirmLayer = screen.getByText('Удалить все повторы?').closest('div');
    expect(screen.getByText('Удалить все повторы?')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitForElementToBeRemoved(() => screen.queryByText('Удалить все повторы?'));

    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);

    if (confirmLayer) {
      expect(within(document.body).queryByText('Удалить все повторы?')).not.toBeInTheDocument();
    }
  });
});
