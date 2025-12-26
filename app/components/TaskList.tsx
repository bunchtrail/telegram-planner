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
      <div className="flex justify-center py-20 text-[var(--muted)]">
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
        className="flex flex-col items-center justify-center py-20 text-[var(--muted)] opacity-70"
      >
        <CalendarIcon size={48} className="mb-4 text-[var(--border)]" />
        <p>Нет планов на этот день</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
