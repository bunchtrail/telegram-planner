'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Clock,
	Flame,
	ListTodo,
	Plus,
	Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import MonthGrid from './MonthGrid';
import TaskList from './TaskList';
import TaskSheet from './TaskSheet';
import FocusOverlay from './FocusOverlay';
import StatsModal from './StatsModal';
import HabitsTab from './HabitsTab';
import { useHaptic } from '../hooks/useHaptic';
import { useReward } from '../hooks/useReward';
import type { Task, TaskRepeat } from '../types/task';
import type { usePlanner } from '../hooks/usePlanner';

type DesktopPlannerProps = {
	planner: ReturnType<typeof usePlanner>;
};

export default function DesktopPlanner({ planner }: DesktopPlannerProps) {
	const {
		selectedDate,
		setSelectedDate,
		tasks,
		streak,
		currentTasks,
		monthDays,
		taskDates,
		hours,
		minutes,
		activeTaskId,
		toggleActiveTask,
		goToPreviousPeriod,
		goToNextPeriod,
		handleReorder,
		addTask,
		toggleTask,
		deleteTask,
		restoreTask,
		updateTask,
		moveTask,
		isLoading,
		runWithAuthRetry,
		habits,
		habitsLoading,
		addHabit,
		deleteHabit,
		toggleHabitLog,
		isHabitChecked,
		isHabitLogPending,
		pomodoroStats,
	} = planner;

	const [activeTab, setActiveTab] = useState<'tasks' | 'habits'>('tasks');
	const { impact, notification } = useHaptic();
	const { fire } = useReward();
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [showStats, setShowStats] = useState(false);
	const [showFocus, setShowFocus] = useState(false);
	const [undoTask, setUndoTask] = useState<Task | null>(null);
	const [showDayComplete, setShowDayComplete] = useState(false);
	const undoTimeoutRef = useRef<number | null>(null);
	const dayCompleteTimeoutRef = useRef<number | null>(null);

	const activeTaskObj = useMemo(
		() => tasks.find((task) => task.id === activeTaskId) ?? null,
		[tasks, activeTaskId],
	);

	const { completedCount, totalCount } = useMemo(() => {
		return {
			completedCount: currentTasks.filter((task) => task.completed)
				.length,
			totalCount: currentTasks.length,
		};
	}, [currentTasks]);

	useEffect(() => {
		return () => {
			if (undoTimeoutRef.current) {
				window.clearTimeout(undoTimeoutRef.current);
			}
			if (dayCompleteTimeoutRef.current) {
				window.clearTimeout(dayCompleteTimeoutRef.current);
			}
		};
	}, []);

	const handleOpenCreate = () => {
		impact('light');
		setSheetMode('create');
		setEditingTask(null);
		setIsAddOpen(true);
	};

	const handleOpenEdit = (task: Task) => {
		impact('light');
		setSheetMode('edit');
		setEditingTask(task);
		setIsAddOpen(true);
	};

	const handleCloseSheet = () => {
		setIsAddOpen(false);
		setEditingTask(null);
		setSheetMode('create');
	};

	const handleSheetSubmit = (
		title: string,
		duration: number,
		repeat: TaskRepeat,
		repeatCount: number,
		color: string,
		startMinutes: number | null,
		remindBeforeMinutes: number,
	) => {
		if (sheetMode === 'create') {
			addTask(
				title,
				duration,
				repeat,
				repeatCount,
				color,
				startMinutes,
				remindBeforeMinutes,
			);
		} else if (editingTask) {
			updateTask(editingTask.id, {
				title,
				duration,
				color,
				startMinutes,
				remindBeforeMinutes,
			});
		}
		handleCloseSheet();
	};

	const handleTaskToggle = (
		id: string,
		coords?: { x: number; y: number },
	) => {
		const task = currentTasks.find((item) => item.id === id);
		if (!task) return;
		const isCompleting = !task.completed;

		if (isCompleting) {
			const othersCompleted = currentTasks.filter(
				(item) => item.id !== id && item.completed,
			).length;
			const isLastOne = othersCompleted === totalCount - 1;

			if (isLastOne && totalCount > 1) {
				fire(window.innerWidth / 2, window.innerHeight, 'climax');
				notification('success');
				setShowDayComplete(true);
				if (dayCompleteTimeoutRef.current) {
					window.clearTimeout(dayCompleteTimeoutRef.current);
				}
				dayCompleteTimeoutRef.current = window.setTimeout(() => {
					setShowDayComplete(false);
					dayCompleteTimeoutRef.current = null;
				}, 3000);
			} else if (coords) {
				fire(coords.x, coords.y, 'light');
			}
		}
		toggleTask(id);
	};

	const handleDelete = async (id: string) => {
		const deletedTask = await deleteTask(id);
		if (!deletedTask) return;
		setUndoTask(deletedTask);
		if (undoTimeoutRef.current) {
			window.clearTimeout(undoTimeoutRef.current);
		}
		undoTimeoutRef.current = window.setTimeout(() => {
			setUndoTask(null);
			undoTimeoutRef.current = null;
		}, 4000);
	};

	const handleUndoDelete = () => {
		if (!undoTask) return;
		notification('success');
		restoreTask(undoTask);
		setUndoTask(null);
		if (undoTimeoutRef.current) {
			window.clearTimeout(undoTimeoutRef.current);
			undoTimeoutRef.current = null;
		}
	};

	return (
		<div className="flex h-screen w-full bg-[var(--bg)] text-[var(--ink)] overflow-hidden font-sans">
			<aside className="w-80 flex-none border-r border-[var(--border)] bg-[var(--surface)] flex flex-col p-6 gap-6 shadow-xl z-10">
				<div className="flex items-center gap-3 px-2">
					<div className="h-10 w-10 bg-[var(--ink)] text-[var(--bg)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--ink)]/20">
						<CalendarDays size={24} />
					</div>
					<h1 className="text-2xl font-bold font-[var(--font-display)]">
						Planner
					</h1>
				</div>

				<div className="flex flex-col gap-4">
					<div className="bg-[var(--surface-2)]/30 rounded-[24px] p-4 border border-[var(--border)]">
						<div className="flex items-center justify-between mb-4 px-2">
							<span className="font-bold capitalize text-[var(--ink)] text-lg">
								{format(selectedDate, 'LLLL yyyy', {
									locale: ru,
								})}
							</span>
							<div className="flex gap-1">
								<button
									onClick={goToPreviousPeriod}
									className="p-1 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
									aria-label="Предыдущий месяц"
								>
									<ChevronLeft size={20} />
								</button>
								<button
									onClick={goToNextPeriod}
									className="p-1 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
									aria-label="Следующий месяц"
								>
									<ChevronRight size={20} />
								</button>
							</div>
						</div>
						<MonthGrid
							days={monthDays}
							selectedDate={selectedDate}
							onSelectDate={setSelectedDate}
							taskDates={taskDates}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<button
							onClick={() => setShowStats(true)}
							className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[20px] flex flex-col gap-2 hover:border-[var(--accent)] transition-colors text-left shadow-sm group"
							aria-label="Статистика"
						>
							<div className="p-2 bg-orange-500/10 w-fit rounded-full text-orange-500 group-hover:scale-110 transition-transform">
								<Flame size={18} fill="currentColor" />
							</div>
							<div>
								<div className="text-2xl font-bold tabular-nums leading-none">
									{streak}
								</div>
								<div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mt-1">
									Серия
								</div>
							</div>
						</button>

						<div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[20px] flex flex-col gap-2 shadow-sm">
							<div className="p-2 bg-[var(--ink)]/5 w-fit rounded-full text-[var(--ink)]">
								<Clock size={18} />
							</div>
							<div>
								<div className="text-xl font-bold tabular-nums leading-none flex items-baseline gap-0.5">
									{hours}
									<span className="text-xs font-medium text-[var(--muted)]">
										ч
									</span>
									{minutes}
									<span className="text-xs font-medium text-[var(--muted)]">
										м
									</span>
								</div>
								<div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mt-1">
									За день
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-auto">
					{activeTaskObj && (
						<button
							onClick={() => setShowFocus(true)}
							className="w-full py-4 bg-[var(--accent)] text-[var(--accent-ink)] rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all mb-4"
						>
							<Clock className="animate-pulse" /> Текущая задача
						</button>
					)}
					<button
						onClick={handleOpenCreate}
						className="w-full h-14 bg-[var(--ink)] text-[var(--bg)] rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-[var(--ink)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
					>
						<Plus size={20} strokeWidth={2.5} />
						<span>Новая задача</span>
					</button>
				</div>
			</aside>

			<main className="flex-1 flex flex-col min-w-0 bg-[var(--surface-2)]/30 relative">
				<header className="h-24 shrink-0 px-12 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur sticky top-0 z-20">
					<div>
						<div className="flex items-baseline gap-4 mb-1">
							<h2 className="text-4xl font-bold font-[var(--font-display)] capitalize tracking-tight">
								{format(selectedDate, 'd MMMM', { locale: ru })}
							</h2>
							{isSameDay(selectedDate, new Date()) && (
								<span className="text-[var(--accent)] font-bold text-xs bg-[var(--accent)]/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
									Сегодня
								</span>
							)}
						</div>
						<p className="text-[var(--muted)] font-medium capitalize text-lg">
							{format(selectedDate, 'EEEE', { locale: ru })} •{' '}
							{currentTasks.length} задач
						</p>
					</div>

					{totalCount > 0 && (
						<div className="h-14 px-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm flex items-center gap-4">
							<div className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider">
								Прогресс
							</div>
							<div className="h-6 w-[1px] bg-[var(--border)]" />
							<div className="text-2xl font-bold text-[var(--ink)] tabular-nums">
								{completedCount}
								<span className="text-[var(--muted)] text-xl">
									/ {totalCount}
								</span>
							</div>
						</div>
					)}
				</header>

				{/* Desktop tab bar */}
				<div className="shrink-0 flex gap-1 px-12 bg-[var(--bg)]/80 backdrop-blur border-b border-[var(--border)]">
					<button
						onClick={() => setActiveTab('tasks')}
						className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${
							activeTab === 'tasks'
								? 'border-[var(--accent)] text-[var(--accent)]'
								: 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
						}`}
					>
						<ListTodo size={18} /> Задачи
					</button>
					<button
						onClick={() => setActiveTab('habits')}
						className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${
							activeTab === 'habits'
								? 'border-[var(--accent)] text-[var(--accent)]'
								: 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
						}`}
					>
						<Sparkles size={18} /> Привычки
					</button>
				</div>

				<div className="flex-1 overflow-hidden relative">
					<div className="absolute inset-0 overflow-y-auto px-12 py-10 max-w-6xl mx-auto w-full no-scrollbar">
						{activeTab === 'tasks' ? (
							<TaskList
								dateKey={format(selectedDate, 'yyyy-MM-dd')}
								tasks={currentTasks}
								isLoading={isLoading}
								onToggle={handleTaskToggle}
								onDelete={handleDelete}
								onEdit={handleOpenEdit}
								onMove={moveTask}
								onAdd={handleOpenCreate}
								onReorder={handleReorder}
								onToggleActive={toggleActiveTask}
								updateTask={updateTask}
								isDesktop
								className="pl-0 pr-0"
							/>
						) : (
							<HabitsTab
								habits={habits}
								isLoading={habitsLoading}
								isChecked={isHabitChecked}
								isLogPending={isHabitLogPending}
								onToggleLog={toggleHabitLog}
								onAddHabit={addHabit}
								onDeleteHabit={deleteHabit}
								selectedDate={selectedDate}
								isDesktop
							/>
						)}
						<div className="h-32" />
					</div>
				</div>
			</main>

			<AnimatePresence>
				{isAddOpen && (
					<TaskSheet
						key="task-sheet"
						onClose={handleCloseSheet}
						mode={sheetMode}
						initialTitle={
							sheetMode === 'edit' ? editingTask?.title : ''
						}
						initialDuration={
							sheetMode === 'edit' ? editingTask?.duration : 30
						}
						initialColor={
							sheetMode === 'edit'
								? editingTask?.color
								: undefined
						}
						initialRepeat="none"
						initialRepeatCount={7}
						initialStartMinutes={
							sheetMode === 'edit'
								? editingTask?.startMinutes
								: null
						}
						initialRemindBeforeMinutes={
							sheetMode === 'edit'
								? editingTask?.remindBeforeMinutes
								: 0
						}
						taskDate={
							sheetMode === 'edit'
								? (editingTask?.date ?? selectedDate)
								: selectedDate
						}
						isDesktop
						onSubmit={handleSheetSubmit}
					/>
				)}

				{showStats && (
					<StatsModal
						streak={streak}
						tasks={tasks}
						selectedDate={selectedDate}
						onClose={() => setShowStats(false)}
						pomodoroStats={pomodoroStats}
					/>
				)}

				{showFocus && activeTaskObj && (
					<FocusOverlay
						task={activeTaskObj}
						isActive={activeTaskId === activeTaskObj.id}
						onToggleTimer={() => toggleActiveTask(activeTaskObj.id)}
						onClose={() => setShowFocus(false)}
						runWithAuthRetry={runWithAuthRetry}
					/>
				)}

				{undoTask && (
					<motion.div
						initial={{ opacity: 0, y: 50, scale: 0.9 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 20, scale: 0.9 }}
						className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50"
						role="status"
						aria-live="polite"
					>
						<div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--ink)] text-[var(--bg)] px-6 py-4 text-sm font-medium shadow-2xl">
							<span>Задача удалена</span>
							<button
								type="button"
								onClick={handleUndoDelete}
								className="text-[var(--accent)] font-bold hover:underline"
							>
								Отменить
							</button>
						</div>
					</motion.div>
				)}

				{showDayComplete && (
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.9 }}
						className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
						role="status"
						aria-live="polite"
					>
						<div className="bg-[var(--surface)]/90 backdrop-blur-xl border border-[var(--border)] shadow-2xl rounded-[32px] p-10 flex flex-col items-center justify-center text-center max-w-sm">
							<div className="text-[64px] mb-4">🎉</div>
							<h2 className="text-3xl font-bold text-[var(--ink)] font-[var(--font-display)]">
								День завершен!
							</h2>
							<p className="text-[var(--muted)] mt-2 text-lg">
								Отличная работа, все цели достигнуты.
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
