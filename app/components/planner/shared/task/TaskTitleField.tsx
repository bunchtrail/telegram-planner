'use client';

import { forwardRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { cn } from '@/app/lib/cn';

export type TaskTitleFieldProps = {
  color: string;
  isDesktop?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
  value: string;
};

const TaskTitleField = forwardRef<HTMLTextAreaElement, TaskTitleFieldProps>(
  (
    {
      color,
      isDesktop = false,
      maxLength = 160,
      onChange,
      value,
    },
    ref,
  ) => {
    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }
    };

    return (
      <>
        <label htmlFor="task-title-field" className="sr-only">
          Название задачи
        </label>
        <textarea
          ref={ref}
          id="task-title-field"
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          placeholder="Что нужно сделать?"
          aria-label="Название задачи"
          className={cn(
            'w-full min-h-[50px] resize-none bg-transparent font-[var(--font-display)] font-bold leading-tight tracking-tight text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--muted)]/30',
            isDesktop ? 'text-[40px]' : 'text-[32px]',
          )}
          style={{ caretColor: color }}
        />
      </>
    );
  },
);

TaskTitleField.displayName = 'TaskTitleField';

export default TaskTitleField;
