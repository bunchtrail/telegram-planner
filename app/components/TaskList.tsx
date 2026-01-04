import { useEffect, useRef } from 'react';
import { AnimatePresence, Reorder, motion } from 'framer-motion';
import { Calendar, Loader2 } from 'lucide-react';
import type { Task } from '../types/task';
import TaskItem from './TaskItem';

type TaskListProps = {
  dateKey: string;
  tasks: Task[];
  isLoading?: boolean;
  onToggle: (id: string, coords?: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onMove: (id: string, nextDateKey: string) => void;
  onAdd: () => void;
  onReorder: (tasks: Task[]) => void;
  onToggleActive: (id: string) => void;
  getElapsedMs: (id: string) => number;
  updateTask: (id: string, updates: Partial<Task>) => void;
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
  onToggleActive,
  getElapsedMs,
  updateTask,
}: TaskListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const prevIds = prevTaskIdsRef.current;
    const nextIds = new Set(tasks.map((task) => task.clientId));
    let isIncremental = true;
    for (const id of prevIds) {
      if (!nextIds.has(id)) {
        isIncremental = false;
        break;
      }
    }
    if (isIncremental && nextIds.size > prevIds.size) {
      const container = scrollContainerRef.current;
      if (container) {
        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isIOS =
          typeof navigator !== 'undefined' &&
          /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isScrollable = container.scrollHeight > container.clientHeight + 1;
        const nearBottom =
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - 120;
        if (isScrollable && nearBottom) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: prefersReducedMotion || isIOS ? 'auto' : 'smooth',
          });
        }
      }
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
    <motion.div
      ref={scrollContainerRef}
      className={scrollClasses}
      layoutScroll
      layoutRoot
    >
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
              key={task.clientId}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onMove={onMove}
              isActive={Boolean(task.activeStartedAt) && !task.completed}
              elapsedMs={getElapsedMs(task.id)}
              onToggleActive={onToggleActive}
              updateTask={updateTask}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <div className="h-4" />
    </motion.div>
  );
}
