import {
	memo,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type MouseEvent,
	type PointerEvent as ReactPointerEvent,
} from 'react';
import { addDays, format } from 'date-fns';
import {
	Reorder,
	animate,
	motion,
	useDragControls,
	useMotionTemplate,
	useMotionValue,
	useReducedMotion,
} from 'framer-motion';
import {
	ArrowRight,
	Calendar,
	Check,
	GripVertical,
	Pause,
	Pencil,
	Play,
	Sunrise,
	Trash2,
	X,
} from 'lucide-react';
import ChecklistEditor from '@/app/components/planner/shared/task/ChecklistEditor';
import TaskCard from '@/app/components/planner/shared/task/TaskCard';
import TaskCardActions from '@/app/components/planner/shared/task/TaskCardActions';
import TaskCardHeader, {
	TaskCardPin,
} from '@/app/components/planner/shared/task/TaskCardHeader';
import TaskCardMeta from '@/app/components/planner/shared/task/TaskCardMeta';
import { useHaptic } from '@/app/hooks/useHaptic';
import { cn } from '@/app/lib/cn';
import type { Task } from '@/app/types/task';

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
	reduceHeavyEffectsOnPlatform?: boolean;
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

const formatElapsed = (value: number) => {
	const totalSeconds = Math.floor(value / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(
			seconds,
		).padStart(2, '0')}`;
	}

	return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

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
	reduceHeavyEffectsOnPlatform = false,
}: TaskItemProps) {
	const { impact, notification, selection } = useHaptic();
	const dragControls = useDragControls();
	const detailsRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();
	const reduceMotion = Boolean(prefersReducedMotion);
	const reduceHeavyEffects = reduceMotion || reduceHeavyEffectsOnPlatform;
	const listMotionEnabled = !reduceMotion;

	const [detailsHeight, setDetailsHeight] = useState<number | 'auto'>('auto');
	const [isExpanded, setIsExpanded] = useState(false);
	const [pendingDate, setPendingDate] = useState<string | null>(null);
	const [tickNow, setTickNow] = useState(() => Date.now());

	const currentKey = format(task.date, 'yyyy-MM-dd');
	const effectivePickerValue = pendingDate ?? currentKey;
	const hasPendingChange = pendingDate != null && pendingDate !== currentKey;
	useEffect(() => {
		if (!isActive || !task.activeStartedAt) return;
		const interval = window.setInterval(() => {
			setTickNow(Date.now());
		}, 1000);
		return () => window.clearInterval(interval);
	}, [isActive, task.activeStartedAt]);

	useLayoutEffect(() => {
		if (!isExpanded) return;
		const element = detailsRef.current;
		if (!element) return;

		const updateHeight = () => setDetailsHeight(element.scrollHeight);
		updateHeight();

		const observer = new ResizeObserver(updateHeight);
		observer.observe(element);
		return () => observer.disconnect();
	}, [isExpanded, pendingDate, task.checklist.length, isActive]);

	const elapsedMs =
		isActive && task.activeStartedAt
			? (task.elapsedMs ?? 0) +
				Math.max(0, tickNow - task.activeStartedAt.getTime())
			: (task.elapsedMs ?? 0);
	const elapsedLabel = formatElapsed(elapsedMs);
	const hasElapsed = elapsedMs > 0;
	const targetMs = (task.duration || 30) * 60 * 1000;
	const timeProgress = Math.min(100, (elapsedMs / targetMs) * 100);

	const toggleExpand = () => {
		selection();
		setIsExpanded((previous) => {
			const next = !previous;
			if (!next) {
				setPendingDate(null);
			}
			return next;
		});
	};

	const handleMoveToDate = (nextDateKey: string) => {
		if (!nextDateKey || nextDateKey === currentKey) return;
		impact('medium');
		onMove(task.id, nextDateKey);
		setPendingDate(null);
	};

	const handleMoveTomorrow = () => {
		const tomorrow = addDays(task.date, 1);
		handleMoveToDate(format(tomorrow, 'yyyy-MM-dd'));
	};

	const handleToggleChecklistItem = (index: number) => {
		impact('light');
		updateTask(task.id, {
			checklist: task.checklist.map((item, itemIndex) =>
				itemIndex === index ? { ...item, done: !item.done } : item,
			),
		});
	};

	const handleDeleteChecklistItem = (index: number) => {
		notification('warning');
		updateTask(task.id, {
			checklist: task.checklist.filter(
				(_, itemIndex) => itemIndex !== index,
			),
		});
	};

	const handleAddChecklistItem = (value: string) => {
		impact('medium');
		updateTask(task.id, {
			checklist: [...task.checklist, { text: value, done: false }],
		});
	};

	const handleToggleComplete = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		impact(task.completed ? 'light' : 'medium');
		const rect = event.currentTarget.getBoundingClientRect();
		onToggle(task.id, {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2,
		});
	};

	const handleDragStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (!canReorder) return;
		impact('light');
		dragControls.start(event);
	};

	const headerActions = (
		<TaskCardActions isDesktop={isDesktop} variant="header">
			{!isExpanded && !task.completed ? (
				<button
					type="button"
					aria-label={
						isActive ? 'Поставить таймер на паузу' : 'Запустить таймер'
					}
					onClick={(event) => {
						event.stopPropagation();
						impact('medium');
						onToggleActive(task.id);
					}}
					className={cn(
						'flex items-center justify-center rounded-full transition-[transform,colors] active:scale-90 relative z-20',
						isDesktop ? 'h-9 w-9' : 'h-8 w-8',
						isActive
							? 'bg-[var(--task-color)] text-[var(--bg)] shadow-lg'
							: 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)]',
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
			) : null}

			{!isDesktop ? null : (
				<>
					<button
						type="button"
						aria-label="Изменить задачу"
						onClick={(event) => {
							event.stopPropagation();
							onEdit(task);
						}}
						className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors opacity-0 group-hover:opacity-100 duration-200"
						title="Изменить"
					>
						<Pencil size={18} />
					</button>
					<button
						type="button"
						aria-label="Перенести на завтра"
						onClick={(event) => {
							event.stopPropagation();
							handleMoveTomorrow();
						}}
						className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors opacity-0 group-hover:opacity-100 duration-200"
						title="На завтра"
					>
						<ArrowRight size={18} />
					</button>
					<button
						type="button"
						aria-label="Удалить задачу"
						onClick={(event) => {
							event.stopPropagation();
							onDelete(task.id);
						}}
						className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors opacity-0 group-hover:opacity-100 duration-200"
						title="Удалить"
					>
						<Trash2 size={18} />
					</button>
				</>
			)}

			<button
				type="button"
				aria-label="Перетащить"
				className={cn(
					'flex items-center justify-center text-[var(--muted)] touch-none [touch-action:none]',
					isDesktop
						? 'h-9 w-6 opacity-20 hover:opacity-100'
						: 'h-8 w-8 opacity-20 group-hover:opacity-50 transition-opacity -mr-1',
					canReorder
						? 'cursor-grab active:cursor-grabbing'
						: 'cursor-not-allowed opacity-10',
				)}
				onPointerDown={handleDragStart}
			>
				<GripVertical size={isDesktop ? 18 : 20} />
			</button>
		</TaskCardActions>
	);

	const timerButton = (
		<button
			type="button"
			aria-label={
				isActive
					? 'Поставить таймер задачи на паузу'
					: 'Запустить таймер задачи'
			}
			onClick={(event) => {
				event.stopPropagation();
				impact('light');
				onToggleActive(task.id);
			}}
			className={cn(
				'w-full h-[52px] md:h-[60px] rounded-[18px] flex items-center justify-center gap-2 text-[14px] md:text-[16px] font-bold transition-all duration-200 active:scale-[0.97] relative overflow-hidden',
				isActive ? 'text-[var(--bg)]' : 'text-[var(--ink)]',
			)}
			style={
				isActive
					? {
							background: task.color,
							boxShadow: `0 6px 20px -4px ${task.color}40`,
						}
					: {
							background: `color-mix(in srgb, ${task.color} 10%, var(--surface-2))`,
							border: `1px solid color-mix(in srgb, ${task.color} 20%, transparent)`,
						}
			}
		>
			{isActive ? (
				<div className="relative z-10 flex items-center gap-2">
					<Pause size={18} fill="currentColor" />
					<span>Пауза</span>
					<span className="tabular-nums opacity-90 ml-1 min-w-[7ch] text-right">
						{elapsedLabel}
					</span>
				</div>
			) : (
				<div className="relative z-10 flex items-center gap-2">
					<Play size={18} fill="currentColor" />
					<span>Запустить таймер</span>
					{hasElapsed ? (
						<span className="opacity-60 text-xs font-medium">
							({elapsedLabel})
						</span>
					) : null}
				</div>
			)}
		</button>
	);

	const mobileFooterActions = (
		<TaskCardActions variant="grid">
			<button
				type="button"
				aria-label={
					task.isPinned ? 'Открепить задачу' : 'Закрепить задачу'
				}
				onClick={(event) => {
					event.stopPropagation();
					impact('light');
					updateTask(task.id, {
						isPinned: !task.isPinned,
					});
				}}
				className={cn(
					'col-span-1 h-11 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 active:scale-[0.94] border',
					task.isPinned
						? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
						: 'bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]/40 hover:text-[var(--ink)]',
				)}
				aria-pressed={task.isPinned}
			>
				<TaskCardPin />
			</button>
			<button
				type="button"
				aria-label="Изменить задачу"
				onClick={(event) => {
					event.stopPropagation();
					onEdit(task);
				}}
				className="col-span-1 flex flex-col items-center justify-center gap-0.5 h-11 rounded-2xl bg-[var(--surface-2)] text-[var(--muted)] font-bold text-[10px] uppercase tracking-wide active:scale-[0.94] transition-all duration-200 border border-[var(--border)]/40 hover:text-[var(--ink)]"
			>
				<Pencil size={14} />
			</button>
			<button
				type="button"
				aria-label="Удалить задачу"
				onClick={(event) => {
					event.stopPropagation();
					onDelete(task.id);
				}}
				className="col-span-1 flex flex-col items-center justify-center gap-0.5 h-11 rounded-2xl bg-[var(--danger)]/8 text-[var(--danger)] font-bold text-[10px] uppercase tracking-wide active:scale-[0.94] transition-all duration-200 border border-[var(--danger)]/15 hover:bg-[var(--danger)]/15"
			>
				<Trash2 size={14} />
			</button>
		</TaskCardActions>
	);

	const deleteAction = (
		<TaskCardActions variant="single">
			<button
				type="button"
				aria-label="Удалить задачу"
				onClick={(event) => {
					event.stopPropagation();
					onDelete(task.id);
				}}
				className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-[var(--danger)]/8 text-[var(--danger)] font-bold text-[12px] active:scale-[0.96] transition-all duration-200 border border-[var(--danger)]/15 hover:bg-[var(--danger)]/15"
			>
				<Trash2 size={16} /> Удалить
			</button>
		</TaskCardActions>
	);

	const surfaceStyle =
		isExpanded && !isActive
			? {
					background: `color-mix(in srgb, ${task.color} 5%, var(--surface))`,
				}
			: undefined;

	const overlay =
		isActive && !isExpanded ? (
			<>
				{!reduceHeavyEffects ? (
					<motion.div
						animate={{
							opacity: [0.3, 0.5, 0.3],
							scale: [0.98, 1.01, 0.98],
						}}
						transition={{
							duration: 3,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
						className={cn(
							'absolute inset-0 bg-[var(--task-color)] blur-xl opacity-40 -z-10',
							isDesktop ? 'rounded-[20px]' : 'rounded-[28px]',
						)}
					/>
				) : null}

				{!reduceHeavyEffects ? <ActiveBorder color={task.color} /> : null}

				<div
					className={cn(
						'absolute inset-0 overflow-hidden bg-[var(--surface)] z-0',
						isDesktop ? 'rounded-[20px]' : 'rounded-[28px]',
					)}
				>
					<motion.div
						className="absolute inset-0 bg-[var(--task-color)] opacity-[0.08]"
						initial={reduceMotion ? false : { width: 0 }}
						animate={{ width: `${timeProgress}%` }}
						transition={
							reduceMotion
								? { duration: 0 }
								: { duration: 1, ease: 'linear' }
						}
					/>
				</div>
			</>
		) : null;

	return (
		<Reorder.Item
			value={task.clientId}
			id={task.clientId}
			layoutId={listMotionEnabled ? task.clientId : undefined}
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
				'group relative overflow-hidden bg-[var(--surface)] touch-pan-y',
				isDesktop
					? 'rounded-[20px] mb-3 hover:shadow-md border border-transparent hover:border-[var(--border)]'
					: 'rounded-[28px] mb-4 shadow-[var(--shadow-card)]',
				isActive
					? 'z-20'
					: isExpanded
						? 'shadow-[var(--shadow-pop)] z-10'
						: '',
			)}
			style={
				{
					transformOrigin: 'center',
					'--task-color': task.color,
					willChange: listMotionEnabled ? 'transform' : 'auto',
				} as CustomCSSProperties
			}
			as="li"
		>
			<TaskCard
				detailsHeight={detailsHeight}
				isExpanded={isExpanded}
				overlay={overlay}
				reduceMotion={reduceMotion}
				surfaceStyle={surfaceStyle}
				details={
					<div
						ref={detailsRef}
						className={cn(
							'px-4 pb-4 pt-0 pl-[3.5rem] md:pl-[4.5rem] md:pr-6 space-y-3 md:space-y-4',
							isDesktop && 'pt-2',
						)}
					>
						{!task.completed ? (
							<>
								{timerButton}

								<div className="grid grid-cols-2 gap-2 md:gap-3">
									<button
										type="button"
										aria-label="Перенести на завтра"
										onClick={(event) => {
											event.stopPropagation();
											setPendingDate(null);
											handleMoveTomorrow();
										}}
										className="col-span-1 flex flex-col items-center justify-center gap-1.5 h-[64px] md:h-[72px] rounded-[18px] bg-[var(--surface-2)] text-[var(--ink)] active:scale-[0.96] transition-all duration-200 relative overflow-hidden group border border-[var(--border)]/40 hover:border-[var(--border)]"
									>
										<div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
											<Sunrise
												size={18}
												className="text-[var(--accent)]"
											/>
										</div>
										<span className="text-[11px] font-bold uppercase tracking-wide">
											Завтра
										</span>
									</button>

									<div className="col-span-1 relative h-[64px] md:h-[72px]">
										{hasPendingChange ? (
											<div className="absolute inset-0 flex flex-col gap-0.5">
												<button
													type="button"
													aria-label="Подтвердить перенос"
													onClick={(event) => {
														event.stopPropagation();
														if (pendingDate) {
															handleMoveToDate(pendingDate);
														}
													}}
													className="flex-1 w-full bg-[var(--ink)] text-[var(--bg)] rounded-t-[18px] flex items-center justify-center gap-1.5 active:opacity-90"
												>
													<Check size={14} strokeWidth={3} />
												</button>
												<button
													type="button"
													aria-label="Отменить перенос"
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
													onChange={(event) =>
														setPendingDate(event.target.value)
													}
													onClick={(event) =>
														event.stopPropagation()
													}
													className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
													aria-label="Выбрать дату"
												/>
												<div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[18px] bg-[var(--surface-2)] text-[var(--ink)] pointer-events-none hover:bg-[var(--border)] transition-colors">
													<Calendar
														size={20}
														className="text-[var(--muted)] mb-0.5"
													/>
													<span className="text-[12px] font-bold">
														Дата
													</span>
												</div>
											</>
										)}
									</div>
								</div>

								<ChecklistEditor
									items={task.checklist}
									onAddItem={handleAddChecklistItem}
									onDeleteItem={handleDeleteChecklistItem}
									onToggleItem={handleToggleChecklistItem}
									reduceMotion={reduceMotion}
									taskColor={task.color}
									taskId={task.id}
								/>

								{!isDesktop ? mobileFooterActions : deleteAction}
							</>
						) : (
							deleteAction
						)}
					</div>
				}
			>
				<TaskCardHeader
					actions={headerActions}
					checkbox={
						<button
							type="button"
							aria-label="Отметить задачу выполненной"
							onPointerDown={(event) => event.stopPropagation()}
							onClick={handleToggleComplete}
							aria-pressed={task.completed}
							className={cn(
								'relative flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-300 mt-1',
								isDesktop ? 'h-7 w-7' : 'h-6 w-6',
							)}
							style={{
								borderColor: task.color,
								backgroundColor: task.completed
									? task.color
									: 'transparent',
								opacity: task.completed ? 1 : 0.85,
							}}
						>
							<svg
								viewBox="0 0 24 24"
								className="absolute inset-0 h-full w-full p-0.5 text-[var(--surface)]"
							>
								<path
									d="M20 6L9 17l-5-5"
									fill="none"
									stroke="currentColor"
									strokeWidth="3.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									style={{
										opacity: task.completed ? 1 : 0,
										strokeDasharray: 100,
										strokeDashoffset: task.completed ? 0 : 100,
										transition:
											'stroke-dashoffset 0.2s ease, opacity 0.2s ease',
									}}
								/>
							</svg>
						</button>
					}
					completed={task.completed}
					isDesktop={isDesktop}
					isExpanded={isExpanded}
					meta={
						<TaskCardMeta
							elapsedMs={elapsedMs}
							isActive={isActive}
							isDesktop={isDesktop}
							isExpanded={isExpanded}
							reduceMotion={reduceMotion}
							task={task}
						/>
					}
					onToggleExpand={toggleExpand}
					title={task.title}
					titleSuffix={task.isPinned ? <TaskCardPin isDesktop={isDesktop} /> : null}
				/>
			</TaskCard>
		</Reorder.Item>
	);
});

export default TaskItem;
