'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn';

const SLOT_MIN = 15;
const SLOT_PX = 32;
const LABEL_W = 54;

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatMinutes = (value: number) =>
  `${pad2(Math.floor(value / 60))}:${pad2(value % 60)}`;

type TimeGridPickerProps = {
  valueMinutes: number | null;
  durationMinutes: number;
  onChange: (minutes: number) => void;
  defaultMinutes?: number;
};

export default function TimeGridPicker({
  valueMinutes,
  durationMinutes,
  onChange,
  defaultMinutes,
}: TimeGridPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const slots = useMemo(() => {
    const count = (24 * 60) / SLOT_MIN;
    return Array.from({ length: count }, (_, i) => i * SLOT_MIN);
  }, []);

  const selectByClientY = useCallback(
    (clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const y = clientY - rect.top + el.scrollTop;
      const slotIndex = Math.max(
        0,
        Math.min(slots.length - 1, Math.floor(y / SLOT_PX))
      );
      onChange(slots[slotIndex]);
    },
    [onChange, slots]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const now = new Date();
    const currentHourMinutes = now.getHours() * 60;
    const fallbackMinutes = defaultMinutes ?? currentHourMinutes;
    const rawMinutes = valueMinutes ?? fallbackMinutes;
    const targetMinutes = Math.max(0, Math.min(1439, rawMinutes));
    const top = Math.round((targetMinutes / SLOT_MIN) * SLOT_PX - 2.5 * SLOT_PX);
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [defaultMinutes, valueMinutes]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      selectByClientY(event.clientY);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp, { passive: true, once: true });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, selectByClientY]);

  const selectionTop =
    valueMinutes == null ? null : (valueMinutes / SLOT_MIN) * SLOT_PX;
  const selectionHeight = Math.max(
    SLOT_PX,
    (Math.max(SLOT_MIN, durationMinutes) / SLOT_MIN) * SLOT_PX
  );
  const endLabel =
    valueMinutes == null
      ? null
      : formatMinutes(Math.min(24 * 60, valueMinutes + durationMinutes));

  return (
    <div className="w-full h-[260px] flex flex-col select-none">
      <div className="flex items-center justify-between mb-2 px-1 shrink-0">
        <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider opacity-80">
          Начало — Конец
        </div>
        <div className="text-[13px] font-bold tabular-nums text-[var(--ink)]">
          {valueMinutes == null
            ? 'Не выбрано'
            : `${formatMinutes(valueMinutes)} — ${endLabel}`}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full flex-1 overflow-y-auto no-scrollbar rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)]/30 touch-pan-y"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).tagName !== 'BUTTON') {
            setDragging(true);
            selectByClientY(event.clientY);
          }
        }}
      >
        {selectionTop != null && (
          <div
            className="absolute rounded-[8px] border-l-[3px] pointer-events-none z-10 transition-all duration-75 ease-out"
            style={{
              left: LABEL_W,
              right: 4,
              top: selectionTop,
              height: selectionHeight,
              borderColor: 'var(--accent)',
              background:
                'color-mix(in srgb, var(--accent) 12%, transparent)',
            }}
          />
        )}

        <div className="relative py-2 pb-32">
          {slots.map((minutes) => {
            const isHour = minutes % 60 === 0;
            const hour = Math.floor(minutes / 60);
            return (
              <div
                key={minutes}
                className="flex relative items-center"
                style={{ height: SLOT_PX }}
              >
                <div
                  className={cn(
                    'shrink-0 pr-3 text-right tabular-nums flex items-center justify-end select-none transition-colors',
                    isHour
                      ? 'text-[12px] font-bold text-[var(--ink)]'
                      : 'text-[10px] text-[var(--muted)] opacity-40'
                  )}
                  style={{ width: LABEL_W }}
                >
                  {isHour ? `${pad2(hour)}:00` : '·'}
                </div>
                <div
                  className={cn(
                    'absolute left-[54px] right-0 top-0 h-px pointer-events-none',
                    isHour
                      ? 'bg-[var(--border)] opacity-100'
                      : 'bg-[var(--border)] opacity-40'
                  )}
                />
                <button
                  type="button"
                  aria-label={`Выбрать ${pad2(hour)}:${pad2(minutes % 60)}`}
                  className="flex-1 w-full h-full outline-none active:bg-[var(--surface-2)]/50"
                  onClick={() => onChange(minutes)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
