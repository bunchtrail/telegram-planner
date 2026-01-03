import { useEffect, useRef } from 'react';
import { AnimatePresence, Reorder, motion } from 'framer-motion';
import { Calendar, Loader2 } from 'lucide-react';
import type { Task } from '../types/task';
import TaskItem from './TaskItem';

type TaskListProps = {
  dateKey: string;
  tasks: Task[];
  isLoading?: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onMove: (id: string, nextDateKey: string) => void;
  onAdd: () => void;
  onReorder: (tasks: Task[]) => void;
  activeTaskId: string | null;
  onToggleActive: (id: string) => void;
  getElapsedMs: (id: string) => number;
};

export default function TaskList({
  dateKey,
  tasks,
  isLoading,
  onToggle,
  onDelete,
  onEdit,
  onMove,
  onAdd,
  onReorder,
  activeTaskId,
  onToggleActive,
  getElapsedMs,
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
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      bottomRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
    prevTaskIdsRef.current = nextIds;
  }, [tasks]);

  const scrollClasses =
    'h-full w-full overflow-y-auto pb-32 pt-2 touch-pan-y overscroll-contain no-scrollbar pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] [-webkit-overflow-scrolling:touch]';

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2
          className="animate-spin text-[var(--muted)] opacity-50"
          size={32}
        />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div
        className={`${scrollClasses} flex flex-col items-center justify-center`}
      >
        <div className="mb-6 rounded-[28px] bg-[var(--surface)] p-8 shadow-[var(--shadow-card)]">
          <Calendar
            size={48}
            className="text-[var(--accent)] opacity-80"
            strokeWidth={1.5}
          />
        </div>
        <p className="text-xl font-bold text-[var(--ink)] font-[var(--font-display)]">
          План пуст
        </p>
        <p className="text-sm text-[var(--muted)] mt-1 mb-6">
          На этот день задач нет
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl bg-[var(--surface-2)] px-6 py-3 text-sm font-bold text-[var(--accent)] transition-colors active:scale-95"
        >
          Создать задачу
        </button>
      </div>
    );
  }

  return (
    <motion.div className={scrollClasses} layoutScroll>
      <Reorder.Group
        key={dateKey}
        axis="y"
        values={tasks}
        onReorder={onReorder}
        as="ul"
        role="list"
        className="relative"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onMove={onMove}
              isActive={task.id === activeTaskId}
              elapsedMs={getElapsedMs(task.id)}
              onToggleActive={onToggleActive}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <div ref={bottomRef} className="h-4" />
    </motion.div>
  );
}
