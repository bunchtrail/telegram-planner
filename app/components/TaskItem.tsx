import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from 'react';
import { addDays, format } from 'date-fns';
import { Reorder, motion, useDragControls } from 'framer-motion';
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  GripVertical,
  Pin,
  Pencil,
  Plus,
  Sunrise,
  Trash2,
  X,
} from 'lucide-react';
import type { Task } from '../types/task';
import { cn } from '../lib/cn';
import { useHaptic } from '../hooks/useHaptic';

type TaskItemProps = {
  task: Task;
  onToggle: (id: string, coords?: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onMove: (id: string, nextDateKey: string) => void;
  isActive: boolean;
  elapsedMs: number;
  onToggleActive: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
};

const TaskItem = memo(function TaskItem({
  task,
  onToggle,
  onDelete,
  onEdit,
  onMove,
  isActive,
  elapsedMs,
  onToggleActive,
  updateTask,
}: TaskItemProps) {
  const { impact, selection } = useHaptic();
  const dragControls = useDragControls();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [newStep, setNewStep] = useState('');
  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState(0);

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

  const formatElapsed = (value: number) => {
    const totalSeconds = Math.floor(value / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(
        seconds
      ).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };
  const hasElapsed = elapsedMs > 0;
  const elapsedLabel = formatElapsed(elapsedMs);
  const completedSteps = task.checklist.filter((item) => item.done).length;
  const totalSteps = task.checklist.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const toggleSubtask = (idx: number) => {
    impact('light');
    const nextChecklist = task.checklist.map((item, index) =>
      index === idx ? { ...item, done: !item.done } : item
    );
    updateTask(task.id, { checklist: nextChecklist });
  };

  const addSubtask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newStep.trim();
    if (!trimmed) return;
    impact('light');
    updateTask(task.id, {
      checklist: [...task.checklist, { text: trimmed, done: false }],
    });
    setNewStep('');
  };

  useLayoutEffect(() => {
    if (!isExpanded) return;
    const el = detailsRef.current;
    if (!el) return;
    const update = () => {
      setDetailsHeight(el.scrollHeight);
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [
    isExpanded,
    pendingDate,
    task.completed,
    task.checklist,
    task.isPinned,
    isActive,
    elapsedMs,
  ]);

  return (
    <Reorder.Item
      value={task}
      id={task.clientId}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      initial={false}
      animate={{ opacity: task.completed ? 0.8 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'relative mb-3 overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow-card)] border border-l-[5px] transform-gpu will-change-transform transition-colors duration-200',
        isActive
          ? 'shadow-[var(--shadow-glow)] border-[var(--accent)]/50 bg-[var(--surface)] z-10'
          : isExpanded
            ? 'ring-2 ring-[var(--surface-2)] border-transparent shadow-none z-10'
            : 'border-transparent hover:border-[var(--border)]',
      )}
      style={{ transformOrigin: 'center', borderLeftColor: task.color }}
      as="li"
    >
      <motion.div
        className={cn(
          'flex flex-col relative',
          isExpanded && 'bg-[var(--surface-2)]/30'
        )}
      >
        <div className="flex items-center gap-3.5 p-3.5 pl-4 pr-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              impact(task.completed ? 'light' : 'medium');
              const rect = event.currentTarget.getBoundingClientRect();
              const x = rect.left + rect.width / 2;
              const y = rect.top + rect.height / 2;
              onToggle(task.id, { x, y });
            }}
            aria-pressed={task.completed}
            aria-label={
              task.completed
                ? 'Отметить как невыполненную'
                : 'Отметить как выполненную'
            }
            className={cn(
              'relative flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border-[2px] transition-colors duration-300',
              task.completed
                ? 'border-[var(--accent)] bg-[var(--accent)]'
                : 'border-[var(--muted)]/30 hover:border-[var(--accent)] bg-[var(--surface-2)]'
            )}
          >
            <motion.svg
              viewBox="0 0 24 24"
              className="absolute inset-0 h-full w-full p-1 text-[var(--accent-ink)]"
              initial={false}
              animate={task.completed ? 'checked' : 'unchecked'}
            >
              <motion.path
                d="M20 6L9 17l-5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={{
                  checked: {
                    pathLength: 1,
                    opacity: 1,
                    transition: { duration: 0.3, type: 'spring' },
                  },
                  unchecked: {
                    pathLength: 0,
                    opacity: 0,
                    transition: { duration: 0.2 },
                  },
                }}
              />
            </motion.svg>
          </motion.button>

          <div
            className="flex-1 min-w-0 cursor-pointer select-none touch-manipulation py-1"
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onClick={toggleExpand}
            onKeyDown={handleKeyDown}
          >
            <div className="relative w-full max-w-full">
              <div className="flex items-center gap-2 min-w-0">
                <p
                  className={cn(
                    'text-[17px] font-semibold leading-tight transition-colors mb-1.5 font-[var(--font-display)]',
                    task.completed
                      ? 'text-[var(--muted)]'
                      : 'text-[var(--ink)]',
                    !isExpanded && 'truncate'
                  )}
                >
                  {task.title}
                </p>
                {task.isPinned && (
                  <Pin
                    size={12}
                    className="text-[var(--accent)] fill-current rotate-45"
                  />
                )}
              </div>
              <motion.div
                initial={false}
                animate={{ scaleX: task.completed ? 1 : 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute top-[0.65em] left-0 h-[2px] w-full bg-[var(--muted)] opacity-60 pointer-events-none rounded-full origin-left"
              />
            </div>
            {!task.completed && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] opacity-80 uppercase tracking-wide">
                  <Clock size={11} strokeWidth={2.5} />
                  <span>{task.duration} мин</span>
                </div>
                {(isActive || hasElapsed) && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold border uppercase tracking-wide shadow-sm',
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                        : 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--border)]'
                    )}
                  >
                    {isActive && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                      </span>
                    )}
                    <Clock size={10} strokeWidth={2.5} />
                    {isActive ? 'В работе' : 'Факт'} {elapsedLabel}
                  </div>
                )}
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11px] font-semibold text-[var(--accent)] flex items-center ml-auto mr-2"
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
            className="h-10 w-10 flex items-center justify-center text-[var(--muted)] opacity-30 active:opacity-100 cursor-grab active:cursor-grabbing touch-none -mr-1"
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

        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? detailsHeight : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="overflow-hidden"
          style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
        >
          <div
            ref={detailsRef}
            className="px-4 pb-4 pt-0 pl-[3.5rem] space-y-3"
          >
            {!task.completed ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    impact('light');
                    onToggleActive(task.id);
                  }}
                  aria-pressed={isActive}
                  className={cn(
                    'w-full h-[52px] rounded-[18px] flex items-center justify-center gap-2 text-[13px] font-bold transition-[transform,colors] duration-200 active:scale-[0.98]',
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--shadow-soft)]'
                      : 'bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--border)]'
                  )}
                >
                  <Clock size={18} strokeWidth={2.5} />
                  {isActive ? 'Остановить' : 'Запустить таймер'}
                  {(isActive || hasElapsed) && (
                    <span className="opacity-80 tabular-nums font-medium ml-1">
                      {elapsedLabel}
                    </span>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDate(null);
                      handleMoveTomorrow();
                    }}
                    className="col-span-1 flex flex-col items-center justify-center gap-1 h-[64px] rounded-[18px] bg-[var(--surface-2)] text-[var(--ink)] active:scale-95 transition-[transform,colors] duration-200 relative overflow-hidden group hover:bg-[var(--border)]"
                  >
                    <Sunrise size={20} className="text-[var(--accent)] mb-0.5" />
                    <span className="text-[12px] font-bold">Завтра</span>
                  </button>

                  <div className="col-span-1 relative h-[64px]">
                    {hasPendingChange ? (
                      <div className="absolute inset-0 flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (pendingDate) handleMoveToDate(pendingDate);
                          }}
                          className="flex-1 w-full bg-[var(--ink)] text-[var(--bg)] rounded-t-[18px] flex items-center justify-center gap-1.5 active:opacity-90"
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPendingDate(null);
                          }}
                          className="flex-1 w-full bg-[var(--surface-2)] text-[var(--muted)] rounded-b-[18px] flex items-center justify-center gap-1.5 active:bg-[var(--border)]"
                        >
                          <X size={14} strokeWidth={3} />
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
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[18px] bg-[var(--surface-2)] text-[var(--ink)] pointer-events-none hover:bg-[var(--border)] transition-colors">
                          <Calendar
                            size={20}
                            className="text-[var(--muted)] mb-0.5"
                          />
                          <span className="text-[12px] font-bold">Дата</span>
                        </div>
                      </>
                    )}
                  </div>

                </div>

                <div className="bg-[var(--surface-2)]/50 rounded-xl p-3">
                  <div className="flex justify-between text-[10px] font-bold text-[var(--muted)] uppercase mb-2">
                    <span>Подзадачи</span>
                    <span>
                      {completedSteps}/{totalSteps}
                    </span>
                  </div>

                  {totalSteps > 0 && (
                    <div className="h-1 w-full bg-[var(--border)] rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    {task.checklist.map((item, idx) => (
                      <button
                        key={`${task.id}-${idx}`}
                        type="button"
                        onClick={() => toggleSubtask(idx)}
                        className="flex items-center gap-2 w-full text-left group"
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                            item.done
                              ? 'bg-[var(--ink)] border-[var(--ink)]'
                              : 'border-[var(--muted)]'
                          )}
                        >
                          {item.done && (
                            <Check
                              size={10}
                              className="text-[var(--bg)]"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-sm transition-all',
                            item.done && 'line-through opacity-50'
                          )}
                        >
                          {item.text}
                        </span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={addSubtask} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={newStep}
                      onChange={(event) => setNewStep(event.target.value)}
                      placeholder="Добавить шаг..."
                      className="flex-1 bg-transparent text-sm border-b border-[var(--border)] focus:border-[var(--accent)] outline-none py-1 placeholder:text-[var(--muted)]/50"
                    />
                    <button
                      type="submit"
                      disabled={!newStep.trim()}
                      className="text-[var(--accent)] disabled:opacity-30"
                      aria-label="Добавить шаг"
                    >
                      <Plus size={18} />
                    </button>
                  </form>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      impact('light');
                      updateTask(task.id, { isPinned: !task.isPinned });
                    }}
                    className={cn(
                      'col-span-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors active:scale-95',
                      task.isPinned
                        ? 'bg-[var(--ink)] text-[var(--bg)]'
                        : 'bg-[var(--surface-2)] text-[var(--ink)]'
                    )}
                    aria-pressed={task.isPinned}
                  >
                    <Pin
                      size={14}
                      className={task.isPinned ? 'fill-current' : ''}
                    />
                    {task.isPinned ? 'Открепить' : 'Закрепить'}
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(task);
                    }}
                    className="col-span-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--surface-2)] text-[var(--ink)] font-bold text-[12px] active:scale-95 transition-[transform,colors] duration-200 hover:bg-[var(--border)]"
                  >
                    <Pencil size={16} /> Изменить
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="col-span-2 flex items-center justify-center gap-2 h-[52px] rounded-[18px] bg-[var(--danger)]/10 text-[var(--danger)] font-bold text-[13px] active:scale-95 transition-[transform,colors] duration-200 hover:bg-[var(--danger)]/20"
                  >
                    <Trash2 size={18} /> Удалить
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(task.id);
                }}
                className="w-full flex items-center justify-center gap-2 h-[52px] rounded-[18px] bg-[var(--surface-2)] text-[var(--danger)] font-bold text-[13px] active:scale-95 transition-[transform,colors] duration-200 hover:bg-[var(--danger)]/10"
              >
                <Trash2 size={18} /> Удалить задачу
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </Reorder.Item>
  );
});

export default TaskItem;
