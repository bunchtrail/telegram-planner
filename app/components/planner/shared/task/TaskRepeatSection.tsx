'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Repeat } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useHaptic } from '@/app/hooks/useHaptic';
import { cn } from '@/app/lib/cn';
import type { TaskRepeat } from '@/app/types/task';

const REPEAT_COUNT_MIN = 1;
const REPEAT_COUNT_MAX = 365;
const DEFAULT_REPEAT_COUNT_DAILY = 7;
const DEFAULT_REPEAT_COUNT_WEEKLY = 4;

type TaskSheetMode = 'create' | 'edit';

export type TaskRepeatSectionProps = {
  isDesktop?: boolean;
  mode: TaskSheetMode;
  onRepeatChange: (value: TaskRepeat) => void;
  onRepeatCountChange: (value: number) => void;
  repeat: TaskRepeat;
  repeatCount: number;
};

const clampRepeatCount = (value: number) =>
  Math.min(Math.max(Math.floor(value), REPEAT_COUNT_MIN), REPEAT_COUNT_MAX);

export default function TaskRepeatSection({
  isDesktop = false,
  mode,
  onRepeatChange,
  onRepeatCountChange,
  repeat,
  repeatCount,
}: TaskRepeatSectionProps) {
  const [showOptions, setShowOptions] = useState(
    mode === 'edit' || repeat !== 'none',
  );
  const [detailsHeight, setDetailsHeight] = useState<number | 'auto'>('auto');
  const detailsRef = useRef<HTMLDivElement>(null);
  const { impact } = useHaptic();
  const prefersReducedMotion = useReducedMotion();
  const isDetailsVisible = isDesktop || showOptions;

  const repeatCountLabel =
    repeat === 'weekly' ? 'На сколько недель' : 'На сколько дней';

  useLayoutEffect(() => {
    if (!showOptions && !isDesktop) return;

    const element = detailsRef.current;
    if (!element) return;

    const updateHeight = () => setDetailsHeight(element.scrollHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isDesktop, repeat, repeatCount, showOptions]);

  return (
    <div className="shrink-0">
      <div
        className="overflow-hidden rounded-[24px] border transition-colors duration-200"
        style={{
          background:
            repeat !== 'none'
              ? 'color-mix(in srgb, var(--accent) 4%, var(--surface-2))'
              : 'color-mix(in srgb, var(--surface-2) 40%, transparent)',
          borderColor:
            repeat !== 'none'
              ? 'color-mix(in srgb, var(--accent) 20%, var(--border))'
              : 'color-mix(in srgb, var(--border) 50%, transparent)',
        }}
      >
        <button
          type="button"
          onClick={() => setShowOptions((current) => !current)}
          className="group flex w-full items-center justify-between p-4 transition-colors active:bg-[var(--surface-2)]"
          aria-expanded={isDetailsVisible}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                repeat !== 'none'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                  : 'border border-[var(--border)]/50 bg-[var(--surface)] text-[var(--muted)]',
              )}
            >
              <Repeat size={20} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[16px] font-bold text-[var(--ink)]">
                Повторение
              </span>
              <span
                className={cn(
                  'text-[13px] font-medium transition-colors',
                  repeat !== 'none'
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--muted)]',
                )}
              >
                {repeat === 'none'
                  ? 'Одноразовая задача'
                  : repeat === 'daily'
                    ? 'Ежедневно'
                    : 'Еженедельно'}
              </span>
            </div>
          </div>
          {!isDesktop ? (
            <ChevronRight
              size={20}
              className={cn(
                'text-[var(--muted)] transition-transform duration-300',
                showOptions && 'rotate-90',
              )}
            />
          ) : null}
        </button>

        <motion.div
          initial={isDesktop ? false : undefined}
          animate={{
            height: isDesktop ? 'auto' : showOptions ? detailsHeight : 0,
            opacity: isDesktop ? 1 : showOptions ? 1 : 0,
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.18, ease: 'easeOut' }
          }
          className="overflow-hidden"
          aria-hidden={!isDetailsVisible}
          inert={!isDetailsVisible}
          style={{
            pointerEvents: isDetailsVisible ? 'auto' : 'none',
          }}
        >
          <div ref={detailsRef} className="space-y-4 px-4 pb-4 pt-2">
            <div className="relative z-0 flex rounded-[14px] bg-[var(--surface-2)] p-1">
              {[
                { id: 'none', label: 'Нет' },
                { id: 'daily', label: 'День' },
                { id: 'weekly', label: 'Неделя' },
              ].map((option) => {
                const isActive = repeat === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      impact('light');
                      onRepeatChange(option.id as TaskRepeat);
                      if (option.id !== 'none' && repeatCount < 1) {
                        onRepeatCountChange(
                          option.id === 'weekly'
                            ? DEFAULT_REPEAT_COUNT_WEEKLY
                            : DEFAULT_REPEAT_COUNT_DAILY,
                        );
                      }
                    }}
                    className={cn(
                      'relative z-10 flex-1 rounded-[10px] py-2.5 text-[13px] font-bold transition-colors',
                      isActive
                        ? 'text-[var(--ink)]'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]',
                    )}
                  >
                    {isActive ? (
                      <motion.div
                        layoutId="task-repeat-tab"
                        className="absolute inset-0 -z-10 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                        transition={{
                          type: 'spring',
                          bounce: prefersReducedMotion ? 0 : 0.2,
                          duration: prefersReducedMotion ? 0 : 0.4,
                        }}
                      />
                    ) : null}
                    {option.label}
                  </button>
                );
              })}
            </div>

            {repeat !== 'none' ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between px-1"
              >
                <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  {repeatCountLabel}
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      impact('light');
                      onRepeatCountChange(
                        clampRepeatCount(repeatCount - 1),
                      );
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xl font-medium text-[var(--ink)] transition-all hover:bg-[var(--surface-2)] active:scale-[0.88]"
                    aria-label="Уменьшить количество повторов"
                  >
                    -
                  </button>
                  <span className="min-w-[32px] text-center text-[17px] font-bold tabular-nums text-[var(--ink)]">
                    {repeatCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      impact('light');
                      onRepeatCountChange(
                        clampRepeatCount(repeatCount + 1),
                      );
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xl font-medium text-[var(--ink)] transition-all hover:bg-[var(--surface-2)] active:scale-[0.88]"
                    aria-label="Увеличить количество повторов"
                  >
                    +
                  </button>
                </div>
              </motion.div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
