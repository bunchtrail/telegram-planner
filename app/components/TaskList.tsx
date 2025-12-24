import { Calendar as CalendarIcon } from "lucide-react";
import type { Task } from "../types/task";
import TaskItem from "./TaskItem";

type TaskListProps = {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onAdd,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)] opacity-70">
        <CalendarIcon size={48} className="mb-4 text-[var(--border)]" />
        <p>Нет планов на этот день</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Добавить задачу
        </button>
      </div>
    );
  }

  return (
    <ul className="space-y-3" role="list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
