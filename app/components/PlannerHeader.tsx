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
    <header className="relative z-30 flex flex-col glass transition-all shadow-sm ring-1 ring-black/5 rounded-b-[32px]">
      <div className="pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] pt-[calc(max(env(safe-area-inset-top),var(--tg-content-safe-top,0px))+0.75rem)] pb-3">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--accent)] opacity-80">
              {format(selectedDate, "MMMM yyyy", { locale: ru })}
            </p>
            <h1 className="text-[32px] font-bold capitalize text-[var(--ink)] font-[var(--font-display)] leading-[0.95] tracking-tight">
              {format(selectedDate, "EEEE, d", { locale: ru })}
            </h1>
          </div>
          {(hours > 0 || minutes > 0) && (
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 py-1.5 shadow-inner border border-[var(--border)]">
              <Clock size={14} className="text-[var(--accent)]" strokeWidth={2.5} />
              <span className="text-xs font-bold tabular-nums text-[var(--ink)] opacity-90">
                {hours}ч {minutes}м
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                impact("light");
                onPrev();
              }}
              aria-label={prevLabel}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--border)] transition-colors active:scale-95"
            >
              <ChevronLeft size={20} className="opacity-70" />
            </button>
            <button
              type="button"
              onClick={() => {
                impact("light");
                onToday();
              }}
              className="h-10 rounded-2xl bg-[var(--surface-2)] px-5 text-xs font-bold uppercase tracking-wide text-[var(--ink)] hover:bg-[var(--border)] transition-colors active:scale-95"
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
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--border)] transition-colors active:scale-95"
            >
              <ChevronRight size={20} className="opacity-70" />
            </button>
          </div>

          <div className="relative flex rounded-2xl bg-[var(--surface-2)] p-1 shadow-inner">
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
                  "relative z-10 px-4 py-2 text-[12px] font-bold transition-colors duration-200",
                  viewMode === option.id
                    ? "text-[var(--ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]/70",
                )}
              >
                {viewMode === option.id && (
                  <motion.div
                    layoutId="tab"
                    className="absolute inset-0 z-[-1] rounded-[10px] bg-[var(--surface)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
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
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
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
