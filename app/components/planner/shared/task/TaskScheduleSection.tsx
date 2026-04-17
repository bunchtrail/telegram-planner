'use client';

import { isSameDay } from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Clock } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useHaptic } from '@/app/hooks/useHaptic';
import { cn } from '@/app/lib/cn';
import TimeGridPicker from '@/app/components/TimeGridPicker';

export type TaskScheduleSectionProps = {
  color: string;
  duration: number;
  isDesktop?: boolean;
  onChange: (value: number | null) => void;
  startMinutes: number | null;
  taskDate: Date;
};

const formatMinutes = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(
    value % 60,
  ).padStart(2, '0')}`;

export default function TaskScheduleSection({
  color,
  duration,
  isDesktop = false,
  onChange,
  startMinutes,
  taskDate,
}: TaskScheduleSectionProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [detailsHeight, setDetailsHeight] = useState<number | 'auto'>('auto');
  const detailsRef = useRef<HTMLDivElement>(null);
  const { impact } = useHaptic();
  const prefersReducedMotion = useReducedMotion();

  const now = new Date();
  const defaultPickerMinutes = isSameDay(taskDate, now)
    ? now.getHours() * 60
    : 12 * 60;

  useLayoutEffect(() => {
    if (!showPicker && !isDesktop) return;

    const element = detailsRef.current;
    if (!element) return;

    const updateHeight = () => setDetailsHeight(element.scrollHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [duration, isDesktop, showPicker]);

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] opacity-80">
          <Clock size={12} strokeWidth={3} /> Время начала
        </div>
        {startMinutes != null ? (
          <button
            type="button"
            onClick={() => {
              impact('medium');
              onChange(null);
              setShowPicker(false);
            }}
            className="rounded-lg border border-[var(--danger)]/15 bg-[var(--danger)]/8 px-2.5 py-1 text-[11px] font-bold uppercase text-[var(--danger)] transition-transform active:scale-95"
          >
            Сбросить
          </button>
        ) : null}
      </div>

      <div
        className="overflow-hidden rounded-[24px] border transition-colors duration-200"
        style={{
          background:
            startMinutes != null
              ? `color-mix(in srgb, ${color} 4%, var(--surface-2))`
              : 'color-mix(in srgb, var(--surface-2) 50%, transparent)',
          borderColor:
            startMinutes != null
              ? `color-mix(in srgb, ${color} 20%, var(--border))`
              : 'color-mix(in srgb, var(--border) 50%, transparent)',
        }}
      >
        <button
          type="button"
          onClick={() => setShowPicker((current) => !current)}
          className={cn(
            'flex w-full items-center justify-between p-4 transition-colors',
            showPicker || isDesktop
              ? 'bg-transparent'
              : 'active:bg-[var(--surface-2)]/50',
          )}
          aria-expanded={isDesktop || showPicker}
        >
          <span
            className="text-[17px] font-bold tabular-nums transition-colors"
            style={{
              color: startMinutes != null ? color : 'var(--muted)',
            }}
          >
            {startMinutes != null ? formatMinutes(startMinutes) : 'Без времени'}
          </span>
          {!isDesktop ? (
            <span
              className={cn(
                'flex items-center gap-1 text-[12px] font-bold transition-transform',
                showPicker ? 'text-[var(--muted)]' : 'text-[var(--accent)]',
              )}
            >
              {showPicker ? 'Свернуть' : 'Выбрать'}
              <ChevronRight
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  showPicker ? '-rotate-90' : 'rotate-90',
                )}
              />
            </span>
          ) : null}
        </button>

        <motion.div
          initial={isDesktop ? false : undefined}
          animate={{
            height: isDesktop ? 'auto' : showPicker ? detailsHeight : 0,
          }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }
          }
          className="overflow-hidden"
        >
          <div
            ref={detailsRef}
            className="border-t border-[var(--border)]/30 p-4 pt-0"
            onPointerDown={() => impact('light')}
          >
            <TimeGridPicker
              valueMinutes={startMinutes}
              durationMinutes={duration}
              defaultMinutes={defaultPickerMinutes}
              onChange={onChange}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
