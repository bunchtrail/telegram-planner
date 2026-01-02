import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Calendar, Loader2 } from "lucide-react";
import type { Task } from "../types/task";
import TaskItem from "./TaskItem";

type TaskListProps = {
  tasks: Task[];
  isLoading?: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onAdd: () => void;
};

export default function TaskList({
  tasks,
  isLoading,
  onToggle,
  onDelete,
  onEdit,
  onAdd,
}: TaskListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const prevIds = prevTaskIdsRef.current;
    const nextIds = new Set(tasks.map((task) => task.id));
    let isIncremental = true;
    for (const id of prevIds) {
      if (!nextIds.has(id)) {
        isIncremental = false;
        break;
      }
    }

    if (isIncremental && nextIds.size > prevIds.size) {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      bottomRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }

    prevTaskIdsRef.current = nextIds;
  }, [tasks]);

  const scrollClasses =
    "h-full w-full overflow-y-auto pb-32 pt-4 touch-pan-y overscroll-contain no-scrollbar pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] [-webkit-overflow-scrolling:touch]";

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={`${scrollClasses} flex flex-col items-center justify-center opacity-60`}>
        <div className="mb-4 rounded-3xl bg-[var(--surface-2)] p-6">
          <Calendar size={40} className="text-[var(--muted)]" />
        </div>
        <p className="text-lg font-medium text-[var(--muted)]">План пуст</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 text-[var(--accent)] font-bold"
        >
          Добавить
        </button>
      </div>
    );
  }

  return (
    <div className={scrollClasses}>
      <ul className="space-y-3" role="list">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </AnimatePresence>
      </ul>
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
