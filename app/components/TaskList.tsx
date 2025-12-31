import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import type { Task } from "../types/task";
import TaskItem from "./TaskItem";

type TaskListProps = {
  tasks: Task[];
  isLoading?: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

export default function TaskList({
  tasks,
  isLoading,
  onToggle,
  onDelete,
  onAdd,
}: TaskListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-[var(--accent-strong)]">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_12px_20px_-16px_rgba(176,106,63,0.35)]">
          <CalendarIcon size={32} />
        </div>
        <p className="text-base font-semibold text-[var(--ink)]">
          Нет планов на этот день
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-6 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-ink)] shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-card)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Добавить задачу
        </button>
      </motion.div>
    );
  }

  return (
    <ul className="space-y-3 pb-20" role="list">
      <AnimatePresence initial={false} mode="popLayout">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </ul>
  );
}
