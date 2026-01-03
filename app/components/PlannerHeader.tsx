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
  const isToday =
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <header className="relative z-30 flex flex-col glass rounded-b-[32px] shadow-[var(--shadow-soft)] transition-all">
      <div className="pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] pt-[calc(max(env(safe-area-inset-top),var(--tg-content-safe-top,0px))+var(--tma-tg-controls-top,0px)+1rem)] pb-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={() => {
                impact("light");
                onPrev();
              }}
              className="p-1.5 rounded-xl hover:bg-[var(--border)] text-[var(--muted)] active:scale-90 transition-all"
              aria-label="Назад"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              className="flex flex-col items-start px-1.5 cursor-pointer active:opacity-60 transition-opacity text-left min-w-0"
              onClick={() => {
                impact("light");
                onToday();
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] leading-none mb-0.5 ml-[1px]">
                {format(selectedDate, "LLLL", { locale: ru })}
              </span>
              <div className="flex items-center gap-1.5 w-full">
                <h1 className="text-[19px] font-bold capitalize text-[var(--ink)] font-[var(--font-display)] leading-none tracking-tight truncate">
                  {format(selectedDate, "d, EEEE", { locale: ru })}
                </h1>
                {isToday && (
                  <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-[var(--accent)] mt-0.5" />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                impact("light");
                onNext();
              }}
              className="p-1.5 rounded-xl hover:bg-[var(--border)] text-[var(--muted)] active:scale-90 transition-all"
              aria-label="Вперед"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex bg-[var(--surface-2)] p-0.5 rounded-[12px] h-9 border border-[var(--border)]/50">
              {(["week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    if (viewMode !== mode) {
                      impact("light");
                      onViewModeChange(mode);
                    }
                  }}
                  className={cn(
                    "relative px-3 text-[11px] font-bold rounded-[10px] transition-all z-10",
                    viewMode === mode
                      ? "text-[var(--ink)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]",
                  )}
                  aria-pressed={viewMode === mode}
                >
                  {viewMode === mode && (
                    <motion.div
                      layoutId="view-tab"
                      className="absolute inset-0 bg-[var(--surface)] shadow-sm rounded-[10px] -z-10 border border-[var(--border)]/50"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  {mode === "week" ? "Нед" : "Мес"}
                </button>
              ))}
            </div>

            {(hours > 0 || minutes > 0) && (
              <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-[12px] bg-[var(--surface-2)] border border-[var(--border)]/50">
                <Clock
                  size={13}
                  className="text-[var(--accent)]"
                  strokeWidth={2.5}
                />
                <span className="text-[11px] font-bold tabular-nums text-[var(--ink)] pt-[1px]">
                  {hours > 0 ? `${hours}ч` : `${minutes}м`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <motion.div
        layout
        className="overflow-hidden"
        transition={{ type: "spring", stiffness: 450, damping: 35 }}
      >
        <div className="pl-[max(0.5rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] pb-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, height: viewMode === "week" ? 64 : 280 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0 }}
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
