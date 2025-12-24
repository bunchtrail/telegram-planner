import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "../lib/cn";

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
  const today = new Date();

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 pr-1">
      {weekDays.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);

        return (
          <button
            key={day.toString()}
            type="button"
            onClick={() => onSelectDate(day)}
            aria-pressed={isSelected}
            aria-current={isSelected ? "date" : undefined}
            aria-label={format(day, "EEEE, d MMMM", { locale: ru })}
            className={cn(
              "flex h-[64px] min-w-[52px] flex-col items-center justify-center rounded-2xl border transition-all duration-200",
              isSelected
                ? "scale-105 transform border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_10px_24px_-14px_rgba(23,95,86,0.6)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
            )}
          >
            <span className="text-[10px] font-medium uppercase opacity-80">
              {format(day, "EE", { locale: ru })}
            </span>
            <span
              className={cn(
                "text-lg font-semibold",
                isSelected
                  ? "text-[var(--accent-ink)]"
                  : isToday
                    ? "text-[var(--accent)]"
                    : "text-[var(--ink)]",
              )}
            >
              {format(day, "d")}
            </span>
            {isToday && !isSelected && (
              <div className="mt-1 h-1 w-1 rounded-full bg-[var(--accent)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
