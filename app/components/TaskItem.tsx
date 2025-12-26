import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import type { Task } from "../types/task";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const checkboxId = `task-toggle-${task.id}`;
  const { impact, notification } = useHaptic();

  const handleToggle = () => {
    impact(task.completed ? "light" : "medium");
    onToggle(task.id);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    notification("warning");
    onDelete(task.id);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_24px_-18px_rgba(16,12,8,0.4)] transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--accent)]",
        task.completed && "bg-[var(--surface-2)]",
      )}
    >
      <input
        id={checkboxId}
        type="checkbox"
        checked={task.completed}
        onChange={handleToggle}
        className="sr-only"
      />

      <label
        htmlFor={checkboxId}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 px-4 py-4"
      >
        <div
          className={cn(
            "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
            task.completed
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--border)] group-hover:border-[var(--accent)]",
          )}
        >
          <motion.div
            initial={false}
            animate={{
              scale: task.completed ? 1 : 0,
              opacity: task.completed ? 1 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Check size={14} className="text-[var(--accent-ink)]" />
          </motion.div>
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-base font-medium transition-all duration-300",
              task.completed
                ? "text-[var(--muted)] line-through opacity-60"
                : "text-[var(--ink)]",
            )}
          >
            {task.title}
          </p>
        </div>
      </label>

      <div className="flex items-center gap-3 pr-4">
        <span
          className={cn(
            "whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors duration-300",
            task.completed
              ? "bg-[var(--surface-2)] text-[var(--muted)]"
              : "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
          )}
        >
          {task.duration} мин
        </span>
        <button
          onClick={handleDelete}
          type="button"
          aria-label={`Удалить задачу: ${task.title}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:text-[var(--danger)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.li>
  );
}
