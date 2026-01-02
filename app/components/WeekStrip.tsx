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
      className="no-scrollbar flex gap-2.5 overflow-x-auto px-1 pb-2 pt-2 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] overscroll-x-contain"
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
              "snap-center flex h-[76px] w-[62px] flex-shrink-0 flex-col items-center justify-center rounded-[24px] transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              isSelected
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--shadow-glow)] scale-105 z-10"
                : "bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-soft)] border border-transparent hover:border-[var(--border)]",
              !isSelected &&
                isToday &&
                "bg-[var(--surface-2)] text-[var(--accent)] font-semibold",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                isSelected ? "opacity-90" : "opacity-60",
              )}
            >
              {format(day, "EE", { locale: ru })}
            </span>
            <span
              className={cn(
                "text-2xl font-bold font-[var(--font-display)]",
                isSelected ? "font-bold" : "font-medium",
              )}
            >
              {format(day, "d")}
            </span>

            {!isSelected && isToday && (
              <div className="mt-1 h-1 w-1 rounded-full bg-[var(--accent)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
