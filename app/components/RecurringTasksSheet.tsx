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
import { AlertTriangle, Calendar, ChevronRight, Clock, Repeat, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, getDay, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";
import type { TaskSeriesRow, TaskSeriesSkipRow } from "../hooks/usePlanner";
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
  recurringSkips: TaskSeriesSkipRow[];
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

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return startOfDay(new Date(value));
  }
  return new Date(year, month - 1, day);
};

export default function RecurringTasksSheet({
  onClose,
  recurringTasks,
  recurringSkips,
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

  const skipsBySeriesId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    recurringSkips.forEach((skip) => {
      const current = map.get(skip.series_id) ?? new Set<string>();
      current.add(skip.date);
      map.set(skip.series_id, current);
    });
    return map;
  }, [recurringSkips]);

  const calculateNextOccurrences = (
    series: TaskSeriesRow,
    count = UPCOMING_OCCURRENCES_COUNT
  ) => {
    const dates: Date[] = [];
    if (series.repeat === "weekly" && series.weekday == null) {
      return dates;
    }

    const today = startOfDay(new Date());
    const seriesStartDate = startOfDay(parseDateOnly(series.start_date));
    const seriesEndDate = series.end_date
      ? startOfDay(parseDateOnly(series.end_date))
      : null;
    let currentDate =
      seriesStartDate.getTime() > today.getTime() ? seriesStartDate : today;
    const skipSet = skipsBySeriesId.get(series.id);
    let sanityCheck = 0;
    while (dates.length < count && sanityCheck < 365 * 3) {
      sanityCheck += 1;

      if (seriesEndDate && currentDate.getTime() > seriesEndDate.getTime()) {
        break;
      }

      const dayMatches =
        series.repeat === "daily" ||
        (series.repeat === "weekly" && getDay(currentDate) === series.weekday);

      if (dayMatches) {
        const dateKey = format(currentDate, "yyyy-MM-dd");
        if (!skipSet?.has(dateKey)) {
          dates.push(new Date(currentDate));
        }
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
        ? `Будущие повторы серии «${confirmAction.title}» будут остановлены. Прошлые задачи останутся в истории.`
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
            <div className="min-w-0 flex items-start gap-3">
              <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm">
                <Repeat size={22} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 pt-0.5">
                <h2
                  id="recurring-sheet-title"
                  className="text-[20px] font-bold font-[var(--font-display)] text-[var(--ink)] leading-tight"
                >
                  Повторяющиеся задачи
                </h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                    {recurringTasks.length === 0
                      ? "Пока пусто"
                      : formatSeriesCountLabel(recurringTasks.length)}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 bg-[var(--surface-2)] rounded-full text-[var(--muted)] hover:text-[var(--ink)] transition-colors active:scale-95"
              aria-label="Закрыть"
            >
              <X size={20} />
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
            <div className="h-full flex flex-col items-center justify-center text-center text-[var(--muted)] py-8">
              <div className="relative h-20 w-20 rounded-3xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center mb-5 shadow-[var(--shadow-card)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-transparent opacity-10 pointer-events-none" />
                <Repeat size={32} strokeWidth={2} className="text-[var(--accent)] relative z-10" />
              </div>
              <p className="text-[16px] font-bold text-[var(--ink)]">
                Нет повторяющихся задач
              </p>
              <p className="mt-2 text-[13px] max-w-[260px] leading-relaxed opacity-80">
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
                    className="relative bg-[var(--surface)] rounded-[24px] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-card)] group/card"
                  >
                    {/* Subtle accent gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-transparent opacity-[0.03] pointer-events-none" />

                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`series-panel-${series.id}`}
                      className="relative z-10 w-full p-4 text-left transition-colors hover:bg-[var(--surface-2)]/40 active:bg-[var(--surface-2)]/60"
                      onClick={() => {
                        impact("light");
                        setExpandedSeriesId(isExpanded ? null : series.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "shrink-0 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-colors",
                          isExpanded
                            ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                            : "bg-[var(--accent)]/10 text-[var(--accent)]"
                        )}>
                          <Repeat size={20} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-[var(--ink)] text-[17px] truncate leading-tight">
                            {series.title}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/8 px-2.5 py-0.5 text-[11px] font-bold text-[var(--accent)]">
                              <Clock size={12} />
                              {formatStartTime(series.start_minutes)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]/60 px-2.5 py-0.5 text-[11px] font-bold text-[var(--muted)]">
                              <Repeat size={11} />
                              {formatRepeatLabel(series)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          size={18}
                          className={cn(
                            "text-[var(--muted)] transition-transform duration-200 shrink-0",
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
                          className="relative z-10"
                        >
                          <div className="px-4 pb-4 pt-3 border-t border-[var(--border)]/60">
                            <div className="flex items-center gap-2 mb-3">
                              <Calendar size={12} className="text-[var(--muted)]" />
                              <h4 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">
                                Ближайшие {UPCOMING_OCCURRENCES_COUNT} повторов
                              </h4>
                            </div>
                            <div className="space-y-1.5">
                              {nextDates.map((date) => (
                                <div
                                  key={date.toISOString()}
                                  className="flex items-center justify-between rounded-2xl bg-[var(--surface-2)]/50 pl-3.5 pr-1 py-1 transition-colors hover:bg-[var(--surface-2)]"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-2 w-2 rounded-full bg-[var(--accent)]/40 shrink-0" />
                                    <span className="text-[14px] font-semibold text-[var(--ink)]">
                                      {format(date, "d MMMM (EEEE)", {
                                        locale: ru,
                                      })}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteDate(series, date)}
                                    className="h-9 w-9 flex items-center justify-center text-[var(--muted)] rounded-xl active:scale-95 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition-colors"
                                    aria-label={`Удалить повтор за ${format(
                                      date,
                                      "d MMMM",
                                      { locale: ru }
                                    )}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => requestDeleteSeries(series)}
                              className="mt-4 h-11 w-full flex items-center justify-center gap-2 bg-[var(--danger)]/10 text-[var(--danger)] font-bold rounded-2xl border border-[var(--danger)]/15 active:scale-[0.98] transition-all hover:bg-[var(--danger)]/15 text-[14px]"
                            >
                              <Trash2 size={16} />
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
                    ? "m-auto max-w-md rounded-[28px] p-6"
                    : "rounded-t-[28px] px-5 pt-5 pb-[calc(1rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))]"
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--danger)]/10 text-[var(--danger)]">
                    <AlertTriangle size={20} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-[18px] font-bold text-[var(--ink)] font-[var(--font-display)] leading-tight">
                      {confirmTitle}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">
                      {confirmDescription}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] font-bold active:scale-[0.97] transition-all text-[15px]"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    className="h-12 rounded-2xl bg-[var(--danger)] text-white font-bold active:scale-[0.97] transition-all shadow-lg shadow-[var(--danger)]/20 text-[15px]"
                  >
                    {confirmAction.type === "delete-series"
                      ? "Остановить"
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
