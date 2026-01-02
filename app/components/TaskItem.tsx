import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Reorder, useDragControls, AnimatePresence, motion } from "framer-motion";
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

export default function TaskItem({
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
      layout
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative bg-[var(--surface)] first:rounded-t-[14px] last:rounded-b-[14px] [&:not(:last-child)]:border-b border-[var(--border)]"
      as="li"
    >
      <div className="flex flex-col relative active:bg-[var(--surface-2)] transition-colors">
        <div className="flex items-center gap-3 p-3 pl-3.5">
          <button
            type="button"
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
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
              task.completed
                ? "border-[var(--accent)] bg-[var(--accent)]"
                : "border-[var(--border)]",
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

          <div
            className="min-w-0 flex-1 py-1 cursor-pointer"
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onClick={toggleExpand}
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-1">
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
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                className="text-[var(--muted)] opacity-50"
              >
                <ChevronDown size={16} />
              </motion.div>
            </div>
            {!task.completed && !isExpanded && (
              <span className="text-[13px] text-[var(--muted)] opacity-80">
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

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0 pl-[3.25rem]">
                <p className="text-[16px] text-[var(--ink)] whitespace-pre-wrap leading-relaxed mb-4 opacity-90">
                  {task.title}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(task);
                    }}
                    className="flex-1 rounded-lg bg-[var(--bg)] py-2.5 text-[15px] font-medium text-[var(--accent)] active:scale-95 transition-transform"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Pencil size={16} /> Изменить
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(task.id);
                    }}
                    aria-label="Удалить"
                    className="flex-none px-4 rounded-lg bg-[var(--bg)] text-[var(--danger)] active:scale-95 transition-transform"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  );
}
