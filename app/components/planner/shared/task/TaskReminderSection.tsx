'use client';

import { Bell } from 'lucide-react';
import { useHaptic } from '@/app/hooks/useHaptic';
import { cn } from '@/app/lib/cn';

const REMINDER_OPTIONS = [0, 5, 10, 30, 60] as const;

export type TaskReminderSectionProps = {
  onChange: (value: number) => void;
  remindBeforeMinutes: number;
  startMinutes: number | null;
};

export default function TaskReminderSection({
  onChange,
  remindBeforeMinutes,
  startMinutes,
}: TaskReminderSectionProps) {
  const { impact } = useHaptic();

  if (startMinutes == null) {
    return null;
  }

  return (
    <div className="shrink-0">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] opacity-80">
        <Bell size={12} strokeWidth={3} /> Напомнить
      </div>
      <div className="flex flex-wrap gap-2">
        {REMINDER_OPTIONS.map((option) => {
          const isActive = remindBeforeMinutes === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                impact('light');
                onChange(option);
              }}
              className={cn(
                'h-9 rounded-2xl border px-4 text-[13px] font-bold transition-all duration-200 active:scale-[0.94]',
                isActive
                  ? 'border-[var(--accent)]/60 bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                  : 'border-transparent bg-[var(--surface-2)] text-[var(--ink)] hover:border-[var(--border)]',
              )}
            >
              {option === 0 ? 'В момент' : `За ${option} мин`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
