'use client';

import { Clock } from 'lucide-react';
import { useHaptic } from '@/app/hooks/useHaptic';
import { cn } from '@/app/lib/cn';

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export type TaskDurationSectionProps = {
  color: string;
  duration: number;
  onChange: (value: number) => void;
};

export default function TaskDurationSection({
  color,
  duration,
  onChange,
}: TaskDurationSectionProps) {
  const { impact } = useHaptic();

  return (
    <div className="shrink-0">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] opacity-80">
        <Clock size={12} strokeWidth={3} /> Длительность
      </div>

      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS.map((preset) => {
          const isActive = duration === preset;

          return (
            <button
              key={preset}
              type="button"
              onClick={() => {
                if (!isActive) {
                  impact('light');
                }
                onChange(preset);
              }}
              className={cn(
                'h-11 flex-shrink-0 rounded-2xl border px-5 text-[15px] font-bold transition-all duration-200',
                isActive
                  ? 'border-transparent text-white shadow-md'
                  : 'border-transparent bg-[var(--surface-2)] text-[var(--ink)] hover:border-[var(--border)] active:scale-[0.94]',
              )}
              style={
                isActive
                  ? {
                      background: color,
                      boxShadow: `0 4px 14px -4px ${color}60`,
                    }
                  : undefined
              }
            >
              {preset} м
            </button>
          );
        })}
      </div>
    </div>
  );
}
