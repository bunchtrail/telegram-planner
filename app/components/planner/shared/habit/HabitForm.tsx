'use client';

import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import Button from '@/app/components/planner/shared/ui/Button';
import FieldLabel from '@/app/components/planner/shared/ui/FieldLabel';
import SurfaceCard from '@/app/components/planner/shared/ui/SurfaceCard';
import { cn } from '@/app/lib/cn';
import HabitColorPicker, { DEFAULT_HABIT_COLOR } from './HabitColorPicker';
import HabitIconPicker, { DEFAULT_HABIT_ICON } from './HabitIconPicker';

export type HabitFormValue = {
  color: string;
  icon: string;
  name: string;
};

export type HabitFormSubmitValue = HabitFormValue;

export type HabitFormProps = {
  className?: string;
  initialValue?: Partial<HabitFormValue>;
  onCancel?: () => void;
  onSubmit: (value: HabitFormSubmitValue) => void;
  submitLabel?: string;
};

const createInitialValue = (
  initialValue?: Partial<HabitFormValue>,
): HabitFormValue => ({
  name: initialValue?.name ?? '',
  icon: initialValue?.icon ?? DEFAULT_HABIT_ICON,
  color: initialValue?.color ?? DEFAULT_HABIT_COLOR,
});

export default function HabitForm({
  className,
  initialValue,
  onCancel,
  onSubmit,
  submitLabel = 'Добавить',
}: HabitFormProps) {
  const [value, setValue] = useState(() => createInitialValue(initialValue));
  const nameFieldId = useId();
  const iconLabelId = useId();
  const colorLabelId = useId();

  const canSubmit = useMemo(() => value.name.trim().length > 0, [value.name]);

  const reset = () => {
    setValue(createInitialValue(initialValue));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = value.name.trim();
    if (!name) {
      return;
    }

    onSubmit({
      name,
      icon: value.icon,
      color: value.color,
    });
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      reset();
      onCancel?.();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <SurfaceCard className={cn('p-5', className)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FieldLabel htmlFor={nameFieldId}>Название привычки</FieldLabel>
          <input
            id={nameFieldId}
            type="text"
            value={value.name}
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            onKeyDown={handleNameKeyDown}
            onFocus={(event) => {
              const target = event.target;
              window.setTimeout(() => {
                target.scrollIntoView?.({
                  behavior: 'smooth',
                  block: 'center',
                });
              }, 300);
            }}
            placeholder="Название привычки"
            maxLength={100}
            autoFocus
            aria-label="Название привычки"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <FieldLabel id={iconLabelId}>Иконка</FieldLabel>
          <HabitIconPicker
            value={value.icon}
            onChange={(icon) =>
              setValue((current) => ({
                ...current,
                icon,
              }))
            }
            className="gap-2"
          />
        </div>

        <div>
          <FieldLabel id={colorLabelId}>Цвет</FieldLabel>
          <HabitColorPicker
            value={value.color}
            onChange={(color) =>
              setValue((current) => ({
                ...current,
                color,
              }))
            }
          />
        </div>

        <div className="flex gap-3">
          {onCancel ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full flex-1 bg-[var(--surface-2)] text-[var(--muted)] shadow-none"
              onClick={handleCancel}
            >
              Отмена
            </Button>
          ) : null}

          <Button
            type="submit"
            variant="accent"
            className="w-full flex-1 shadow-none"
            disabled={!canSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </SurfaceCard>
  );
}
