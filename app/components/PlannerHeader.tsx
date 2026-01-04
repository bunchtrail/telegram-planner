import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Flame } from "lucide-react";
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
  onOpenStats: () => void;
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
  onOpenStats,
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
            {/* Top Row: Navigation and Title */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  impact("light");
                  onPrev();
                }}
                className="p-2 rounded-xl hover:bg-[var(--border)] text-[var(--muted)] active:scale-90 transition-all flex-shrink-0"
                aria-label="Назад"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    impact("light");
                    onToday();
                  }}
                  className="flex flex-col items-center active:opacity-60 transition-opacity"
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] leading-none mb-1">
                    <span>{format(selectedDate, "LLLL", { locale: ru })}</span>
                    {hasTime && (
                      <div className="flex items-center gap-1 text-[var(--accent)]">
                        <span className="w-0.5 h-0.5 rounded-full bg-[var(--muted)]" />
                        <Clock size={10} strokeWidth={3} />
                        <span className="whitespace-nowrap">
                          {hours > 0 ? `${hours}ч` : ""} {" "}
                          {minutes > 0 ? `${minutes}м` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                  <h1 className="text-[20px] font-bold capitalize text-[var(--ink)] font-[var(--font-display)] leading-none tracking-tight truncate max-w-full">
                    {format(selectedDate, "d, EEEE", { locale: ru })}
                  </h1>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  impact("light");
                  onNext();
                }}
                className="p-2 rounded-xl hover:bg-[var(--border)] text-[var(--muted)] active:scale-90 transition-all flex-shrink-0"
                aria-label="Вперед"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Bottom Row: Controls */}
            <div className="flex items-center justify-between gap-3 mb-2 px-1">
              <div className="flex items-center gap-2">
                {totalCount > 0 && (
                  <div className="flex items-center gap-2 bg-[var(--surface-2)] pl-2 pr-3 py-1 rounded-[12px]">
                    <div className="relative w-5 h-5 flex-shrink-0">
                      <ProgressRing
                        radius={10}
                        stroke={2.5}
                        progress={progressPercentage}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-[var(--ink)] tabular-nums">
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                )}
                {isToday && totalCount === 0 && (
                  <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    impact("light");
                    onOpenStats();
                  }}
                  aria-label="Открыть статистику"
                  className="h-9 w-9 rounded-[12px] border border-[var(--border)]/50 bg-[var(--surface-2)] text-[var(--accent)] flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Flame size={18} />
                </button>

                <div className="flex bg-[var(--surface-2)] p-1 rounded-[12px] h-9 border-none">
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
                        "relative px-3 text-[13px] font-semibold rounded-[9px] transition-all z-10 flex-1",
                        viewMode === mode
                          ? "text-[var(--ink)]"
                          : "text-[var(--muted)]",
                      )}
                      aria-pressed={viewMode === mode}
                    >
                      {viewMode === mode && (
                        <motion.div
                          layoutId="view-tab"
                          className="absolute inset-0 bg-[var(--surface)] shadow-[var(--shadow-segment)] rounded-[9px] -z-10"
                          transition={{
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.4,
                          }}
                        />
                      )}
                      {mode === "week" ? "Неделя" : "Месяц"}
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
