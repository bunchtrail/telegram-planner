import { addDays, format, isSameDay, isSameMonth, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";

type MonthGridProps = {
  days: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  taskDates: Set<string>;
};

const formatDateOnly = (value: Date) => format(value, "yyyy-MM-dd");

export default function MonthGrid({
  days,
  selectedDate,
  onSelectDate,
  taskDates,
}: MonthGridProps) {
  const today = new Date();
  const { selection } = useHaptic();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const handleDateClick = (day: Date) => {
    if (!isSameDay(day, selectedDate)) {
      selection();
      onSelectDate(day);
    }
  };

  return (
    <div className="p-1">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)] mb-3 opacity-70">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = addDays(weekStart, i);
          return (
            <span key={format(day, "EEE", { locale: ru })}>
              {format(day, "EE", { locale: ru })}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-y-2 gap-x-1">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const isOutside = !isSameMonth(day, selectedDate);
          const hasTasks = taskDates.has(formatDateOnly(day));

          return (
            <button
              key={formatDateOnly(day)}
              type="button"
              onClick={() => handleDateClick(day)}
              aria-pressed={isSelected}
              aria-current={isSelected ? "date" : undefined}
              aria-label={format(day, "EEEE, d MMMM", { locale: ru })}
              className={cn(
                "relative flex h-10 w-full flex-col items-center justify-center rounded-[12px] text-[14px] transition-all duration-200 active:scale-95 touch-manipulation",
                isSelected
                  ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--shadow-glow)] font-bold z-10"
                  : "text-[var(--ink)] hover:bg-[var(--surface-2)] font-medium",
                isOutside && !isSelected && "text-[var(--muted)] opacity-30",
                !isSelected &&
                isToday &&
                "text-[var(--accent)] ring-2 ring-inset ring-[var(--accent)]/30 bg-[var(--surface)]",
              )}
            >
              <span>{format(day, "d")}</span>

              {hasTasks && !isSelected && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    isOutside ? "bg-[var(--muted)]" : "bg-[var(--accent)]",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
