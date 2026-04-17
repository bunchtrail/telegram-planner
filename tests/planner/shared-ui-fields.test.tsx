import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Button from '../../app/components/planner/shared/ui/Button';
import EmptyState from '../../app/components/planner/shared/ui/EmptyState';
import FieldLabel from '../../app/components/planner/shared/ui/FieldLabel';
import IconButton from '../../app/components/planner/shared/ui/IconButton';
import SurfaceCard from '../../app/components/planner/shared/ui/SurfaceCard';

type TextareaFieldProps = {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
};

function TextareaField({
  id,
  hint,
  label,
  placeholder,
}: TextareaFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>
      <textarea id={id} placeholder={placeholder} />
    </div>
  );
}

describe('shared ui primitives', () => {
  test('Button renders a semantic button with disabled state support', () => {
    render(
      <>
        <Button>Save</Button>
        <Button disabled>Delete</Button>
      </>,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    const deleteButton = screen.getByRole('button', { name: 'Delete' });

    expect(saveButton.tagName).toBe('BUTTON');
    expect(saveButton).toHaveAttribute('type', 'button');
    expect(saveButton).toBeEnabled();
    expect(deleteButton).toBeDisabled();
  });

  test('Button exposes loading status and disables interaction while saving', () => {
    render(<Button isLoading>Save</Button>);

    const button = screen.getByRole('button', { name: /сохранение/i });
    const status = screen.getByRole('status');

    expect(button).toBeDisabled();
    expect(status).toHaveTextContent('Сохранение…');
  });

  test('Button supports accent variant styling for CTA usage', () => {
    render(<Button variant="accent">Create</Button>);

    expect(screen.getByRole('button', { name: 'Create' })).toHaveClass(
      'bg-[var(--accent)]',
      'text-[var(--accent-ink)]',
    );
  });

  test('IconButton exposes its aria-label and disabled state', () => {
    render(
      <IconButton
        disabled
        icon={<span>+</span>}
        label="Добавить задачу"
      />,
    );

    const button = screen.getByRole('button', { name: 'Добавить задачу' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('type', 'button');
  });

  test('FieldLabel hint does not pollute the associated control accessible name', () => {
    render(
      <TextareaField
        id="task-notes"
        label="Task notes"
        hint="3/120"
        placeholder="Placeholder should not be required"
      />,
    );

    expect(screen.getByText('Task notes')).toBeVisible();
    expect(screen.getByText('3/120')).toBeVisible();
    expect(screen.getByLabelText('Task notes')).toHaveAccessibleName('Task notes');
  });

  test('SurfaceCard renders semantic content inside the shared surface shell', () => {
    render(
      <SurfaceCard data-testid="surface-card">
        <p>Card content</p>
      </SurfaceCard>,
    );

    expect(screen.getByTestId('surface-card')).toContainElement(
      screen.getByText('Card content'),
    );
  });

  test('EmptyState supports a configurable heading tag', () => {
    render(
      <EmptyState
        title="Пока пусто"
        description="Добавьте первый элемент"
        headingAs="h3"
        action={<button type="button">Добавить</button>}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Пока пусто', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Добавьте первый элемент')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument();
  });
});
