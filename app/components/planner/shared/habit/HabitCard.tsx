'use client';

import { useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/app/lib/cn';
import type { Habit } from '@/app/types/habit';
import HabitWeekGrid from './HabitWeekGrid';

type HabitCardProps = {
  habit: Habit;
  isChecked: (habitId: string, date: string) => boolean;
  isDeleting: boolean;
  isLogPending?: (habitId: string, date: string) => boolean;
  onDelete: (habitId: string) => void;
  onToggleLog: (habitId: string, date: string) => void;
  weekDays: Date[];
};

export default function HabitCard({
  habit,
  isChecked,
  isDeleting,
  isLogPending,
  onDelete,
  onToggleLog,
  weekDays,
}: HabitCardProps) {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const checked = isChecked(habit.id, todayKey);
  const pending = isLogPending?.(habit.id, todayKey) ?? false;

  const reduceMotion = Boolean(useReducedMotion());

  // Calculate streak (consecutive days ending today/yesterday)
  const streak = useMemo(() => {
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = format(d, 'yyyy-MM-dd');
      if (isChecked(habit.id, key)) {
        count++;
      } else if (i === 0) {
        continue; // today might not be done yet
      } else {
        break;
      }
    }
    return count;
  }, [habit.id, isChecked]);

  const habitColor = habit.color || 'var(--accent)';

  // Long press to trigger delete mode
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handlePressStart = useCallback(() => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onDelete(habit.id);
    }, 600);
  }, [habit.id, onDelete]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePressCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressCancel}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressCancel}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'rounded-[20px] border transition-all duration-300 select-none',
        checked
          ? 'border-transparent'
          : 'border-[rgba(0,0,0,0.04)]',
      )}
      style={{
        background: checked
          ? `linear-gradient(135deg, color-mix(in srgb, ${habitColor} 6%, var(--surface)) 0%, var(--surface) 60%)`
          : 'var(--surface)',
        boxShadow:
          '0 0.5px 1px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        padding: '16px 18px',
      }}
    >
      {/* Top row: emoji + info + toggle */}
      <div className="flex items-center gap-3.5">
        {/* Big emoji */}
        <div
          className={cn(
            'w-12 h-12 min-w-12 rounded-[14px] flex items-center justify-center text-[26px] transition-all duration-300',
            checked && 'scale-105',
          )}
          style={{
            background: checked
              ? `color-mix(in srgb, ${habitColor} 15%, var(--surface-2, #f5f5f7))`
              : `color-mix(in srgb, ${habitColor} 10%, var(--surface-2, #f5f5f7))`,
          }}
        >
          {habit.icon}
        </div>

        {/* Name + streak */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-[16px] font-bold text-[var(--ink)] truncate leading-tight tracking-[-0.01em]">
            {habit.name}
          </span>
          <div className="flex items-center gap-1.5">
            {streak > 0 ? (
              <span className="text-[12px] font-bold rounded-lg px-2 py-0.5 inline-flex items-center gap-0.5"
                style={{ color: '#c26900', background: 'rgba(255,149,0,0.12)' }}>
                <span className="text-[11px]">🔥</span>
                <span className="tabular-nums">{streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}</span>
              </span>
            ) : (
              <span className="text-[12px] font-medium rounded-lg px-2 py-0.5"
                style={{ color: 'var(--muted)', background: 'rgba(0,0,0,0.04)' }}>
                Нет серии
              </span>
            )}
          </div>
        </div>

        {/* Toggle */}
        <motion.button
          whileTap={reduceMotion ? undefined : { scale: 0.8 }}
          disabled={pending}
          onClick={() => onToggleLog(habit.id, todayKey)}
          className={cn(
            'w-12 h-12 min-w-12 rounded-full flex items-center justify-center transition-all duration-300 shrink-0',
            checked
              ? 'border-transparent'
              : 'border-[2.5px] border-[rgba(0,0,0,0.1)] bg-transparent',
          )}
          style={
            checked
              ? {
                  backgroundColor: habitColor,
                  color: habitColor,
                  boxShadow: `0 2px 8px -2px ${habitColor}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                }
              : undefined
          }
          aria-label={`Отметить: ${habit.name}`}
        >
          <Check
            size={20}
            strokeWidth={3}
            className={cn(
              'text-white transition-all duration-300',
              checked ? 'opacity-100 scale-100' : 'opacity-0 scale-0',
            )}
          />
        </motion.button>
      </div>

      {/* Week bar — always visible */}
      <div className="mt-3.5 pt-3 border-t border-[rgba(0,0,0,0.04)]">
        <HabitWeekGrid
          color={habitColor}
          days={weekDays}
          habitId={habit.id}
          habitName={habit.name}
          isChecked={isChecked}
          isPending={isLogPending}
          onToggle={onToggleLog}
        />
      </div>

      {/* Delete button */}
      <AnimatePresence>
        {isDeleting && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
          className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.04)]"
        >
          <button
            onClick={() => onDelete(habit.id)}
            className="flex items-center gap-2 text-[13px] font-semibold text-[var(--danger)] w-full justify-center py-1"
          >
            <Trash2 size={14} />
            Удалить привычку
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
