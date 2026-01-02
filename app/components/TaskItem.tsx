import {
  memo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { Check, Trash2, GripVertical, Pencil, ChevronDown } from "lucide-react";
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="relative overflow-hidden bg-[var(--surface)] first:rounded-t-[14px] last:rounded-b-[14px] [&:not(:last-child)]:border-b border-[var(--border)] transform-gpu will-change-transform"
      style={{ transformOrigin: "center" }}
      as="li"
    >
      <motion.div
        layout="position"
        className={cn(
          "flex flex-col relative transition-colors duration-200",
          isExpanded ? "bg-[var(--surface-2)]" : "active:bg-[var(--surface-2)]",
        )}
      >
        <div className="flex items-center gap-3 p-3 pl-3.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.8 }}
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
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
              task.completed
                ? "border-[var(--accent)] bg-[var(--accent)]"
                : "border-[var(--border)] bg-transparent",
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
                  strokeWidth={3}
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
            <div className="flex items-center gap-1">
              <p
                className={cn(
                  "text-[17px] leading-snug transition-colors duration-300",
                  task.completed
                    ? "text-[var(--muted)] line-through decoration-[var(--border)]"
                    : "text-[var(--ink)]",
                  !isExpanded && "truncate",
                )}
              >
                {task.title}
              </p>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-[var(--muted)] opacity-50 shrink-0"
              >
                <ChevronDown size={16} />
              </motion.div>
            </div>
            {!task.completed && !isExpanded && (
              <span className="mt-0.5 block text-[13px] text-[var(--muted)] opacity-80">
                {task.duration} мин
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label="Перетащить"
            className="touch-none p-2.5 -mr-2 text-[var(--muted)] opacity-30 hover:opacity-100 active:opacity-100 cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              impact("light");
              dragControls.start(event);
            }}
          >
            <GripVertical size={22} />
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
              <div className="px-4 pb-4 pt-0 pl-[3.25rem]">
                <p className="text-[16px] text-[var(--ink)] whitespace-pre-wrap leading-relaxed mb-4 opacity-90">
                  {task.title}
                </p>

                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(task);
                    }}
                    className="flex-1 rounded-lg bg-[var(--bg)] py-2.5 text-[15px] font-medium text-[var(--accent)]"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Pencil size={16} /> Изменить
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(task.id);
                    }}
                    aria-label="Удалить"
                    className="flex-none px-4 rounded-lg bg-[var(--bg)] text-[var(--danger)]"
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
