import { useEffect, useRef } from 'react';
import { AnimatePresence, Reorder, useReducedMotion } from 'framer-motion';
import { Calendar, Loader2 } from 'lucide-react';
import type { Task } from '../types/task';
import TaskItem from './TaskItem';
import { cn } from '../lib/cn';

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
  updateTask: (id: string, updates: Partial<Task>) => void;
  className?: string;
  isDesktop?: boolean;
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
  updateTask,
  className,
  isDesktop = false,
}: TaskListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevTaskIdsRef = useRef<Set<string>>(new Set());
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const listMotionEnabled = !reduceMotion;

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
        const isScrollable = container.scrollHeight > container.clientHeight + 1;
        const nearBottom =
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - 120;
        if (isScrollable && nearBottom) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: reduceMotion ? 'auto' : 'smooth',
          });
        }
      }
    }
    prevTaskIdsRef.current = nextIds;
  }, [tasks, reduceMotion]);

  const scrollClasses = cn(
    'h-full w-full overflow-y-auto pt-2 touch-pan-y overscroll-contain no-scrollbar pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] [-webkit-overflow-scrolling:touch]',
    isDesktop ? 'pb-8 pt-4 px-0' : 'pb-32'
  );

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

  const containerClassName = className
    ? `${scrollClasses} ${className}`
    : scrollClasses;

  if (tasks.length === 0) {
    return (
      <div
        className={`${containerClassName} flex flex-col items-center justify-center min-h-[50vh]`}
      >
        <div
          className={cn(
            'mb-6 rounded-[28px] bg-[var(--surface)] shadow-[var(--shadow-card)]',
            isDesktop ? 'p-12 shadow-sm border border-[var(--border)]' : 'p-8'
          )}
        >
          <Calendar
            size={isDesktop ? 64 : 48}
            className="text-[var(--accent)] opacity-80"
            strokeWidth={1.5}
          />
        </div>
        <p
          className={cn(
            'font-bold text-[var(--ink)] font-[var(--font-display)]',
            isDesktop ? 'text-2xl' : 'text-xl'
          )}
        >
          План пуст
        </p>
        <p className="text-sm text-[var(--muted)] mt-1 mb-6">
          На этот день задач нет
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl bg-[var(--surface-2)] px-6 py-3 text-sm font-bold text-[var(--accent)] transition-colors active:scale-95 hover:bg-[var(--surface)] border border-[var(--border)]"
        >
          Создать задачу
        </button>
      </div>
    );
  }

  const isActiveTask = (task: Task) =>
    Boolean(task.activeStartedAt) && !task.completed;
  const isPinnedTask = (task: Task) =>
    task.isPinned && !task.completed && !isActiveTask(task);
  const isNormalTask = (task: Task) =>
    !task.completed && !isActiveTask(task) && !task.isPinned;

  const activeTasks = tasks.filter(isActiveTask);
  const pinnedTasks = tasks.filter(isPinnedTask);
  const normalTasks = tasks.filter(isNormalTask);
  const completedTasks = tasks.filter((task) => task.completed);

  const renderGroup = (
    groupTasks: Task[],
    canReorder: boolean,
    groupKey: string
  ) => {
    if (groupTasks.length === 0) return null;
    const taskById = new Map(groupTasks.map((task) => [task.clientId, task]));
    return (
      <Reorder.Group
        key={`${dateKey}-${groupKey}`}
        axis="y"
        values={groupTasks.map((task) => task.clientId)}
        onReorder={(nextIds) => {
          if (!canReorder) return;
          const nextTasks = nextIds
            .map((id) => taskById.get(id))
            .filter((task): task is Task => Boolean(task));
          if (nextTasks.length === groupTasks.length) {
            onReorder(nextTasks);
          }
        }}
        as="ul"
        role="list"
        className={isDesktop ? 'space-y-4' : 'relative'}
      >
        {!listMotionEnabled ? (
          groupTasks.map((task) => (
            <TaskItem
              key={task.clientId}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onMove={onMove}
              isActive={isActiveTask(task)}
              onToggleActive={onToggleActive}
              updateTask={updateTask}
              isDesktop={isDesktop}
              canReorder={canReorder}
            />
          ))
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {groupTasks.map((task) => (
              <TaskItem
                key={task.clientId}
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
                onMove={onMove}
                isActive={isActiveTask(task)}
                onToggleActive={onToggleActive}
                updateTask={updateTask}
                isDesktop={isDesktop}
                canReorder={canReorder}
              />
            ))}
          </AnimatePresence>
        )}
      </Reorder.Group>
    );
  };

  return (
    <div ref={scrollContainerRef} className={containerClassName}>
      {renderGroup(activeTasks, false, 'active')}
      {renderGroup(pinnedTasks, true, 'pinned')}
      {renderGroup(normalTasks, true, 'normal')}
      {renderGroup(completedTasks, false, 'completed')}
      <div className="h-4" />
    </div>
  );
}
