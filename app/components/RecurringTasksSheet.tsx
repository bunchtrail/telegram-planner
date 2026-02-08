"use client";

import {
    type AnimationDefinition,
    type PanInfo,
    type Transition,
    useDragControls,
    useReducedMotion,
    motion,
    AnimatePresence,
} from "framer-motion";
import {
    Calendar,
    ChevronRight,
    Clock,
    Repeat,
    Trash2,
    X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, addWeeks, format, getDay, isSameDay, startOfDay } from "date-fns";
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

type RecurringTasksSheetProps = {
    onClose: () => void;
    recurringTasks: TaskSeriesRow[];
    onDeleteSeries: (id: string) => void;
    onSkipDate: (seriesId: string, date: Date) => void;
    isDesktop?: boolean;
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

    const dragControls = useDragControls();
    const { impact, notification } = useHaptic();
    const prefersReducedMotion = useReducedMotion();
    const isIOS = isIOSDevice();
    const reduceMotion = prefersReducedMotion || isIOS;

    const handleClose = useCallback(() => {
        setIsSettled(false);
        setTimeout(onClose, 10);
    }, [onClose]);

    const handleDragEnd = (
        _event: MouseEvent | TouchEvent | PointerEvent,
        info: PanInfo
    ) => {
        if (isDesktop) return;
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

    const calculateNextOccurrences = (series: TaskSeriesRow, count = 5) => {
        const dates: Date[] = [];
        let currentDate = startOfDay(new Date()); // Start checking from today

        // Safety check loop limit
        let sanityCheck = 0;
        while (dates.length < count && sanityCheck < 100) {
            sanityCheck++;

            const dayMatches = series.repeat === 'daily' ||
                (series.repeat === 'weekly' && getDay(currentDate) === series.weekday);

            if (dayMatches) {
                // TODO: Check if this specific date is skipped in task_series_skips
                // Ideally we would pass skips as prop or check here, but for now we'll rely on global list
                // Since we don't have the skips list locally here easily without prop drilling or fetching,
                // we'll assume it's valid and let the 'delete' action handle the skip creation.
                dates.push(new Date(currentDate));
            }

            currentDate = addDays(currentDate, 1);
        }
        return dates;
    };

    return (
        <div className={containerClasses}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
                onClick={handleClose}
            />

            <motion.div
                initial={initialAnim}
                animate={animateAnim}
                exit={exitAnim}
                transition={transitionConfig}
                onAnimationStart={() => setIsSettled(false)}
                onAnimationComplete={handleAnimationComplete}
                drag={isDesktop ? false : "y"}
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
                {/* Header */}
                <div
                    className={cn(
                        "shrink-0 w-full pt-4 pb-2 z-20 bg-[var(--surface)] select-none border-b border-[var(--border)]",
                        !isDesktop && "cursor-grab active:cursor-grabbing touch-none",
                        isDesktop && "p-6 pb-4"
                    )}
                    onPointerDown={(e) => !isDesktop && dragControls.start(e)}
                >
                    {!isDesktop && (
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-1.5 rounded-full bg-[var(--muted)]/20" />
                        </div>
                    )}

                    <div
                        className={cn(
                            "flex items-center justify-between",
                            isDesktop ? "" : "px-6"
                        )}
                    >
                        <h2 className="text-[20px] font-bold font-[var(--font-display)] text-[var(--ink)]">
                            Повторяющиеся задачи
                        </h2>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors active:scale-90"
                            aria-label="Закрыть"
                        >
                            <X size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-[var(--bg)]">
                    {recurringTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] opacity-60">
                            <Repeat size={48} strokeWidth={1.5} className="mb-4" />
                            <p className="text-sm font-medium">Нет повторяющихся задач</p>
                        </div>
                    ) : (
                        recurringTasks.map((series) => {
                            const isExpanded = expandedSeriesId === series.id;
                            const nextDates = isExpanded ? calculateNextOccurrences(series) : [];

                            return (
                                <div
                                    key={series.id}
                                    className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm"
                                >
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer active:bg-[var(--surface-2)] transition-colors"
                                        onClick={() => {
                                            impact("light");
                                            setExpandedSeriesId(isExpanded ? null : series.id);
                                        }}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <h3 className="font-bold text-[var(--ink)] text-[17px]">
                                                {series.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-[13px] text-[var(--muted)]">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {series.start_minutes
                                                        ? `${String(
                                                            Math.floor(Number(series.start_minutes) / 60)
                                                        ).padStart(2, "0")}:${String(
                                                            Number(series.start_minutes) % 60
                                                        ).padStart(2, "0")}`
                                                        : "Весь день"}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Repeat size={14} />
                                                    {series.repeat === "daily"
                                                        ? "Ежедневно"
                                                        : "Еженедельно"}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight
                                            size={20}
                                            className={cn(
                                                "text-[var(--muted)] transition-transform duration-300",
                                                isExpanded && "rotate-90"
                                            )}
                                        />
                                    </div>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <div className="px-4 pb-4 pt-0">
                                                    <div className="h-px bg-[var(--border)] mb-4" />

                                                    <div className="space-y-1 mb-4">
                                                        <h4 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Ближайшие повторы</h4>
                                                        {nextDates.map((date) => (
                                                            <div key={date.toISOString()} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors group">
                                                                <span className="text-[15px] font-medium text-[var(--ink)]">
                                                                    {format(date, "d MMMM (EEEE)", { locale: ru })}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        impact("medium");
                                                                        onSkipDate(series.id, date);
                                                                    }}
                                                                    className="text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[var(--danger)]/10"
                                                                    title="Пропустить этот день"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            notification("warning");
                                                            if (confirm("Вы уверены, что хотите удалить все повторения этой задачи?")) {
                                                                onDeleteSeries(series.id);
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--danger)]/10 text-[var(--danger)] font-bold rounded-xl active:scale-95 transition-all text-[15px] hover:bg-[var(--danger)]/20"
                                                    >
                                                        <Trash2 size={18} />
                                                        Удалить серию
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </div>
    );
}
