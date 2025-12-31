import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import MonthGrid from "./MonthGrid";
import WeekStrip from "./WeekStrip";
import { cn } from "../lib/cn";

type PlannerViewMode = "week" | "month";

type PlannerHeaderProps = {
  selectedDate: Date;
  weekDays: Date[];
  monthDays: Date[];
  taskDates: Set<string>;
  viewMode: PlannerViewMode;
  hours: number;
  minutes: number;
  onSelectDate: (date: Date) => void;
  onViewModeChange: (mode: PlannerViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export default function PlannerHeader({
  selectedDate,
  weekDays,
  monthDays,
  taskDates,
  viewMode,
  hours,
  minutes,
  onSelectDate,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
}: PlannerHeaderProps) {
  const prevLabel =
    viewMode === "month" ? "Предыдущий месяц" : "Предыдущая неделя";
  const nextLabel =
    viewMode === "month" ? "Следующий месяц" : "Следующая неделя";
  const viewOptions: Array<{ id: PlannerViewMode; label: string }> = [
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-glass)] px-4 pt-6 pb-4 shadow-[var(--shadow-soft)] backdrop-blur-[12px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            {format(selectedDate, "MMMM yyyy", { locale: ru })}
          </p>
          <h1 className="text-2xl font-semibold capitalize text-[var(--ink)] font-[var(--font-display)]">
            {format(selectedDate, "EEEE, d", { locale: ru })}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Осталось
          </p>
          <div className="mt-1 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1.5 text-[13px] font-semibold text-[var(--accent-strong)] shadow-[0_10px_20px_-16px_rgba(176,106,63,0.35)]">
            <Clock size={14} />
            <span>
              {hours}ч {minutes}м
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            aria-label={prevLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-2)] hover:text-[var(--accent-strong)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:bg-[var(--surface)] hover:text-[var(--ink)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label={nextLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-2)] hover:text-[var(--accent-strong)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1 shadow-[0_10px_20px_-16px_rgba(60,43,30,0.3)]">
          {viewOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onViewModeChange(option.id)}
              aria-pressed={viewMode === option.id}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                viewMode === option.id
                  ? "bg-[var(--surface)] text-[var(--accent-strong)] shadow-[0_10px_20px_-16px_rgba(60,43,30,0.35)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "week" ? (
        <WeekStrip
          weekDays={weekDays}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />
      ) : (
        <MonthGrid
          days={monthDays}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          taskDates={taskDates}
        />
      )}
    </header>
  );
}
