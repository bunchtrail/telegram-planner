'use client';

import { cn } from '@/app/lib/cn';

export const HABIT_ICON_OPTIONS = [
  '💧',
  '🏃',
  '📖',
  '🧘',
  '💊',
  '🥗',
  '😴',
  '✍️',
  '🎯',
  '💪',
] as const;

export const DEFAULT_HABIT_ICON = HABIT_ICON_OPTIONS[0];

export type HabitIconPickerProps = {
  ariaLabelledBy?: string;
  className?: string;
  onChange: (value: string) => void;
  options?: readonly string[];
  value: string;
};

export default function HabitIconPicker({
  ariaLabelledBy,
  className,
  onChange,
  options = HABIT_ICON_OPTIONS,
  value,
}: HabitIconPickerProps) {
  return (
    <div
      role="group"
      aria-labelledby={ariaLabelledBy}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((icon) => {
        const isSelected = value === icon;

        return (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
              isSelected
                ? 'scale-110 bg-[var(--accent)]/15 ring-2 ring-[var(--accent)]'
                : 'bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 active:scale-95',
            )}
            aria-label={icon}
            aria-pressed={isSelected}
          >
            <span aria-hidden>{icon}</span>
          </button>
        );
      })}
    </div>
  );
}
