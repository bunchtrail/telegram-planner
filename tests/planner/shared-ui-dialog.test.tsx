import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import BottomSheet from '../../app/components/planner/shared/ui/BottomSheet';
import Dialog from '../../app/components/planner/shared/ui/Dialog';
import ModalHeader from '../../app/components/planner/shared/ui/ModalHeader';

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
});
