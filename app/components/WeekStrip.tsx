import { useEffect, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";

type WeekStripProps = {
  weekDays: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export default function WeekStrip({
  weekDays,
  selectedDate,
  onSelectDate,
}: WeekStripProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { selection } = useHaptic();

  useEffect(() => {
    const selectedButton = scrollContainerRef.current?.querySelector(
      'button[aria-pressed="true"]',
    );
    if (selectedButton) {
      selectedButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedDate]);

  const handleDateClick = (day: Date) => {
    if (!isSameDay(day, selectedDate)) {
      selection();
      onSelectDate(day);
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      className="no-scrollbar flex justify-between gap-1 overflow-x-auto px-2 pt-1 select-none snap-x snap-mandatory overscroll-x-contain [-webkit-overflow-scrolling:touch]"
    >
      {weekDays.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());

        return (
          <button
            key={day.toString()}
            type="button"
            onClick={() => handleDateClick(day)}
            aria-pressed={isSelected}
            aria-current={isSelected ? "date" : undefined}
            aria-label={format(day, "EEEE, d MMMM", { locale: ru })}
            className={cn(
              "snap-center relative flex h-[56px] flex-1 min-w-[42px] max-w-[58px] flex-col items-center justify-center rounded-[18px] transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] touch-manipulation",
              isSelected
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--shadow-glow)] z-10 scale-100"
                : "bg-transparent text-[var(--muted)] hover:bg-[var(--surface-2)] active:scale-95",
              !isSelected &&
                isToday &&
                "text-[var(--accent)] bg-[var(--surface)] ring-1 ring-inset ring-[var(--accent)]/40 font-medium",
            )}
          >
            <span
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider mb-0.5 transition-opacity",
                isSelected ? "opacity-100" : "opacity-60",
              )}
            >
              {format(day, "EE", { locale: ru })}
            </span>
            <span
              className={cn(
                "text-[18px] font-[var(--font-display)] leading-none",
                isSelected ? "font-bold" : "font-medium",
              )}
            >
              {format(day, "d")}
            </span>

            {!isSelected && isToday && (
              <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[var(--accent)]" />
            )}

            {isSelected && isToday && (
              <div className="absolute bottom-1 h-0.5 w-3 rounded-full bg-white/60" />
            )}
          </button>
        );
      })}
    </div>
  );
}
