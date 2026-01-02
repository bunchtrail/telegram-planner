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
      className="no-scrollbar flex gap-2 overflow-x-auto px-1 pb-2 pt-2 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] overscroll-x-contain"
    >
      {weekDays.map((day) => {
        const isSelected = isSameDay(day, selectedDate);

        return (
          <button
            key={day.toString()}
            type="button"
            onClick={() => handleDateClick(day)}
            aria-pressed={isSelected}
            aria-current={isSelected ? "date" : undefined}
            aria-label={format(day, "EEEE, d MMMM", { locale: ru })}
            className={cn(
              "snap-center flex h-[72px] w-[60px] flex-shrink-0 flex-col items-center justify-center rounded-[18px] border transition-colors transition-transform duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              isSelected
                ? "scale-105 border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-bold uppercase",
                isSelected ? "opacity-100" : "opacity-60",
              )}
            >
              {format(day, "EE", { locale: ru })}
            </span>
            <span className="text-xl font-bold">{format(day, "d")}</span>
          </button>
        );
      })}
    </div>
  );
}
