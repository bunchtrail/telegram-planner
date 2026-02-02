import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { addDays, format } from 'date-fns';
import {
  Reorder,
  motion,
  useDragControls,
  useMotionTemplate,
  useMotionValue,
  animate,
  useReducedMotion,
  AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  CornerDownLeft,
  GripVertical,
  Pause,
  Pencil,
  Pin,
  Play,
  Plus,
  Sunrise,
  Trash2,
  X,
} from 'lucide-react';
import type { Task } from '../types/task';
import { cn } from '../lib/cn';
import { useHaptic } from '../hooks/useHaptic';
import { isIOSDevice } from '../lib/platform';

type TaskItemProps = {
  task: Task;
  onToggle: (id: string, coords?: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onMove: (id: string, nextDateKey: string) => void;
  isActive: boolean;
  onToggleActive: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  isDesktop?: boolean;
  canReorder?: boolean;
};

interface CustomCSSProperties extends CSSProperties {
  '--task-color'?: string;
}

function ActiveBorder({ color }: { color: string }) {
  const angle = useMotionValue(0);

  useEffect(() => {
    const controls = animate(angle, 360, {
      duration: 3,
      ease: 'linear',
      repeat: Infinity,
    });
    return controls.stop;
  }, [angle]);

  const background = useMotionTemplate`conic-gradient(from ${angle}deg, transparent 0%, ${color} 50%, transparent 100%)`;

  return (
    <motion.div
      className="absolute inset-[-2px] rounded-[30px] z-0 opacity-60 pointer-events-none"
      style={{ background }}
    />
  );
}

function ActiveWave() {
  return (
    <div className="flex items-end gap-[2px] h-3 pb-[1px] mx-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-[2px] bg-current rounded-full"
          animate={{ height: [3, 10, 3] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

const TaskItem = memo(function TaskItem({
  task,
  onToggle,
  onDelete,
  onEdit,
  onMove,
  isActive,
  onToggleActive,
  updateTask,
  isDesktop = false,
  canReorder = true,
}: TaskItemProps) {
  const { impact, selection, notification } = useHaptic();
  const dragControls = useDragControls();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [newStep, setNewStep] = useState('');
  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState<number | 'auto'>('auto');
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isIOS = isIOSDevice();
  const reduceEffects = prefersReducedMotion || isIOS;
  const listMotionEnabled = !reduceEffects;
  const [tickNow, setTickNow] = useState(() => Date.now());
  const startTimeLabel =
    task.startMinutes != null
      ? `${String(Math.floor(task.startMinutes / 60)).padStart(2, '0')}:${String(
          task.startMinutes % 60
        ).padStart(2, '0')}`
      : null;

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

  useEffect(() => {
    if (!isActive || !task.activeStartedAt) return;
    const interval = window.setInterval(() => {
      setTickNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isActive, task.activeStartedAt]);

  const elapsedMs =
    isActive && task.activeStartedAt
      ? (task.elapsedMs ?? 0) +
        Math.max(0, tickNow - task.activeStartedAt.getTime())
      : task.elapsedMs ?? 0;
  const hasElapsed = elapsedMs > 0;
  const elapsedLabel = formatElapsed(elapsedMs);
  const completedSteps = task.checklist.filter((item) => item.done).length;
  const totalSteps = task.checklist.length;
  const checklistProgress =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const isAllStepsDone = totalSteps > 0 && completedSteps === totalSteps;

  const targetMs = (task.duration || 30) * 60 * 1000;
  const timeProgress = Math.min(100, (elapsedMs / targetMs) * 100);

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
  }, [isExpanded, pendingDate, task.checklist.length, isActive]);

  return (
    <Reorder.Item
      value={task.clientId}
      id={task.clientId}
      dragListener={false}
      dragControls={dragControls}
      layout={listMotionEnabled ? 'position' : undefined}
      initial={false}
      animate={{
        opacity: task.completed ? 0.8 : 1,
        y: 0,
      }}
      exit={listMotionEnabled ? { opacity: 0, scale: 0.95 } : undefined}
      transition={
        listMotionEnabled
          ? { type: 'tween', duration: 0.18, ease: 'easeOut' }
          : { duration: 0 }
      }
      className={cn(
        'group relative overflow-hidden bg-[var(--surface)] touch-pan-y transition-[box-shadow,border-color,background-color] duration-300',
        isDesktop
          ? 'rounded-[20px] mb-3 hover:shadow-md border border-transparent hover:border-[var(--border)]'
          : 'rounded-[28px] mb-4 shadow-[var(--shadow-card)]',
        isActive
          ? 'z-20'
          : isExpanded
            ? 'shadow-[var(--shadow-pop)] z-10'
            : ''
      )}
      style={
        {
          transformOrigin: 'center',
          '--task-color': task.color,
        } as CustomCSSProperties
      }
      as="li"
    >
      {isActive && !isExpanded && (
        <>
          {!reduceEffects && (
            <motion.div
              animate={{ opacity: [0.3, 0.5, 0.3], scale: [0.98, 1.01, 0.98] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'absolute inset-0 bg-[var(--task-color)] blur-xl opacity-40 -z-10',
                isDesktop ? 'rounded-[20px]' : 'rounded-[28px]'
              )}
            />
          )}

          {!reduceEffects && <ActiveBorder color={task.color} />}

          <div
            className={cn(
              'absolute inset-0 overflow-hidden bg-[var(--surface)] z-0',
              isDesktop ? 'rounded-[20px]' : 'rounded-[28px]'
            )}
          >
            <motion.div
              className="absolute inset-0 bg-[var(--task-color)] opacity-[0.08]"
              initial={reduceEffects ? false : { width: 0 }}
              animate={{ width: `${timeProgress}%` }}
              transition={
                reduceEffects ? { duration: 0 } : { duration: 1, ease: 'linear' }
              }
            />
          </div>
        </>
      )}

      <div
        className={cn(
          'flex flex-col relative z-10 rounded-[inherit]',
          isExpanded && !isActive && 'bg-[var(--muted)]/5'
        )}
      >
        <div className={cn('flex items-start gap-4 pr-3', isDesktop ? 'p-6' : 'p-5')}>
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
            className={cn(
              'relative flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-300 mt-1',
              isDesktop ? 'h-7 w-7' : 'h-6 w-6'
            )}
            style={{
              borderColor: task.color,
              backgroundColor: task.completed ? task.color : 'transparent',
              opacity: task.completed ? 1 : 0.85,
            }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              className="absolute inset-0 h-full w-full p-0.5 text-[var(--surface)]"
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
            className="flex-1 min-w-0 cursor-pointer select-none touch-manipulation"
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
                    'font-semibold leading-snug tracking-tight transition-colors mb-1 font-[var(--font-display)]',
                    isDesktop ? 'text-xl' : 'text-[17px]',
                    task.completed
                      ? 'text-[var(--muted)] line-through decoration-2 decoration-[var(--border)]'
                      : 'text-[var(--ink)]',
                    !isExpanded && 'truncate'
                  )}
                >
                  {task.title}
                </p>
                {task.isPinned && (
                  <Pin
                    size={isDesktop ? 14 : 12}
                    className="text-[var(--accent)] fill-current rotate-45 flex-shrink-0"
                  />
                )}
              </div>
            </div>

            {!task.completed && (
              <div className="flex items-center gap-3 flex-wrap mt-1 min-h-[20px]">
                {isActive ? (
                  reduceEffects ? (
                    <div className="inline-flex items-center text-[var(--task-color)] font-bold tabular-nums">
                      <span
                        className={cn(
                          'min-w-[7ch] text-right',
                          isDesktop ? 'text-[15px]' : 'text-[14px]'
                        )}
                      >
                        {elapsedLabel}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center text-[var(--task-color)] font-bold tabular-nums animate-in fade-in duration-300">
                      <ActiveWave />
                      <span
                        className={cn(
                          'ml-1 min-w-[7ch] text-right',
                          isDesktop ? 'text-[15px]' : 'text-[14px]'
                        )}
                      >
                        {elapsedLabel}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-3 flex-wrap opacity-70">
                    {startTimeLabel && (
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-bold tabular-nums text-[var(--ink)] opacity-90">
                        {startTimeLabel}
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] opacity-80 uppercase tracking-wide">
                      <Clock size={11} strokeWidth={2.5} />
                      <span>{task.duration} мин</span>
                    </div>

                    {hasElapsed && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] opacity-80 uppercase tracking-wide">
                        <span>Факт: {elapsedLabel}</span>
                      </div>
                    )}

                    {totalSteps > 0 && !isExpanded && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] opacity-80">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: isAllStepsDone
                              ? task.color
                              : 'var(--muted)',
                          }}
                        />
                        <span>
                          {completedSteps}/{totalSteps}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {isExpanded && !isDesktop && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11px] font-semibold text-[var(--muted)] flex items-center ml-auto mr-2"
                  >
                    Опции
                    <ChevronDown size={10} className="rotate-180 ml-0.5" />
                  </motion.span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isExpanded && !task.completed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  impact('medium');
                  onToggleActive(task.id);
                }}
                className={cn(
                  'flex items-center justify-center rounded-full transition-all active:scale-90 relative z-20',
                  isDesktop ? 'h-9 w-9' : 'h-8 w-8',
                  isActive
                    ? 'bg-[var(--task-color)] text-[var(--bg)] shadow-lg'
                    : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)]'
                )}
              >
                {isActive ? (
                  <Pause size={isDesktop ? 16 : 14} fill="currentColor" />
                ) : (
                  <Play
                    size={isDesktop ? 16 : 14}
                    fill="currentColor"
                    className="ml-0.5"
                  />
                )}
              </button>
            )}

            {!isDesktop ? (
              <button
                type="button"
                aria-label="Перетащить"
                className={cn(
                  'h-8 w-8 flex items-center justify-center text-[var(--muted)] opacity-20 group-hover:opacity-50 transition-opacity touch-none -mr-1',
                  canReorder
                    ? 'cursor-grab active:cursor-grabbing'
                    : 'cursor-not-allowed opacity-10'
                )}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!canReorder) return;
                  impact('light');
                  dragControls.start(event);
                }}
              >
                <GripVertical size={20} />
              </button>
            ) : (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                  title="Изменить"
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveTomorrow();
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                  title="На завтра"
                >
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={18} />
                </button>
                <div
                  className={cn(
                    'h-9 w-6 flex items-center justify-center text-[var(--muted)] opacity-20 hover:opacity-100',
                    canReorder
                      ? 'cursor-grab active:cursor-grabbing'
                      : 'cursor-not-allowed opacity-10'
                  )}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!canReorder) return;
                    dragControls.start(event);
                  }}
                >
                  <GripVertical size={18} />
                </div>
              </div>
            )}
          </div>
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? detailsHeight : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={
            reduceEffects ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }
          }
          className="overflow-hidden"
          style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
        >
          <div
            ref={detailsRef}
            className={cn(
              'px-4 pb-4 pt-0 pl-[3.5rem] md:pl-[4.5rem] md:pr-6 space-y-3 md:space-y-4',
              isDesktop && 'pt-2'
            )}
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
                  className={cn(
                    'w-full h-[52px] md:h-[60px] rounded-[18px] flex items-center justify-center gap-2 text-[14px] md:text-[16px] font-bold transition-[transform,colors] duration-200 active:scale-[0.98] relative overflow-hidden',
                    isActive
                      ? 'bg-[var(--task-color)] text-[var(--bg)] shadow-lg shadow-[var(--task-color)]/20'
                      : 'bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--border)]'
                  )}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: 'linear',
                      }}
                    />
                  )}

                  <div className="relative z-10 flex items-center gap-2">
                    {isActive ? (
                      <>
                        <Pause size={18} fill="currentColor" />
                        <span>Пауза</span>
                        <span className="tabular-nums opacity-90 ml-1 min-w-[7ch] text-right">
                          {elapsedLabel}
                        </span>
                      </>
                    ) : (
                      <>
                        <Play size={18} fill="currentColor" />
                        <span>Запустить таймер</span>
                        {hasElapsed && (
                          <span className="opacity-60 text-xs font-medium">
                            ({elapsedLabel})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDate(null);
                      handleMoveTomorrow();
                    }}
                    className="col-span-1 flex flex-col items-center justify-center gap-1 h-[64px] md:h-[72px] rounded-[18px] bg-[var(--surface-2)] text-[var(--ink)] active:scale-95 transition-[transform,colors] duration-200 relative overflow-hidden group hover:bg-[var(--border)]"
                  >
                    <Sunrise size={20} className="text-[var(--accent)] mb-0.5" />
                    <span className="text-[12px] font-bold">Завтра</span>
                  </button>

                  <div className="col-span-1 relative h-[64px] md:h-[72px]">
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
                        className="h-full transition-colors duration-500"
                        style={{
                          backgroundColor: isAllStepsDone
                            ? task.color
                            : 'var(--ink)',
                        }}
                        initial={reduceEffects ? false : { width: 0 }}
                        animate={{ width: `${checklistProgress}%` }}
                        transition={
                          reduceEffects
                            ? { duration: 0 }
                            : { duration: 0.5, ease: 'circOut' }
                        }
                      />
                    </div>
                  )}

                  <ul className="space-y-1">
                    {reduceEffects ? (
                      task.checklist.map((item, idx) => (
                        <li key={`${task.id}-subtask-${idx}`}>
                          <div className="group flex items-center gap-3 w-full bg-[var(--surface)] rounded-xl px-2.5 py-2 border border-transparent shadow-sm">
                            <button
                              type="button"
                              onClick={() => toggleSubtask(idx)}
                              className={cn(
                                'flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center',
                                item.done
                                  ? 'bg-[var(--ink)] border-[var(--ink)]'
                                  : 'border-[var(--muted)]/40'
                              )}
                            >
                              {item.done && (
                                <Check
                                  size={12}
                                  className="text-[var(--bg)]"
                                  strokeWidth={3.5}
                                />
                              )}
                            </button>

                            <span
                              className={cn(
                                'text-[14px] flex-1 leading-snug break-words select-none cursor-pointer font-medium',
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
                              className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--muted)]/40 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 active:scale-90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </li>
                      ))
                    ) : (
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
                    )}
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

                {!isDesktop ? (
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
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 h-[52px] rounded-[18px] bg-[var(--danger)]/10 text-[var(--danger)] font-bold text-[13px] active:scale-95 transition-[transform,colors] duration-200 hover:bg-[var(--danger)]/20"
                  >
                    <Trash2 size={18} /> Удалить задачу
                  </button>
                )}
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
      </div>
    </Reorder.Item>
  );
});

export default TaskItem;
