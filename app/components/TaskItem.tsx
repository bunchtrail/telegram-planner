import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { addDays, format } from 'date-fns';
import { Reorder, motion, useDragControls, AnimatePresence } from 'framer-motion';
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
  CornerDownLeft,
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
  const { impact, selection, notification } = useHaptic();
  const dragControls = useDragControls();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [newStep, setNewStep] = useState('');
  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState<number | 'auto'>('auto');
  const inputRef = useRef<HTMLInputElement>(null);

  const focusSubtaskInput = (preventScroll = false) => {
    const input = inputRef.current;
    if (!input) return;
    if (preventScroll) {
      try {
        input.focus({ preventScroll: true });
        return;
      } catch {
        input.focus();
        return;
      }
    }
    input.focus();
  };

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
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
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
  const isAllStepsDone = totalSteps > 0 && completedSteps === totalSteps;

  const toggleSubtask = (idx: number) => {
    impact('light');
    const nextChecklist = task.checklist.map((item, index) =>
      index === idx ? { ...item, done: !item.done } : item
    );
    updateTask(task.id, { checklist: nextChecklist });
  };

  const deleteSubtask = (idx: number) => {
    notification('warning');
    const nextChecklist = task.checklist.filter((_, index) => index !== idx);
    updateTask(task.id, { checklist: nextChecklist });
  };

  const addSubtask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newStep.trim();
    if (!trimmed) return;
    impact('medium');
    updateTask(task.id, {
      checklist: [...task.checklist, { text: trimmed, done: false }],
    });
    setNewStep('');

    requestAnimationFrame(() => {
      focusSubtaskInput(true);
    });
  };

  const handleSubtaskPointerDown = (
    event: ReactPointerEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
      return;
    }
    event.preventDefault();
    focusSubtaskInput(true);
  };

  useLayoutEffect(() => {
    if (!isExpanded) return;
    const el = detailsRef.current;
    if (!el) return;

    const updateHeight = () => setDetailsHeight(el.scrollHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    isExpanded,
    pendingDate,
    task.checklist.length,
    isActive,
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
                    className="text-[var(--accent)] fill-current rotate-45 flex-shrink-0"
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
                {totalSteps > 0 && !isExpanded && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] opacity-80">
                    <div
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isAllStepsDone ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
                      )}
                    />
                    <span>
                      {completedSteps}/{totalSteps}
                    </span>
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

                <div className="bg-[var(--surface-2)]/30 rounded-[20px] p-3 border border-[var(--border)]/50">
                  <div className="flex items-center justify-between mb-3 pl-1 pr-1">
                    <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
                      <span>Подзадачи</span>
                      <span className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[var(--ink)] tabular-nums">
                        {completedSteps}/{totalSteps}
                      </span>
                    </div>
                  </div>

                  {totalSteps > 0 && (
                    <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full mb-4 overflow-hidden">
                      <motion.div
                        className={cn(
                          'h-full transition-colors duration-500',
                          isAllStepsDone ? 'bg-[var(--accent)]' : 'bg-[var(--ink)]'
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'circOut' }}
                      />
                    </div>
                  )}

                  <ul className="space-y-1">
                    <AnimatePresence initial={false}>
                      {task.checklist.map((item, idx) => (
                        <motion.li
                          key={`${task.id}-subtask-${idx}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="group flex items-center gap-3 w-full bg-[var(--surface)] hover:bg-[var(--surface-2)] rounded-xl px-2.5 py-2 transition-colors border border-transparent hover:border-[var(--border)]/50 shadow-sm">
                            <button
                              type="button"
                              onClick={() => toggleSubtask(idx)}
                              className={cn(
                                'flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-colors duration-200',
                                item.done
                                  ? 'bg-[var(--ink)] border-[var(--ink)]'
                                  : 'border-[var(--muted)]/40 hover:border-[var(--accent)]'
                              )}
                            >
                              {item.done && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 25,
                                  }}
                                >
                                  <Check
                                    size={12}
                                    className="text-[var(--bg)]"
                                    strokeWidth={3.5}
                                  />
                                </motion.div>
                              )}
                            </button>

                            <span
                              className={cn(
                                'text-[14px] flex-1 leading-snug break-words transition-all duration-300 select-none cursor-pointer font-medium',
                                item.done
                                  ? 'text-[var(--muted)] line-through decoration-[var(--muted)] decoration-2'
                                  : 'text-[var(--ink)]'
                              )}
                              onClick={() => toggleSubtask(idx)}
                            >
                              {item.text}
                            </span>

                            <button
                              type="button"
                              onClick={() => deleteSubtask(idx)}
                              className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--muted)]/40 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all active:scale-90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>

                  <form onSubmit={addSubtask} className="mt-2 relative group">
                    <div className="flex items-center gap-3 w-full bg-transparent rounded-xl px-2.5 py-1.5 border border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface)] transition-all focus-within:border-[var(--accent)] focus-within:bg-[var(--surface)] focus-within:shadow-sm">
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--muted)]">
                        <Plus size={16} />
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        value={newStep}
                        onChange={(event) => setNewStep(event.target.value)}
                        onPointerDown={handleSubtaskPointerDown}
                        placeholder="Добавить шаг..."
                        className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--muted)]/60 text-[var(--ink)] min-w-0"
                      />
                      <button
                        type="submit"
                        disabled={!newStep.trim()}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--ink)] text-[var(--bg)] opacity-0 scale-75 transition-all disabled:opacity-0 group-focus-within:opacity-100 group-focus-within:scale-100 disabled:group-focus-within:opacity-30 disabled:group-focus-within:scale-90"
                      >
                        <CornerDownLeft size={12} strokeWidth={3} />
                      </button>
                    </div>
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
