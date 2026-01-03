import { memo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { addDays, format } from 'date-fns';
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  GripVertical,
  Pencil,
  Sunrise,
  Trash2,
  X,
} from 'lucide-react';
import type { Task } from '../types/task';
import { cn } from '../lib/cn';
import { useHaptic } from '../hooks/useHaptic';

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onMove: (id: string, nextDateKey: string) => void;
};

const TaskItem = memo(function TaskItem({
  task,
  onToggle,
  onDelete,
  onEdit,
  onMove,
}: TaskItemProps) {
  const { impact, selection } = useHaptic();
  const dragControls = useDragControls();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const toggleExpand = () => {
    selection();
    setIsExpanded((prev) => {
      const next = !prev;
      if (!next) {
        setPendingDate(null);
      }
      return next;
    });
  };

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpand();
    }
  };

  const currentKey = format(task.date, 'yyyy-MM-dd');

  const handleMoveToDate = (dateStr: string) => {
    if (!dateStr || dateStr === currentKey) return;
    impact('medium');
    onMove(task.id, dateStr);
    setPendingDate(null);
  };

  const handleMoveTomorrow = () => {
    const tomorrow = addDays(task.date, 1);
    handleMoveToDate(format(tomorrow, 'yyyy-MM-dd'));
  };

  const effectivePickerValue = pendingDate ?? currentKey;
  const hasPendingChange = pendingDate != null && pendingDate !== currentKey;

  return (
    <Reorder.Item
      value={task}
      id={task.id}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative mb-3 overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow-card)] transition-colors border border-transparent transform-gpu will-change-transform',
        isExpanded
          ? 'ring-2 ring-[var(--surface-2)] shadow-none z-10'
          : 'hover:border-[var(--border)]'
      )}
      style={{ transformOrigin: 'center' }}
      as="li"
    >
      <motion.div
        layout="position"
        className={cn(
          'flex flex-col relative',
          isExpanded && 'bg-[var(--surface-2)]/30'
        )}
      >
        <div className="flex items-start gap-3.5 p-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.8 }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              impact('medium');
              onToggle(task.id);
            }}
            aria-pressed={task.completed}
            aria-label={
              task.completed
                ? 'Отметить как невыполненную'
                : 'Отметить как выполненную'
            }
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[2px] transition-colors',
              task.completed
                ? 'border-[var(--accent)] bg-[var(--accent)]'
                : 'border-[var(--muted)]/30 hover:border-[var(--accent)]'
            )}
          >
            {task.completed && (
              <Check
                size={14}
                strokeWidth={3.5}
                className="text-[var(--accent-ink)]"
              />
            )}
          </motion.button>

          <div
            className="flex-1 min-w-0 cursor-pointer pt-0.5 select-none touch-manipulation"
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onClick={toggleExpand}
            onKeyDown={handleKeyDown}
          >
            <p
              className={cn(
                'text-[17px] font-medium leading-snug transition-colors',
                task.completed
                  ? 'text-[var(--muted)] line-through'
                  : 'text-[var(--ink)]',
                !isExpanded && 'truncate'
              )}
            >
              {task.title}
            </p>
            {!task.completed && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--muted)]">
                  <Clock size={10} strokeWidth={2.5} /> {task.duration} мин
                </div>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11px] font-semibold text-[var(--accent)] flex items-center"
                  >
                    Опции
                    <ChevronDown size={10} className="rotate-180 ml-0.5" />
                  </motion.span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="Перетащить"
            className="p-2 -m-2 text-[var(--muted)] opacity-30 active:opacity-100 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              impact('light');
              dragControls.start(event);
            }}
          >
            <GripVertical size={20} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 pl-[3.5rem]">
                {!task.completed ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDate(null);
                        handleMoveTomorrow();
                      }}
                      className="col-span-1 flex flex-col items-center justify-center gap-1 h-[72px] rounded-2xl bg-[var(--surface-2)] text-[var(--ink)] active:scale-95 transition-all relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-[var(--accent)]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Sunrise size={22} className="text-[var(--accent)] mb-0.5" />
                      <span className="text-[12px] font-bold">Завтра</span>
                    </button>

                    <div className="col-span-1 relative h-[72px]">
                      {hasPendingChange ? (
                        <div className="absolute inset-0 flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (pendingDate) {
                                handleMoveToDate(pendingDate);
                              }
                            }}
                            className="flex-1 w-full bg-[var(--ink)] text-[var(--bg)] rounded-t-2xl flex items-center justify-center gap-1.5 active:opacity-90 transition-opacity"
                          >
                            <Check size={14} strokeWidth={3} />
                            <span className="text-[11px] font-bold">ОК</span>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPendingDate(null);
                            }}
                            className="flex-1 w-full bg-[var(--surface-2)] text-[var(--muted)] rounded-b-2xl flex items-center justify-center gap-1.5 active:bg-[var(--border)] transition-colors"
                          >
                            <X size={14} strokeWidth={3} />
                            <span className="text-[11px] font-bold">Отмена</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="date"
                            value={effectivePickerValue}
                            onChange={(event) => setPendingDate(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            aria-label="Выбрать дату"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--surface-2)] text-[var(--ink)] pointer-events-none">
                            <Calendar
                              size={22}
                              className="text-[var(--muted)] mb-0.5"
                            />
                            <span className="text-[12px] font-bold">Дата</span>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(task);
                      }}
                      className="col-span-1 flex items-center justify-center gap-2 h-[56px] rounded-2xl bg-[var(--surface-2)] text-[var(--ink)] font-bold text-[13px] active:scale-95 transition-all hover:bg-[var(--border)]"
                    >
                      <Pencil size={18} /> Изменить
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(task.id);
                      }}
                      className="col-span-1 flex items-center justify-center gap-2 h-[56px] rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)] font-bold text-[13px] active:scale-95 transition-all hover:bg-[var(--danger)]/20"
                    >
                      <Trash2 size={18} /> Удалить
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 h-[56px] rounded-2xl bg-[var(--surface-2)] text-[var(--danger)] font-bold text-[13px] active:scale-95 transition-all"
                  >
                    <Trash2 size={18} /> Удалить задачу
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Reorder.Item>
  );
});

export default TaskItem;
