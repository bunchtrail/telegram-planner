import { useEffect, useRef } from 'react';
import { AnimatePresence, Reorder, useReducedMotion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Calendar, Loader2 } from 'lucide-react';
import type { Task } from '../types/task';
import TaskItem from './TaskItem';
import { isIOSDevice } from '../lib/platform';

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
  isReorderMode: boolean;
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
  isReorderMode,
}: TaskListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevTaskIdsRef = useRef<Set<string>>(new Set());
  const prefersReducedMotion = useReducedMotion();
  const isIOS = isIOSDevice();
  const reduceMotion = prefersReducedMotion || isIOS;
  const enableVirtualization = !isReorderMode && tasks.length > 18;
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: enableVirtualization ? tasks.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 110,
    overscan: 6,
    getItemKey: (index) => tasks[index]?.clientId ?? index,
    measureElement: (element) => {
      if (!(element instanceof HTMLElement)) return element.getBoundingClientRect().height;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const marginTop = Number.parseFloat(style.marginTop) || 0;
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;
      return rect.height + marginTop + marginBottom;
    },
  });

  useEffect(() => {
    if (enableVirtualization) {
      virtualizer.measure();
    }
  }, [enableVirtualization, tasks, virtualizer]);

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

  const shouldAnimateList = !reduceMotion && !enableVirtualization;
  const virtualItems = enableVirtualization ? virtualizer.getVirtualItems() : [];

  return (
    <div ref={scrollContainerRef} className={scrollClasses}>
      {isReorderMode ? (
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
                onToggleActive={onToggleActive}
                updateTask={updateTask}
                isReorderMode
                enableMotion={!reduceMotion}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      ) : enableVirtualization ? (
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualItems.map((virtualRow) => {
            const task = tasks[virtualRow.index];
            if (!task) return null;
            return (
              <TaskItem
                key={task.clientId}
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
                onMove={onMove}
                isActive={Boolean(task.activeStartedAt) && !task.completed}
                onToggleActive={onToggleActive}
                updateTask={updateTask}
                enableMotion={false}
                containerRef={(node) => {
                  if (node) virtualizer.measureElement(node);
                }}
                containerDataIndex={virtualRow.index}
                containerStyle={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            );
          })}
        </div>
      ) : (
        <ul role="list" className="relative">
          {shouldAnimateList ? (
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
                  onToggleActive={onToggleActive}
                  updateTask={updateTask}
                  enableMotion
                />
              ))}
            </AnimatePresence>
          ) : (
            tasks.map((task) => (
              <TaskItem
                key={task.clientId}
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
                onMove={onMove}
                isActive={Boolean(task.activeStartedAt) && !task.completed}
                onToggleActive={onToggleActive}
                updateTask={updateTask}
                enableMotion={false}
              />
            ))
          )}
        </ul>
      )}
      <div className="h-4" />
    </div>
  );
}
