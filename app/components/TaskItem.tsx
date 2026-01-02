import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  type PanInfo,
} from "framer-motion";
import { Check, Trash2, Pencil, ChevronDown } from "lucide-react";
import { useState, type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Task } from "../types/task";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
};

export default function TaskItem({
  task,
  onToggle,
  onDelete,
  onEdit,
}: TaskItemProps) {
  const { impact, notification, selection } = useHaptic();
  const [isExpanded, setIsExpanded] = useState(false);

  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-100, -20], [1, 0], { clamp: true });
  const iconScale = useTransform(x, [-150, -50], [1.2, 0.8], { clamp: true });

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.x < -80) {
      notification("warning");
      onDelete(task.id);
      return;
    }
    impact("light");
  };

  const handleToggle = (event: ReactMouseEvent) => {
    event.stopPropagation();
    impact("medium");
    onToggle(task.id);
  };

  const toggleExpand = () => {
    selection();
    setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleExpand();
    }
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className="group relative mb-3 touch-pan-y select-none"
    >
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-[16px] bg-[var(--danger)] pr-6"
      >
        <motion.div style={{ scale: iconScale }}>
          <Trash2 size={24} className="text-white" />
        </motion.div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.1 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative z-10 overflow-hidden rounded-[16px] bg-[var(--surface)] transition-shadow",
          task.completed &&
            "bg-[var(--surface-2)] opacity-60 shadow-none",
          isExpanded && "shadow-sm ring-1 ring-[var(--border)]",
        )}
      >
        <div className="flex flex-col">
          <div
            className="flex items-start gap-3 p-3 transition-colors active:bg-[var(--surface-2)]"
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onClick={toggleExpand}
            onKeyDown={handleKeyDown}
          >
            <button
              type="button"
              onClick={handleToggle}
              aria-pressed={task.completed}
              className={cn(
                "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all",
                task.completed
                  ? "border-[var(--accent)] bg-[var(--accent)]"
                  : "border-[var(--muted)] opacity-30",
              )}
            >
              {task.completed && (
                <Check
                  size={14}
                  strokeWidth={3}
                  className="text-[var(--accent-ink)]"
                />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[17px] leading-snug transition-all",
                  task.completed
                    ? "text-[var(--muted)] line-through"
                    : "text-[var(--ink)]",
                  !isExpanded && "truncate",
                )}
              >
                {task.title}
              </p>
              {!task.completed && !isExpanded && (
                <div className="mt-1 text-xs font-medium text-[var(--muted)]">
                  {task.duration} мин
                </div>
              )}
            </div>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              className="mt-1 text-[var(--muted)] opacity-50"
            >
              <ChevronDown size={20} />
            </motion.div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4 pt-0"
              >
                <p className="mb-4 whitespace-pre-wrap text-[17px] leading-snug text-[var(--ink)]">
                  {task.title}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(task);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--bg)] py-2.5 text-sm font-semibold text-[var(--accent)] transition-transform active:scale-[0.98]"
                  >
                    <Pencil size={16} /> Изменить
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition-transform active:scale-[0.98]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.li>
  );
}
