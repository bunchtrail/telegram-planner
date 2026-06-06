'use client';

import { useRef } from 'react';
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

// Extract first emoji/grapheme from a string
function extractEmoji(str: string): string | null {
  if (!str) return null;
  // Use Intl.Segmenter if available (modern browsers)
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('ru', { granularity: 'grapheme' });
    const segments = segmenter.segment(str);
    for (const seg of segments) {
      // Check if the segment contains an emoji
      const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u;
      if (emojiRegex.test(seg.segment)) {
        return seg.segment;
      }
    }
  }
  // Fallback: try regex
  const match = str.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Emoji_Component}]*)/u);
  return match ? match[0] : null;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const isCustom = !options.includes(value as (typeof HABIT_ICON_OPTIONS)[number]);

  const handleCustomInput = (text: string) => {
    const emoji = extractEmoji(text);
    if (emoji) {
      onChange(emoji);
      // Clear the input after extracting emoji
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div
      role="group"
      aria-labelledby={ariaLabelledBy}
      className={cn('flex flex-col gap-2.5', className)}
    >
      {/* Predefined emoji grid */}
      <div className="flex flex-wrap gap-2">
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

      {/* Custom emoji input */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition-all',
            isCustom
              ? 'scale-110 bg-[var(--accent)]/15 ring-2 ring-[var(--accent)]'
              : 'bg-[var(--surface-2)]',
          )}
        >
          {isCustom ? value : '✨'}
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Или введи свой эмодзи"
          inputMode="text"
          autoComplete="off"
          onInput={(e) => {
            const target = e.target as HTMLInputElement;
            handleCustomInput(target.value);
          }}
          onFocus={(e) => {
            const target = e.target;
            window.setTimeout(() => {
              target.scrollIntoView?.({
                behavior: 'smooth',
                block: 'center',
              });
            }, 300);
          }}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] transition-colors"
        />
      </div>
    </div>
  );
}
