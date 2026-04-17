'use client';

import { motion } from 'framer-motion';
import { Check, Palette } from 'lucide-react';
import { useHaptic } from '@/app/hooks/useHaptic';
import { TASK_COLOR_OPTIONS } from '@/app/lib/constants';
import { cn } from '@/app/lib/cn';

export type TaskColorSectionProps = {
  color: string;
  onChange: (value: string) => void;
};

export default function TaskColorSection({
  color,
  onChange,
}: TaskColorSectionProps) {
  const { impact } = useHaptic();

  return (
    <div className="shrink-0">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] opacity-80">
        <Palette size={12} strokeWidth={3} /> Цвет задачи
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {TASK_COLOR_OPTIONS.map((option) => {
          const isSelected = color === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                impact('light');
                onChange(option);
              }}
              className={cn(
                'relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full outline-none transition-all duration-300',
                isSelected
                  ? 'scale-[1.15]'
                  : 'opacity-75 hover:scale-105 hover:opacity-100 active:scale-90',
              )}
              style={{
                backgroundColor: option,
                boxShadow: isSelected
                  ? `0 0 0 3px var(--surface), 0 0 0 5px ${option}, 0 6px 16px -4px ${option}60`
                  : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
              }}
              aria-pressed={isSelected}
              aria-label={`Выбрать цвет ${option}`}
            >
              {isSelected ? (
                <motion.span
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }}
                  className="text-white drop-shadow-md"
                >
                  <Check size={20} strokeWidth={3.5} />
                </motion.span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
