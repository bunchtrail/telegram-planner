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
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        {weekDayLabels.map((day) => (
          <span key={format(day, "EEE", { locale: ru })}>
            {format(day, "EE", { locale: ru })}
          </span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
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
                "relative flex h-11 flex-col items-center justify-center rounded-2xl border text-sm font-semibold transition-colors transition-transform duration-200 touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--shadow-soft)]"
                  : "border-transparent text-[var(--ink)] [@media(hover:hover)]:hover:border-[var(--accent)] [@media(hover:hover)]:hover:bg-[var(--surface-2)]",
                isOutside && !isSelected && "text-[var(--muted)] opacity-70",
                isToday &&
                  !isSelected &&
                  "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]",
              )}
            >
              <span>{format(day, "d")}</span>
              {hasTasks && (
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 rounded-full",
                    isSelected
                      ? "bg-[var(--accent-ink)]"
                      : isOutside
                        ? "bg-[var(--border)]"
                        : "bg-[var(--accent)]",
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
