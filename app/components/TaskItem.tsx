import { Check, Trash2 } from "lucide-react";
import type { Task } from "../types/task";
import { cn } from "../lib/cn";

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const checkboxId = `task-toggle-${task.id}`;

  return (
    <li
      className={cn(
        "group relative flex items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_24px_-18px_rgba(16,12,8,0.4)] transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--accent)]",
        task.completed && "bg-[var(--surface-2)] opacity-70",
      )}
    >
      <input
        id={checkboxId}
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        className="sr-only"
      />

      <label
        htmlFor={checkboxId}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 px-4 py-4"
      >
        <div
          className={cn(
            "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            task.completed
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--border)] group-hover:border-[var(--accent)]",
          )}
        >
          {task.completed && (
            <Check size={14} className="text-[var(--accent-ink)]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-base font-medium transition-all",
              task.completed
                ? "text-[var(--muted)] line-through"
                : "text-[var(--ink)]",
            )}
          >
            {task.title}
          </p>
        </div>
      </label>

      <div className="flex items-center gap-3 pr-4">
        <span className="whitespace-nowrap rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-strong)]">
          {task.duration} мин
        </span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete(task.id);
          }}
          type="button"
          aria-label={`Удалить задачу: ${task.title}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </li>
  );
}
