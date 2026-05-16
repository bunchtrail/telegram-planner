'use client';

import {
	type FormEvent,
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react';
import { addDays, format } from 'date-fns';
import {
	Check,
	ChevronDown,
	Clock,
	ListChecks,
	Move,
	Pause,
	Pencil,
	PlusCircle,
	Repeat2,
	TimerReset,
	Trash2,
	Zap,
} from 'lucide-react';
import type { Task, TaskRepeat } from '@/app/types/task';
import { cn } from '@/app/lib/cn';
import { TASK_COLOR_OPTIONS } from '@/app/lib/constants';

type DesktopTaskListProps = {
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
	onQuickAdd?: (
		title: string,
		duration: number,
		repeat: TaskRepeat,
		repeatCount: number,
		color: string,
		startMinutes: number | null,
		remindBeforeMinutes: number,
	) => void;
	quickAddInputRef?: RefObject<HTMLInputElement | null>;
	className?: string;
};

const QUICK_ADD_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
const QUICK_ADD_START_OPTIONS = [
	{ label: 'Без времени', value: '' },
	{ label: '08:00', value: '480' },
	{ label: '09:00', value: '540' },
	{ label: '09:30', value: '570' },
	{ label: '10:00', value: '600' },
	{ label: '11:00', value: '660' },
	{ label: '12:30', value: '750' },
	{ label: '14:00', value: '840' },
	{ label: '16:00', value: '960' },
] as const;

const QUICK_ADD_REPEAT_OPTIONS: ReadonlyArray<{
	count: number;
	label: string;
	value: TaskRepeat;
}> = [
	{ count: 1, label: 'Нет', value: 'none' },
	{ count: 7, label: '7 дней', value: 'daily' },
	{ count: 4, label: '4 недели', value: 'weekly' },
];

const QUICK_ADD_DEFAULT_COLOR = TASK_COLOR_OPTIONS[2];

type QuickAddDropdownOption = {
	label: string;
	value: string;
};

const formatElapsed = (value: number) => {
	const totalSeconds = Math.floor(Math.max(0, value) / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
		2,
		'0',
	)}:${String(seconds).padStart(2, '0')}`;
};

const getStartLabel = (task: Task) => {
	if (task.startMinutes == null) return null;
	const hours = Math.floor(task.startMinutes / 60);
	const minutes = task.startMinutes % 60;
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getChecklistLabel = (task: Task) => {
	const total = task.checklist.length;
	if (total === 0) return '0/0';
	const completed = task.checklist.filter((item) => item.done).length;
	return `${completed}/${total}`;
};

function SectionTitle({
	action,
	count,
	icon,
	title,
}: {
	action?: ReactNode;
	count: number;
	icon?: ReactNode;
	title: string;
}) {
	return (
		<div className="flex h-16 items-center justify-between px-5">
			<div className="flex min-w-0 items-center gap-3">
				<h2 className="text-[21px] font-bold tracking-tight text-[var(--ink)]">
					{title}
				</h2>
				<span className="grid h-7 min-w-7 place-items-center rounded-full bg-[var(--surface-2)] px-2 text-[14px] font-semibold text-[var(--muted)]">
					{count}
				</span>
			</div>
			<div className="flex items-center gap-3 text-[var(--muted)]">
				{icon ? <span aria-hidden>{icon}</span> : null}
				{action}
			</div>
		</div>
	);
}

function MetaPill({ children }: { children: ReactNode }) {
	return (
		<span className="inline-flex h-7 items-center rounded-md bg-[var(--surface-2)] px-2 text-[14px] font-medium tabular-nums text-[var(--muted)]">
			{children}
		</span>
	);
}

function TaskCheckbox({
	checked,
	color,
	label,
	onClick,
}: {
	checked?: boolean;
	color: string;
	label: string;
	onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={checked}
			onClick={onClick}
			className={cn(
				'grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors',
				checked ? 'border-[#62b95a] bg-[#62b95a] text-white' : 'bg-white',
			)}
			style={{ borderColor: checked ? '#62b95a' : color }}
		>
			{checked ? <Check size={16} strokeWidth={3} /> : null}
		</button>
	);
}

function ActiveTaskCard({
	onToggle,
	onToggleActive,
	task,
}: {
	onToggle: DesktopTaskListProps['onToggle'];
	onToggleActive: DesktopTaskListProps['onToggleActive'];
	task: Task;
}) {
	const [now, setNow] = useState(() => Date.now());
	const checklistTotal = task.checklist.length;
	const checklistDone = task.checklist.filter((item) => item.done).length;
	const elapsedMs =
		(task.elapsedMs ?? 0) +
		(task.activeStartedAt
			? Math.max(0, now - task.activeStartedAt.getTime())
			: 0);
	const progress = Math.min(
		100,
		(elapsedMs / Math.max(1, task.duration * 60_000)) * 100,
	);
	const startLabel = getStartLabel(task) ?? '09:00';

	useEffect(() => {
		if (!task.activeStartedAt) return;
		const interval = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(interval);
	}, [task.activeStartedAt]);

	return (
		<div
			className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
			style={{ borderLeft: `6px solid ${task.color}` }}
		>
			<div className="mb-4 flex items-start justify-between gap-4">
				<div className="min-w-0">
					<span className="mb-3 inline-flex rounded-md bg-[var(--accent)]/12 px-2.5 py-1 text-[13px] font-medium text-[var(--accent)]">
						Работа
					</span>
					<h3 className="truncate text-[17px] font-bold text-[var(--ink)]">
						{task.title}
					</h3>
				</div>
			</div>

			<div className="mb-5 flex items-center justify-between gap-5">
				<div className="min-w-0 text-[40px] font-medium leading-none tracking-normal tabular-nums text-[var(--ink)]">
					{formatElapsed(elapsedMs)}
				</div>
				<button
					type="button"
					onClick={() => onToggleActive(task.id)}
					className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[5px] border-[var(--accent)]/15 bg-[var(--accent)]/10 text-[var(--accent)]"
					aria-label="Поставить таймер задачи на паузу"
				>
					<Pause size={20} fill="currentColor" />
				</button>
			</div>

			<div className="mb-6 flex items-center gap-3">
				<span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
					<span
						className="block h-full rounded-full bg-[var(--accent)]"
						style={{ width: `${Math.round(progress)}%` }}
					/>
				</span>
				<span className="min-w-[42px] text-right text-[14px] font-semibold text-[var(--ink)]">
					{Math.round(progress)}%
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-4 text-[15px] text-[var(--muted)]">
				<button
					type="button"
					onClick={(event) => onToggle(task.id, {
						x: event.currentTarget.getBoundingClientRect().left,
						y: event.currentTarget.getBoundingClientRect().top,
					})}
					className="inline-flex items-center gap-2 rounded-md text-left transition-colors hover:text-[var(--ink)]"
				>
					<ListChecks size={20} />
					<span>
						{checklistDone}/{checklistTotal} шагов
					</span>
				</button>
				<span className="h-8 w-px bg-[var(--border)]" />
				<span className="inline-flex items-center gap-2">
					<Clock size={20} />
					{startLabel}
				</span>
				<span>{task.duration} мин</span>
			</div>
		</div>
	);
}

function PlanTaskCard({
	onDelete,
	onEdit,
	onMove,
	onToggle,
	onToggleActive,
	task,
}: {
	onDelete: DesktopTaskListProps['onDelete'];
	onEdit: DesktopTaskListProps['onEdit'];
	onMove: DesktopTaskListProps['onMove'];
	onToggle: DesktopTaskListProps['onToggle'];
	onToggleActive: DesktopTaskListProps['onToggleActive'];
	task: Task;
}) {
	const startLabel = getStartLabel(task);
	const moveTomorrow = () => onMove(task.id, format(addDays(task.date, 1), 'yyyy-MM-dd'));

	return (
		<div
			className="group relative flex min-h-[82px] items-center gap-4 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm transition-colors hover:border-[var(--accent)]/30 focus-within:border-[var(--accent)]/30"
		>
			<span
				className="absolute left-0 top-0 h-full w-1.5"
				style={{ backgroundColor: task.color }}
			/>

			<TaskCheckbox
				color="var(--muted)"
				label={`Отметить задачу ${task.title} выполненной`}
				onClick={(event) => onToggle(task.id, {
					x: event.currentTarget.getBoundingClientRect().left,
					y: event.currentTarget.getBoundingClientRect().top,
				})}
			/>

			<div className="min-w-0 flex-1">
				<div className="truncate text-[16px] font-semibold text-[var(--ink)]">
					{task.title}
				</div>
				<div className="mt-2 flex flex-wrap items-center gap-5 text-[14px] text-[var(--muted)]">
					{startLabel ? <MetaPill>{startLabel}</MetaPill> : null}
					<span>{task.duration} мин</span>
					<span className="inline-flex items-center gap-2">
						<ListChecks size={16} />
						{getChecklistLabel(task)}
					</span>
				</div>
			</div>

			<div
				className="flex shrink-0 items-center gap-2 opacity-100 transition-opacity min-[1120px]:opacity-0 min-[1120px]:group-focus-within:opacity-100 min-[1120px]:group-hover:opacity-100"
			>
				<button
					type="button"
					onClick={() => onEdit(task)}
					className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-sm hover:bg-[var(--surface-2)]"
					aria-label={`Изменить задачу ${task.title}`}
				>
					<Pencil size={17} />
				</button>
				<button
					type="button"
					onClick={moveTomorrow}
					className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-sm hover:bg-[var(--surface-2)]"
					aria-label={`Перенести задачу ${task.title} на завтра`}
				>
					<Move size={17} />
				</button>
				<button
					type="button"
					onClick={() => onDelete(task.id)}
					className="grid h-9 w-9 place-items-center rounded-md border border-red-100 bg-white text-red-500 shadow-sm hover:bg-red-50"
					aria-label={`Удалить задачу ${task.title}`}
				>
					<Trash2 size={17} />
				</button>
			</div>

			<button
				type="button"
				onClick={() => onToggleActive(task.id)}
				className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)]"
				aria-label={`Запустить таймер задачи ${task.title}`}
			>
				<Zap size={18} />
			</button>
		</div>
	);
}

function CompletedTaskCard({
	onToggle,
	task,
}: {
	onToggle: DesktopTaskListProps['onToggle'];
	task: Task;
}) {
	const startLabel = getStartLabel(task);

	return (
		<div className="flex min-h-[82px] items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
			<TaskCheckbox
				checked
				color="#62b95a"
				label={`Вернуть задачу ${task.title} в план`}
				onClick={(event) => onToggle(task.id, {
					x: event.currentTarget.getBoundingClientRect().left,
					y: event.currentTarget.getBoundingClientRect().top,
				})}
			/>
			<div className="min-w-0 flex-1">
				<div className="truncate text-[16px] font-semibold text-[var(--muted)] line-through decoration-[var(--muted)]/60">
					{task.title}
				</div>
				<div className="mt-2 flex flex-wrap items-center gap-5 text-[14px] text-[var(--muted)]">
					{startLabel ? <MetaPill>{startLabel}</MetaPill> : null}
					<span>{task.duration} мин</span>
					<span className="inline-flex items-center gap-2">
						<ListChecks size={16} />
						{getChecklistLabel(task)}
					</span>
				</div>
			</div>
			<ChevronDown size={18} className="text-[var(--muted)]" />
		</div>
	);
}

function QuickAddDropdown({
	icon,
	label,
	menuId,
	onChange,
	onOpenChange,
	open,
	options,
	value,
}: {
	icon: ReactNode;
	label: string;
	menuId: string;
	onChange: (value: string) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	options: readonly QuickAddDropdownOption[];
	value: string;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const selectedOption =
		options.find((option) => option.value === value) ?? options[0];

	useEffect(() => {
		if (!open) return;

		const handlePointerDown = (event: PointerEvent) => {
			if (
				rootRef.current &&
				!rootRef.current.contains(event.target as Node)
			) {
				onOpenChange(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onOpenChange(false);
			}
		};

		document.addEventListener('pointerdown', handlePointerDown, true);
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, true);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [onOpenChange, open]);

	return (
		<div ref={rootRef} className="relative min-w-0">
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				onClick={() => onOpenChange(!open)}
				className={cn(
					'flex min-h-[58px] w-full flex-col justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-left transition-[background-color,border-color,box-shadow] hover:border-[var(--accent)]/25 hover:bg-[var(--surface-2)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35',
					open &&
						'border-[var(--accent)]/40 bg-[var(--surface-2)]/70 shadow-[var(--shadow-soft)]',
				)}
			>
				<span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[var(--muted)]">
					{icon}
					{label}
				</span>
				<span className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
					<span className="min-w-0 truncate">{selectedOption.label}</span>
					<ChevronDown
						size={16}
						className={cn(
							'ml-auto shrink-0 text-[var(--muted)] transition-transform',
							open && 'rotate-180 text-[var(--accent)]',
						)}
						aria-hidden
					/>
				</span>
			</button>

			{open ? (
				<div
					id={menuId}
					role="listbox"
					aria-label={label}
					className="no-scrollbar absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-96 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-pop)] backdrop-blur-xl"
				>
					{options.map((option) => {
						const isSelected = option.value === value;

						return (
							<button
								key={option.value || 'none'}
								type="button"
								role="option"
								aria-selected={isSelected}
								onClick={() => {
									onChange(option.value);
									onOpenChange(false);
								}}
								className={cn(
									'flex h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35',
									isSelected
										? 'bg-[var(--accent)]/10 text-[var(--accent)]'
										: 'text-[var(--ink)] hover:bg-[var(--surface-2)]',
								)}
							>
								<span className="truncate">{option.label}</span>
								{isSelected ? (
									<Check size={16} strokeWidth={3} aria-hidden />
								) : null}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

function QuickAddRow({
	onAdd,
	onQuickAdd,
	quickAddInputRef,
}: {
	onAdd: DesktopTaskListProps['onAdd'];
	onQuickAdd?: DesktopTaskListProps['onQuickAdd'];
	quickAddInputRef?: DesktopTaskListProps['quickAddInputRef'];
}) {
	const [title, setTitle] = useState('');
	const [duration, setDuration] = useState<number>(45);
	const [startMinutesValue, setStartMinutesValue] = useState('570');
	const [color, setColor] = useState<string>(QUICK_ADD_DEFAULT_COLOR);
	const [repeat, setRepeat] = useState<TaskRepeat>('none');
	const [openDropdown, setOpenDropdown] = useState<
		'duration' | 'repeat' | 'start' | null
	>(null);
	const startMenuId = useId();
	const durationMenuId = useId();
	const repeatMenuId = useId();

	const repeatCount =
		QUICK_ADD_REPEAT_OPTIONS.find((option) => option.value === repeat)
			?.count ?? 1;
	const startMinutes =
		startMinutesValue === '' ? null : Number(startMinutesValue);
	const durationOptions = QUICK_ADD_DURATION_OPTIONS.map((option) => ({
		label: `${option} мин`,
		value: String(option),
	}));
	const repeatOptions = QUICK_ADD_REPEAT_OPTIONS.map((option) => ({
		label: option.label,
		value: option.value,
	}));

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedTitle = title.trim();
		if (!trimmedTitle || !onQuickAdd) {
			onAdd();
			return;
		}
		onQuickAdd(trimmedTitle, duration, repeat, repeatCount, color, startMinutes, 0);
		setTitle('');
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="mb-5 grid grid-cols-[minmax(220px,1fr)_142px_150px_188px_132px_118px] gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm max-[1120px]:grid-cols-2"
		>
			<label className="flex min-h-[58px] min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] px-3 text-[15px] text-[var(--muted)] focus-within:border-[var(--accent)] max-[1120px]:col-span-2">
				<PlusCircle size={22} aria-hidden />
				<span className="sr-only">Название</span>
				<input
					ref={quickAddInputRef}
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					placeholder="Новая задача..."
					className="min-w-0 flex-1 bg-transparent text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
					aria-label="Новая задача"
				/>
			</label>
			<QuickAddDropdown
				icon={<Clock size={13} aria-hidden />}
				label="Время"
				menuId={startMenuId}
				onChange={setStartMinutesValue}
				onOpenChange={(isOpen) =>
					setOpenDropdown(isOpen ? 'start' : null)
				}
				open={openDropdown === 'start'}
				options={QUICK_ADD_START_OPTIONS}
				value={startMinutesValue}
			/>
			<QuickAddDropdown
				icon={<TimerReset size={13} aria-hidden />}
				label="Длительность"
				menuId={durationMenuId}
				onChange={(nextValue) => setDuration(Number(nextValue))}
				onOpenChange={(isOpen) =>
					setOpenDropdown(isOpen ? 'duration' : null)
				}
				open={openDropdown === 'duration'}
				options={durationOptions}
				value={String(duration)}
			/>
			<fieldset className="flex min-h-[58px] flex-col justify-center gap-1 rounded-lg border border-[var(--border)] px-3">
				<legend className="sr-only">Цвет задачи</legend>
				<span className="text-[11px] font-bold uppercase text-[var(--muted)]">
					Цвет
				</span>
				<div className="flex items-center gap-2">
					{TASK_COLOR_OPTIONS.map((option) => {
						const isSelected = color === option;

						return (
							<button
								key={option}
								type="button"
								onClick={() => setColor(option)}
								className={cn(
									'h-7 w-7 rounded-md border transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
									isSelected
										? 'scale-110 border-[var(--ink)]'
										: 'border-transparent hover:scale-105',
								)}
								style={{ backgroundColor: option }}
								aria-label={`Выбрать цвет ${option}`}
								aria-pressed={isSelected}
							/>
						);
					})}
				</div>
			</fieldset>
			<QuickAddDropdown
				icon={<Repeat2 size={13} aria-hidden />}
				label="Повтор"
				menuId={repeatMenuId}
				onChange={(nextValue) => setRepeat(nextValue as TaskRepeat)}
				onOpenChange={(isOpen) =>
					setOpenDropdown(isOpen ? 'repeat' : null)
				}
				open={openDropdown === 'repeat'}
				options={repeatOptions}
				value={repeat}
			/>
			<button
				type="submit"
				className="min-h-[58px] rounded-lg border border-[var(--border)] px-4 text-[15px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
			>
				Добавить
			</button>
		</form>
	);
}

function LoadingBoard() {
	return (
		<div className="grid grid-cols-3 gap-5">
			{['Сейчас', 'План', 'Готово'].map((title) => (
				<section
					key={title}
					className="min-h-[430px] rounded-lg border border-[var(--border)] bg-[var(--surface)]"
				>
					<SectionTitle count={0} title={title} />
					<div className="space-y-3 px-3">
						{[0, 1, 2].map((item) => (
							<div
								key={item}
								className="h-20 rounded-lg border border-[var(--border)] skeleton-shimmer"
							/>
						))}
					</div>
				</section>
			))}
		</div>
	);
}

export default function DesktopTaskList(props: DesktopTaskListProps) {
	const {
		className,
		isLoading,
		onAdd,
		onDelete,
		onEdit,
		onMove,
		onQuickAdd,
		quickAddInputRef,
		onToggle,
		onToggleActive,
		tasks,
		updateTask,
	} = props;

	const { activeTasks, completedTasks, planTasks } = useMemo(() => {
		const active = tasks.filter(
			(task) => task.activeStartedAt && !task.completed,
		);
		const completed = tasks.filter((task) => task.completed);
		const planned = tasks.filter(
			(task) => !task.completed && !task.activeStartedAt,
		);
		return {
			activeTasks: active,
			completedTasks: completed,
			planTasks: planned,
		};
	}, [tasks]);

	if (isLoading) {
		return (
			<div className={cn('w-full', className)}>
				<QuickAddRow onAdd={onAdd} onQuickAdd={onQuickAdd} />
				<LoadingBoard />
			</div>
		);
	}

	const resetActiveTask = () => {
		const activeTask = activeTasks[0];
		if (!activeTask) return;
		updateTask(activeTask.id, { elapsedMs: 0, activeStartedAt: null });
	};

	return (
		<div className={cn('w-full', className)}>
			<QuickAddRow
				onAdd={onAdd}
				onQuickAdd={onQuickAdd}
				quickAddInputRef={quickAddInputRef}
			/>

			<div className="grid min-h-[520px] grid-cols-[0.92fr_1.08fr_1.08fr] gap-5 max-[960px]:grid-cols-1">
				<section
					className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm"
					aria-label="Сейчас"
				>
					<SectionTitle
						count={activeTasks.length}
						icon={<Zap size={22} className="text-[var(--accent)]" fill="currentColor" />}
						title="Сейчас"
					/>
					<div className="flex-1 space-y-3 px-3">
						{activeTasks.length > 0 ? (
							activeTasks.map((task) => (
								<ActiveTaskCard
									key={task.id}
									onToggle={onToggle}
									onToggleActive={onToggleActive}
									task={task}
								/>
							))
						) : (
							<div className="rounded-lg border border-dashed border-[var(--border)] p-5 text-[15px] text-[var(--muted)]">
								Нет активной задачи
							</div>
						)}
					</div>
					<div className="flex h-14 items-center justify-between border-t border-[var(--border)] px-5 text-[15px]">
						<span className="inline-flex items-center gap-2 text-[var(--ink)]">
							<TimerReset size={20} />
							Фокус-сессия
						</span>
						<button
							type="button"
							onClick={resetActiveTask}
							disabled={activeTasks.length === 0}
							className="font-medium text-[var(--accent)]"
						>
							Сбросить
						</button>
					</div>
				</section>

				<section
					className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm"
					aria-label="План"
				>
					<SectionTitle count={planTasks.length} title="План" />
					<div className="flex-1 space-y-2 px-3">
						{planTasks.map((task) => (
							<PlanTaskCard
								key={task.id}
								onDelete={onDelete}
								onEdit={onEdit}
								onMove={onMove}
								onToggle={onToggle}
								onToggleActive={onToggleActive}
								task={task}
							/>
						))}
					</div>
					<div className="flex h-14 items-center border-t border-[var(--border)] px-5">
						<button
							type="button"
							onClick={onAdd}
							className="inline-flex items-center gap-2 text-[15px] font-medium text-[var(--accent)]"
						>
							<PlusCircle size={18} />
							Добавить задачу
						</button>
					</div>
				</section>

				<section
					className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm"
					aria-label="Готово"
				>
					<SectionTitle
						action={<ChevronDown size={18} />}
						count={completedTasks.length}
						title="Готово"
					/>
					<div className="flex-1 space-y-2 px-3">
						{completedTasks.map((task) => (
							<CompletedTaskCard
								key={task.id}
								onToggle={onToggle}
								task={task}
							/>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
