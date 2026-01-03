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
  completedCount: number;
  totalCount: number;
  onSelectDate: (date: Date) => void;
  onViewModeChange: (mode: PlannerViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

function ProgressRing({
  radius,
  stroke,
  progress,
}: {
  radius: number;
  stroke: number;
  progress: number;
}) {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" aria-hidden>
      <svg
        height={radius * 2}
        width={radius * 2}
        className="rotate-[-90deg] transition-all duration-500"
      >
        <circle
          stroke="var(--border)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="opacity-50"
        />
        <circle
          stroke="var(--accent)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-500 ease-out"
        />
      </svg>
    </div>
  );
}

export default function PlannerHeader({
  selectedDate,
  weekDays,
  monthDays,
  taskDates,
  viewMode,
  hours,
  minutes,
  completedCount,
  totalCount,
  onSelectDate,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
}: PlannerHeaderProps) {
  const { impact } = useHaptic();
  const isToday =
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const hasTime = hours > 0 || minutes > 0;
  const progressPercentage =
    totalCount > 0 ? Math.min(100, (completedCount / totalCount) * 100) : 0;

  return (
    <header className="relative z-30 flex flex-col transition-all">
      <div className="absolute inset-0 rounded-b-[32px] shadow-[var(--shadow-soft)] pointer-events-none" />

      <div className="relative flex flex-col rounded-b-[32px] overflow-hidden glass-clip">
        <div aria-hidden className="absolute inset-0 glass pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          <div className="pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] pt-[calc(max(env(safe-area-inset-top),var(--tg-content-safe-top,0px))+var(--tma-tg-controls-top,0px)+1rem)] pb-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1 min-w-0 flex-1 mr-2">
                <button
                  type="button"
                  onClick={() => {
                    impact("light");
                    onPrev();
                  }}
                  className="p-1.5 rounded-xl hover:bg-[var(--border)] text-[var(--muted)] active:scale-90 transition-all flex-shrink-0"
                  aria-label="Назад"
                >
                  <ChevronLeft size={22} />
                </button>

                <button
                  type="button"
                  className="flex flex-col items-start px-1.5 cursor-pointer active:opacity-60 transition-opacity text-left min-w-0 overflow-hidden"
                  onClick={() => {
                    impact("light");
                    onToday();
                  }}
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] leading-none mb-0.5 ml-[1px] whitespace-nowrap">
                    <span>{format(selectedDate, "LLLL", { locale: ru })}</span>
                    {hasTime && (
                      <motion.div
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1 text-[var(--accent)]"
                      >
                        <span className="w-0.5 h-0.5 rounded-full bg-[var(--muted)]" />
                        <Clock size={10} strokeWidth={3} />
                        <span>
                          {hours > 0 ? `${hours}ч` : ""}{" "}
                          {minutes > 0 ? `${minutes}м` : ""}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <h1 className="text-[19px] font-bold capitalize text-[var(--ink)] font-[var(--font-display)] leading-none tracking-tight truncate">
                      {format(selectedDate, "d, EEEE", { locale: ru })}
                    </h1>
                    {totalCount > 0 && (
                      <div className="relative w-4 h-4 ml-1 flex-shrink-0">
                        <ProgressRing
                          radius={9}
                          stroke={2.5}
                          progress={progressPercentage}
                        />
                        {completedCount === totalCount && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full shadow-[0_0_8px_var(--accent)]" />
                          </motion.div>
                        )}
                      </div>
                    )}
                    {isToday && totalCount === 0 && (
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
                  className="p-1.5 rounded-xl hover:bg-[var(--border)] text-[var(--muted)] active:scale-90 transition-all flex-shrink-0"
                  aria-label="Вперед"
                >
                  <ChevronRight size={22} />
                </button>
              </div>

              <div className="flex-shrink-0">
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
                        "relative px-3 text-[11px] font-bold rounded-[10px] transition-all z-10 w-[42px]",
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
                          transition={{
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.4,
                          }}
                        />
                      )}
                      {mode === "week" ? "Нед" : "Мес"}
                    </button>
                  ))}
                </div>
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
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
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
        </div>
      </div>
    </header>
  );
}
