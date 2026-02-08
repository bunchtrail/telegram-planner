"use client";

import {
  type AnimationDefinition,
  type PanInfo,
  type Transition,
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import { ChevronRight, Clock, Repeat, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, format, getDay, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";
import type { TaskSeriesRow } from "../hooks/usePlanner";
import { isIOSDevice } from "../lib/platform";

const SHEET_TRANSITION = {
    type: "spring",
    damping: 32,
    stiffness: 400,
    mass: 1,
} satisfies Transition;

const MODAL_TRANSITION = {
  type: "spring",
  damping: 25,
  stiffness: 300,
} satisfies Transition;

const UPCOMING_OCCURRENCES_COUNT = 7;
const WEEKDAY_SHORT_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;

type ConfirmAction =
  | { type: "delete-series"; seriesId: string; title: string }
  | { type: "skip-date"; seriesId: string; date: Date; title: string };

type RecurringTasksSheetProps = {
  onClose: () => void;
  recurringTasks: TaskSeriesRow[];
  onDeleteSeries: (id: string) => void;
  onSkipDate: (seriesId: string, date: Date) => void;
  isDesktop?: boolean;
};

const getSeriesWord = (count: number) => {
  const abs = Math.abs(count);
  const mod100 = abs % 100;
  const mod10 = abs % 10;

  if (mod100 >= 11 && mod100 <= 14) return "серий";
  if (mod10 === 1) return "серия";
  if (mod10 >= 2 && mod10 <= 4) return "серии";
  return "серий";
};

const formatSeriesCountLabel = (count: number) =>
  `${count} ${getSeriesWord(count)}`;

const formatStartTime = (startMinutes?: number | string | null) => {
  if (startMinutes == null) return "Весь день";
  const parsed =
    typeof startMinutes === "string" ? Number(startMinutes) : startMinutes;

  if (!Number.isFinite(parsed)) return "Весь день";

  const minutes = Math.max(0, Math.min(1439, Math.floor(parsed)));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;
};

const formatRepeatLabel = (series: TaskSeriesRow) => {
  if (series.repeat === "daily") return "Ежедневно";
  if (series.weekday == null) return "Еженедельно";

  const weekday =
    series.weekday >= 0 && series.weekday < WEEKDAY_SHORT_RU.length
      ? WEEKDAY_SHORT_RU[series.weekday]
      : null;

  return weekday ? `Еженедельно · ${weekday}` : "Еженедельно";
};

export default function RecurringTasksSheet({
  onClose,
  recurringTasks,
  onDeleteSeries,
  onSkipDate,
  isDesktop = false,
}: RecurringTasksSheetProps) {
  const [isSettled, setIsSettled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const dragControls = useDragControls();
  const dialogRef = useRef<HTMLDivElement>(null);
  const { impact, notification } = useHaptic();
  const prefersReducedMotion = useReducedMotion();
  const isIOS = isIOSDevice();
  const reduceMotion = prefersReducedMotion || isIOS;

  const handleClose = useCallback(() => {
    setConfirmAction(null);
    setIsSettled(false);
    setTimeout(onClose, 10);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmAction) {
        setConfirmAction(null);
        return;
      }
      handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmAction, handleClose]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (isDesktop || confirmAction) return;
    setIsDragging(false);
    const draggingDown = info.offset.y > 0;
    const fastDrag = info.velocity.y > 300;
    const farDrag = info.offset.y > 100;

    if (draggingDown && (fastDrag || farDrag)) {
      handleClose();
    }
  };

  const handleAnimationComplete = useCallback(
    (definition: AnimationDefinition) => {
      const isOpening =
        definition === "visible" ||
        (typeof definition === "object" &&
          definition !== null &&
          !Array.isArray(definition) &&
          "y" in definition &&
          (definition as { y?: number | string }).y === 0) ||
        (isDesktop && definition === undefined);

      if (isOpening || (isDesktop && !isSettled)) {
        setIsSettled(true);
      }
    },
    [isDesktop, isSettled]
  );

  const containerClasses = isDesktop
    ? "fixed inset-0 z-50 flex items-center justify-center pointer-events-auto py-4 pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))]"
    : "fixed inset-0 z-50 flex flex-col justify-end pointer-events-none touch-none pl-[max(env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(env(safe-area-inset-right),var(--tg-content-safe-right,0px))]";

  const sheetClasses = cn(
    "pointer-events-auto relative w-full bg-[var(--surface)] flex flex-col shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden ring-1 ring-inset ring-[var(--border)]",
    isDesktop
      ? "max-w-2xl rounded-3xl shadow-2xl max-h-[85vh] h-auto border border-[var(--border)]"
      : "max-w-lg mx-auto rounded-t-[32px] max-h-[92dvh] h-[80vh]"
  );

  const initialAnim = isDesktop ? { opacity: 0, scale: 0.95 } : { y: "100%" };
  const animateAnim = isDesktop ? { opacity: 1, scale: 1 } : { y: 0 };
  const exitAnim = isDesktop ? { opacity: 0, scale: 0.95 } : { y: "100%" };
  const transitionConfig = reduceMotion
    ? { duration: 0 }
    : isDesktop
      ? MODAL_TRANSITION
      : SHEET_TRANSITION;

  const calculateNextOccurrences = (
    series: TaskSeriesRow,
    count = UPCOMING_OCCURRENCES_COUNT
  ) => {
    const dates: Date[] = [];
    if (series.repeat === "weekly" && series.weekday == null) {
      return dates;
    }

    let currentDate = startOfDay(new Date());
    let sanityCheck = 0;
    while (dates.length < count && sanityCheck < 180) {
      sanityCheck += 1;

      const dayMatches =
        series.repeat === "daily" ||
        (series.repeat === "weekly" && getDay(currentDate) === series.weekday);

      if (dayMatches) {
        dates.push(new Date(currentDate));
      }

      currentDate = addDays(currentDate, 1);
    }

    return dates;
  };

  const requestDeleteSeries = (series: TaskSeriesRow) => {
    impact("medium");
    setConfirmAction({
      type: "delete-series",
      seriesId: series.id,
      title: series.title,
    });
  };

  const requestDeleteDate = (series: TaskSeriesRow, date: Date) => {
    impact("medium");
    setConfirmAction({
      type: "skip-date",
      seriesId: series.id,
      date,
      title: series.title,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    impact("medium");
    notification("warning");

    if (confirmAction.type === "delete-series") {
      onDeleteSeries(confirmAction.seriesId);
      if (expandedSeriesId === confirmAction.seriesId) {
        setExpandedSeriesId(null);
      }
    } else {
      onSkipDate(confirmAction.seriesId, confirmAction.date);
    }

    setConfirmAction(null);
  };

  const confirmTitle =
    confirmAction?.type === "delete-series"
      ? "Удалить все повторы?"
      : "Удалить повтор за день?";

  const confirmDescription =
    confirmAction == null
      ? ""
      : confirmAction.type === "delete-series"
        ? `Серия «${confirmAction.title}» будет удалена полностью. Это действие нельзя отменить.`
        : `Повтор «${confirmAction.title}» за ${format(
            confirmAction.date,
            "d MMMM (EEEE)",
            { locale: ru }
          )} будет удален из расписания.`;

  return (
    <div className={containerClasses}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
        onClick={() => {
          if (confirmAction) {
            setConfirmAction(null);
            return;
          }
          handleClose();
        }}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-sheet-title"
        tabIndex={-1}
        initial={initialAnim}
        animate={animateAnim}
        exit={exitAnim}
        transition={transitionConfig}
        onAnimationStart={() => setIsSettled(false)}
        onAnimationComplete={handleAnimationComplete}
        drag={isDesktop || confirmAction ? false : "y"}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={reduceMotion ? 0 : 0.05}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        transformTemplate={(_transforms, generatedTransform) =>
          isSettled && !isDragging && !isDesktop ? "none" : generatedTransform
        }
        className={sheetClasses}
      >
        <div
          className={cn(
            "shrink-0 w-full z-20 bg-[var(--surface)] select-none border-b border-[var(--border)]",
            !isDesktop &&
              "pt-4 pb-3 cursor-grab active:cursor-grabbing touch-none",
            isDesktop && "px-6 pt-6 pb-4"
          )}
          onPointerDown={(event) =>
            !isDesktop && !confirmAction ? dragControls.start(event) : undefined
          }
        >
          {!isDesktop && (
            <div className="flex justify-center mb-3">
              <div className="w-12 h-1.5 rounded-full bg-[var(--muted)]/20" />
            </div>
          )}

          <div
            className={cn(
              "flex items-start justify-between gap-3",
              !isDesktop && "px-5"
            )}
          >
            <div className="min-w-0">
              <h2
                id="recurring-sheet-title"
                className="text-[20px] font-bold font-[var(--font-display)] text-[var(--ink)] leading-tight"
              >
                Повторяющиеся задачи
              </h2>
              <p className="mt-1 text-[12px] font-semibold text-[var(--muted)]">
                {recurringTasks.length === 0
                  ? "Серии пока не добавлены"
                  : formatSeriesCountLabel(recurringTasks.length)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="h-11 w-11 flex items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors active:scale-95"
              aria-label="Закрыть"
            >
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)]",
            isDesktop
              ? "p-5"
              : "px-4 pt-4 pb-[calc(1rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))]"
          )}
        >
          {recurringTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[var(--muted)]">
              <div className="h-16 w-16 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/40 flex items-center justify-center mb-4">
                <Repeat size={28} strokeWidth={2} />
              </div>
              <p className="text-[15px] font-semibold text-[var(--ink)]">
                Нет повторяющихся задач
              </p>
              <p className="mt-1 text-[13px] max-w-[260px] leading-snug">
                Создайте задачу с повтором в окне добавления, чтобы управлять
                ею здесь.
              </p>
            </div>
          ) : (
            <div className="space-y-3" role="list">
              {recurringTasks.map((series) => {
                const isExpanded = expandedSeriesId === series.id;
                const nextDates = isExpanded ? calculateNextOccurrences(series) : [];

                return (
                  <article
                    key={series.id}
                    role="listitem"
                    className="bg-[var(--surface)] rounded-[24px] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-soft)]"
                  >
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`series-panel-${series.id}`}
                      className="w-full p-4 text-left transition-colors hover:bg-[var(--surface-2)]/50 active:bg-[var(--surface-2)]/80"
                      onClick={() => {
                        impact("light");
                        setExpandedSeriesId(isExpanded ? null : series.id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-[var(--ink)] text-[17px] truncate">
                            {series.title}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/80 bg-[var(--surface-2)]/60 px-2.5 py-1 text-[12px] font-semibold text-[var(--muted)]">
                              <Clock size={13} />
                              {formatStartTime(series.start_minutes)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/80 bg-[var(--surface-2)]/60 px-2.5 py-1 text-[12px] font-semibold text-[var(--muted)]">
                              <Repeat size={13} />
                              {formatRepeatLabel(series)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          size={20}
                          className={cn(
                            "text-[var(--muted)] transition-transform duration-200 mt-1",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          id={`series-panel-${series.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        >
                          <div className="px-4 pb-4 pt-3 border-t border-[var(--border)]">
                            <h4 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">
                              Ближайшие {UPCOMING_OCCURRENCES_COUNT} повторов
                            </h4>
                            <div className="space-y-2">
                              {nextDates.map((date) => (
                                <div
                                  key={date.toISOString()}
                                  className="flex items-center justify-between rounded-2xl border border-[var(--border)]/70 bg-[var(--surface-2)]/40 pl-3 pr-1 py-1"
                                >
                                  <span className="text-[14px] font-semibold text-[var(--ink)]">
                                    {format(date, "d MMMM (EEEE)", {
                                      locale: ru,
                                    })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteDate(series, date)}
                                    className="h-11 w-11 flex items-center justify-center text-[var(--danger)] rounded-xl active:scale-95 hover:bg-[var(--danger)]/10 transition-colors"
                                    aria-label={`Удалить повтор за ${format(
                                      date,
                                      "d MMMM",
                                      { locale: ru }
                                    )}`}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => requestDeleteSeries(series)}
                              className="mt-4 h-11 w-full flex items-center justify-center gap-2 bg-[var(--danger)]/10 text-[var(--danger)] font-bold rounded-xl active:scale-95 transition-colors hover:bg-[var(--danger)]/20 text-[15px]"
                            >
                              <Trash2 size={17} />
                              Удалить все повторы
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <AnimatePresence>
          {confirmAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="absolute inset-0 z-30 pointer-events-auto flex"
            >
              <button
                type="button"
                aria-label="Закрыть окно подтверждения"
                className="absolute inset-0 bg-black/35"
                onClick={() => setConfirmAction(null)}
              />

              <motion.div
                initial={isDesktop ? { opacity: 0, scale: 0.96 } : { y: "100%" }}
                animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
                exit={isDesktop ? { opacity: 0, scale: 0.96 } : { y: "100%" }}
                transition={transitionConfig}
                className={cn(
                  "relative mt-auto w-full border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-pop)]",
                  isDesktop
                    ? "m-auto max-w-md rounded-[28px] p-5"
                    : "rounded-t-[28px] px-4 pt-4 pb-[calc(0.75rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))]"
                )}
              >
                <h3 className="text-[18px] font-bold text-[var(--ink)] font-[var(--font-display)]">
                  {confirmTitle}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                  {confirmDescription}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] font-semibold active:scale-95 transition-transform"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    className="h-11 rounded-xl bg-[var(--danger)] text-white font-semibold active:scale-95 transition-transform"
                  >
                    {confirmAction.type === "delete-series"
                      ? "Удалить всё"
                      : "Удалить день"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
