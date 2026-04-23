'use client';

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { TASK_COLOR_OPTIONS } from '@/app/lib/constants';
import { cn } from '@/app/lib/cn';

export const DEFAULT_HABIT_COLOR = TASK_COLOR_OPTIONS[2];

export type HabitColorPickerProps = {
  ariaLabelledBy?: string;
  className?: string;
  onChange: (value: string) => void;
  options?: readonly string[];
  value: string;
};

export default function HabitColorPicker({
  ariaLabelledBy,
  className,
  onChange,
  options = TASK_COLOR_OPTIONS,
  value,
}: HabitColorPickerProps) {
  return (
    <div
      role="group"
      aria-labelledby={ariaLabelledBy}
      className={cn('flex flex-wrap items-center gap-3', className)}
    >
      {options.map((option) => {
        const isSelected = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-full transition-[box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
              isSelected ? 'scale-110' : 'hover:scale-105 active:scale-95',
            )}
            style={{
              backgroundColor: option,
              boxShadow: isSelected
                ? `0 0 0 2px var(--surface), 0 0 0 4px ${option}`
                : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
            }}
            aria-label={`Цвет ${option}`}
            aria-pressed={isSelected}
          >
            {isSelected ? (
              <motion.span
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 24,
                }}
                className="text-white"
              >
                <Check size={16} strokeWidth={3} />
              </motion.span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
