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
  const weekDayLabels = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i),
  );

  const handleDateClick = (day: Date) => {
    if (!isSameDay(day, selectedDate)) {
      selection();
      onSelectDate(day);
    }
  };

  return (
    <div className="p-1">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-3">
        {weekDayLabels.map((day) => (
          <span key={format(day, "EEE", { locale: ru })}>
            {format(day, "EE", { locale: ru })}
          </span>
        ))}
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
                "relative flex h-10 w-full flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 touch-manipulation active:scale-[0.9]",
                isSelected
                  ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--shadow-glow)] z-10"
                  : "text-[var(--ink)] hover:bg-[var(--surface-2)]",
                isOutside && !isSelected && "text-[var(--muted)] opacity-50",
                isToday &&
                  !isSelected &&
                  "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
              )}
            >
              <span className={cn(isSelected && "font-bold")}>
                {format(day, "d")}
              </span>
              {hasTasks && !isSelected && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    isOutside ? "bg-[var(--border)]" : "bg-[var(--accent)]/60",
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
