import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import MonthGrid from "./MonthGrid";
import WeekStrip from "./WeekStrip";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";

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
  const { impact } = useHaptic();
  const prevLabel =
    viewMode === "month" ? "Предыдущий месяц" : "Предыдущая неделя";
  const nextLabel =
    viewMode === "month" ? "Следующий месяц" : "Следующая неделя";
  const viewOptions: Array<{ id: PlannerViewMode; label: string }> = [
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
  ];

  return (
    <header className="relative z-30 flex flex-col glass rounded-b-[36px] shadow-sm transition-all">
      <div className="pl-[max(1.25rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] pt-[calc(max(env(safe-area-inset-top),var(--tg-content-safe-top,0px))+1rem)] pb-2">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex-1 min-w-0">
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--accent)] opacity-90">
              {format(selectedDate, "LLLL yyyy", { locale: ru })}
            </p>
            <h1 className="text-[32px] font-bold capitalize text-[var(--ink)] font-[var(--font-display)] leading-[1] tracking-tight truncate">
              {format(selectedDate, "EEEE, d", { locale: ru })}
            </h1>
          </div>

          {(hours > 0 || minutes > 0) && (
            <div className="flex-none flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] pl-2 pr-3 py-1.5 border border-[var(--border)]">
              <Clock size={14} className="text-[var(--accent)]" strokeWidth={2.5} />
              <span className="text-[13px] font-bold tabular-nums text-[var(--ink)]">
                {hours > 0 && `${hours}ч `}
                {minutes}м
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                impact("light");
                onPrev();
              }}
              aria-label={prevLabel}
              className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--border)] transition-colors active:scale-95"
            >
              <ChevronLeft size={20} className="opacity-60" />
            </button>
            <button
              type="button"
              onClick={() => {
                impact("light");
                onToday();
              }}
              className="h-10 rounded-[14px] bg-[var(--surface-2)] px-4 text-[11px] font-bold uppercase tracking-wide text-[var(--ink)] hover:bg-[var(--border)] transition-colors active:scale-95"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => {
                impact("light");
                onNext();
              }}
              aria-label={nextLabel}
              className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--border)] transition-colors active:scale-95"
            >
              <ChevronRight size={20} className="opacity-60" />
            </button>
          </div>

          <div className="relative flex rounded-[14px] bg-[var(--surface-2)] p-1">
            {viewOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  impact("light");
                  onViewModeChange(option.id);
                }}
                aria-pressed={viewMode === option.id}
                className={cn(
                  "relative z-10 px-3.5 py-1.5 text-[12px] font-bold transition-colors duration-200",
                  viewMode === option.id
                    ? "text-[var(--ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                )}
              >
                {viewMode === option.id && (
                  <motion.div
                    layoutId="tab"
                    className="absolute inset-0 z-[-1] rounded-[10px] bg-[var(--surface)] shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        layout
        className="overflow-hidden"
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
      >
        <div className="pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] pb-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </header>
  );
}
