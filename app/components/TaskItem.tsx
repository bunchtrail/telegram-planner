import { memo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import {
  Check,
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  Clock,
} from "lucide-react";
import type { Task } from "../types/task";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
};

const TaskItem = memo(function TaskItem({
  task,
  onToggle,
  onDelete,
  onEdit,
}: TaskItemProps) {
  const { impact, selection } = useHaptic();
  const dragControls = useDragControls();
  const [isExpanded, setIsExpanded] = useState(false);

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
    <Reorder.Item
      value={task}
      id={task.id}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="relative mb-2.5 overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[var(--shadow-card)] border border-[var(--surface)] hover:border-[var(--border)] transition-colors transform-gpu will-change-transform"
      style={{ transformOrigin: "center" }}
      as="li"
    >
      <motion.div
        layout="position"
        className={cn(
          "flex flex-col relative transition-colors duration-200",
          isExpanded ? "bg-[var(--surface-2)]/50" : "",
        )}
      >
        <div className="flex items-center gap-3.5 p-3.5 pl-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              impact("medium");
              onToggle(task.id);
            }}
            aria-pressed={task.completed}
            aria-label={
              task.completed
                ? "Отметить как невыполненную"
                : "Отметить как выполненную"
            }
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300",
              task.completed
                ? "border-[var(--accent)] bg-[var(--accent)]"
                : "border-[var(--muted)]/40 bg-transparent hover:border-[var(--accent)]",
            )}
          >
            <motion.span
              initial={false}
              animate={{
                scale: task.completed ? 1 : 0,
                opacity: task.completed ? 1 : 0,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {task.completed && (
                <Check
                  size={14}
                  strokeWidth={3.5}
                  className="text-[var(--accent-ink)]"
                />
              )}
            </motion.span>
          </motion.button>

          <div
            className="min-w-0 flex-1 py-1 cursor-pointer select-none touch-manipulation"
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onClick={toggleExpand}
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  "text-[17px] font-medium leading-snug transition-all duration-300",
                  task.completed
                    ? "text-[var(--muted)] line-through decoration-2 decoration-[var(--border)]"
                    : "text-[var(--ink)]",
                  !isExpanded && "truncate",
                )}
              >
                {task.title}
              </p>
            </div>
            {!task.completed && !isExpanded && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--muted)]">
                <Clock size={10} strokeWidth={2.5} />
                {task.duration} мин
              </div>
            )}

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 text-xs text-[var(--accent)] font-medium flex items-center gap-1"
                >
                  Подробнее <ChevronDown size={12} className="rotate-180" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            aria-label="Перетащить"
            className="touch-none p-2 text-[var(--muted)] opacity-20 hover:opacity-100 active:opacity-60 cursor-grab active:cursor-grabbing transition-opacity"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              impact("light");
              dragControls.start(event);
            }}
          >
            <GripVertical size={20} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 pl-[3.5rem]">
                <p className="text-[15px] text-[var(--ink)] whitespace-pre-wrap leading-relaxed mb-5 opacity-80">
                  {task.title}
                </p>

                <div className="flex gap-3">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(task);
                    }}
                    className="flex-1 rounded-xl bg-[var(--bg)] py-3 text-[14px] font-bold text-[var(--ink)] shadow-sm border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Pencil size={16} /> Изменить
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(task.id);
                    }}
                    aria-label="Удалить"
                    className="flex-none px-4 rounded-xl bg-[var(--bg)] text-[var(--danger)] shadow-sm border border-[var(--border)]"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Reorder.Item>
  );
});

export default TaskItem;
