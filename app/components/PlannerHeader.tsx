import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock } from "lucide-react";
import WeekStrip from "./WeekStrip";

type PlannerHeaderProps = {
  selectedDate: Date;
  weekDays: Date[];
  hours: number;
  minutes: number;
  onSelectDate: (date: Date) => void;
};

export default function PlannerHeader({
  selectedDate,
  weekDays,
  hours,
  minutes,
  onSelectDate,
}: PlannerHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 pt-6 pb-4 shadow-[0_8px_30px_-20px_rgba(16,12,8,0.35)]">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            {format(selectedDate, "MMMM", { locale: ru })}
          </p>
          <h1 className="text-2xl font-semibold capitalize text-[var(--ink)] font-[var(--font-display)]">
            {format(selectedDate, "EEEE, d", { locale: ru })}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Осталось
          </p>
          <div className="mt-1 flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-sm font-semibold text-[var(--accent-strong)]">
            <Clock size={14} />
            <span>
              {hours}ч {minutes}м
            </span>
          </div>
        </div>
      </div>

      <WeekStrip
        weekDays={weekDays}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </header>
  );
}
