import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Button from '../../app/components/planner/shared/ui/Button';
import FieldLabel from '../../app/components/planner/shared/ui/FieldLabel';

type TextareaFieldProps = {
  id: string;
  label: string;
  placeholder?: string;
};

function TextareaField({
  id,
  label,
  placeholder,
}: TextareaFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
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

    const button = screen.getByRole('button', { name: /saving/i });
    const status = screen.getByRole('status');

    expect(button).toBeDisabled();
    expect(status).toHaveTextContent('Saving…');
  });

  test('TextareaField renders a visible label and is queryable by label text', () => {
    render(
      <TextareaField
        id="task-notes"
        label="Task notes"
        placeholder="Placeholder should not be required"
      />,
    );

    expect(screen.getByText('Task notes')).toBeVisible();
    expect(screen.getByLabelText('Task notes')).toBeInTheDocument();
  });
});
