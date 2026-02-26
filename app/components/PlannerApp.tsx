'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, ListTodo, Sparkles } from 'lucide-react';
import TaskSheet from './TaskSheet';
import FloatingActionButton from './FloatingActionButton';
import PlannerHeader from './PlannerHeader';
import TaskList from './TaskList';
import FocusOverlay from './FocusOverlay';
import StatsModal from './StatsModal';
import DesktopPlanner from './DesktopPlanner';
import RecurringTasksSheet from './RecurringTasksSheet';
import HabitsTab from './HabitsTab';
import { usePlanner } from '../hooks/usePlanner';
import { useHaptic } from '../hooks/useHaptic';
import { useReward } from '../hooks/useReward';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import type { Task, TaskRepeat } from '../types/task';

export default function PlannerApp() {
	const planner = usePlanner();
	const { isDesktop } = planner;
	useKeyboardInset();

	const {
		selectedDate,
		setSelectedDate,
		viewMode,
		setViewMode,
		isAddOpen,
		setIsAddOpen,
		tasks,
		streak,
		currentTasks,
		weekDays,
		monthDays,
		taskDates,
		hours,
		minutes,
		activeTaskId,
		toggleActiveTask,
		goToToday,
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
		pomodoroStats,
	} = planner;
	const fabRef = useRef<HTMLButtonElement>(null);
	const [undoTask, setUndoTask] = useState<Task | null>(null);
	const undoTimeoutRef = useRef<number | null>(null);
	const prevIsAddOpenRef = useRef(isAddOpen);
	const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const { impact, notification } = useHaptic();
	const { fire } = useReward();
	const [dayCompleteKey, setDayCompleteKey] = useState<string | null>(null);
	const dayCompleteTimeoutRef = useRef<number | null>(null);
	const [showStats, setShowStats] = useState(false);
	const [showRecurring, setShowRecurring] = useState(false);
	const [showFocus, setShowFocus] = useState(false);
	const [activeTab, setActiveTab] = useState<'tasks' | 'habits'>('tasks');

	const activeTaskObj = useMemo(
		() => tasks.find((task) => task.id === activeTaskId) ?? null,
		[tasks, activeTaskId],
	);

	const selectedDateKey = useMemo(
		() => format(selectedDate, 'yyyy-MM-dd'),
		[selectedDate],
	);

	const { completedCount, totalCount } = useMemo(() => {
		return {
			completedCount: currentTasks.filter((task) => task.completed)
				.length,
			totalCount: currentTasks.length,
		};
	}, [currentTasks]);

	const showDayComplete =
		dayCompleteKey === selectedDateKey &&
		totalCount > 0 &&
		completedCount === totalCount;

	useEffect(() => {
		if (prevIsAddOpenRef.current && !isAddOpen) {
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
		}
		prevIsAddOpenRef.current = isAddOpen;
	}, [isAddOpen]);

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
				setDayCompleteKey(selectedDateKey);
				if (dayCompleteTimeoutRef.current) {
					window.clearTimeout(dayCompleteTimeoutRef.current);
				}
				dayCompleteTimeoutRef.current = window.setTimeout(() => {
					setDayCompleteKey(null);
					dayCompleteTimeoutRef.current = null;
				}, 3000);
			} else if (coords) {
				fire(coords.x, coords.y, 'light');
			} else {
				fire(window.innerWidth / 2, window.innerHeight / 2, 'light');
			}
		}

		toggleTask(id);
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

	const handleMoveTask = (id: string, nextDateKey: string) => {
		moveTask(id, nextDateKey);
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

	if (isDesktop) {
		return <DesktopPlanner planner={planner} />;
	}

	return (
		<>
			<div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--bg)] font-sans text-[var(--ink)]">
				<div className="relative z-10 flex-none">
					<PlannerHeader
						selectedDate={selectedDate}
						weekDays={weekDays}
						monthDays={monthDays}
						taskDates={taskDates}
						viewMode={viewMode}
						hours={hours}
						minutes={minutes}
						completedCount={completedCount}
						totalCount={totalCount}
						onSelectDate={setSelectedDate}
						onViewModeChange={setViewMode}
						onPrev={goToPreviousPeriod}
						onNext={goToNextPeriod}
						onToday={goToToday}
						onOpenStats={() => setShowStats(true)}
						onOpenRecurring={() => setShowRecurring(true)}
					/>
				</div>

				<main className="relative h-full w-full flex-1 overflow-hidden">
					{activeTab === 'tasks' ? (
						<TaskList
							dateKey={format(selectedDate, 'yyyy-MM-dd')}
							tasks={currentTasks}
							isLoading={isLoading}
							onToggle={handleTaskToggle}
							onDelete={handleDelete}
							onEdit={handleOpenEdit}
							onMove={handleMoveTask}
							onAdd={handleOpenCreate}
							onReorder={handleReorder}
							onToggleActive={toggleActiveTask}
							updateTask={updateTask}
						/>
					) : (
						<HabitsTab
							habits={habits}
							isLoading={habitsLoading}
							isChecked={isHabitChecked}
							onToggleLog={toggleHabitLog}
							onAddHabit={addHabit}
							onDeleteHabit={deleteHabit}
							selectedDate={selectedDate}
						/>
					)}
					<div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-16 bg-gradient-to-t from-[var(--bg)] to-transparent" />
				</main>

				{/* Tab bar */}
				<div
					className="relative z-30 flex-none border-t border-[var(--border)] bg-[var(--surface)]"
					style={{
						paddingBottom:
							'max(env(safe-area-inset-bottom), var(--tg-content-safe-bottom, 0px))',
					}}
				>
					<div className="flex">
						<button
							onClick={() => setActiveTab('tasks')}
							className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
								activeTab === 'tasks'
									? 'text-[var(--accent)]'
									: 'text-[var(--muted)]'
							}`}
						>
							<ListTodo size={22} />
							<span className="text-[10px] font-bold">
								Задачи
							</span>
						</button>
						<button
							onClick={() => setActiveTab('habits')}
							className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
								activeTab === 'habits'
									? 'text-[var(--accent)]'
									: 'text-[var(--muted)]'
							}`}
						>
							<Sparkles size={22} />
							<span className="text-[10px] font-bold">
								Привычки
							</span>
						</button>
					</div>
				</div>

				<AnimatePresence>
					{!isAddOpen && activeTab === 'tasks' && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
						>
							<FloatingActionButton
								ref={fabRef}
								onClick={handleOpenCreate}
							/>
						</motion.div>
					)}
				</AnimatePresence>

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
								sheetMode === 'edit'
									? editingTask?.duration
									: 30
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
							onSubmit={handleSheetSubmit}
						/>
					)}
				</AnimatePresence>

				<AnimatePresence>
					{showStats && (
						<StatsModal
							streak={streak}
							tasks={tasks}
							selectedDate={selectedDate}
							onClose={() => setShowStats(false)}
							pomodoroStats={pomodoroStats}
						/>
					)}

					{showRecurring && (
						<RecurringTasksSheet
							onClose={() => setShowRecurring(false)}
							recurringTasks={planner.recurringTasks}
							recurringSkips={planner.recurringSkips}
							onDeleteSeries={planner.deleteTaskSeries}
							onSkipDate={planner.skipTaskSeriesDate}
							isDesktop={isDesktop}
						/>
					)}

					{showFocus && activeTaskObj && (
						<FocusOverlay
							task={activeTaskObj}
							isActive={activeTaskId === activeTaskObj.id}
							onToggleTimer={() =>
								toggleActiveTask(activeTaskObj.id)
							}
							onClose={() => setShowFocus(false)}
							runWithAuthRetry={runWithAuthRetry}
						/>
					)}
				</AnimatePresence>

				{activeTaskId && !showFocus && (
					<motion.button
						layoutId="focus-fab"
						onClick={() => setShowFocus(true)}
						className="fixed bottom-[calc(6rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] right-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] h-14 px-6 bg-[var(--accent)] text-[var(--accent-ink)] rounded-full font-bold shadow-lg z-40 flex items-center gap-2"
					>
						<Clock size={20} className="animate-pulse" /> В фокус
					</motion.button>
				)}

				<AnimatePresence>
					{undoTask && (
						<motion.div
							initial={{ opacity: 0, y: 50, scale: 0.9 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 20, scale: 0.9 }}
							className="fixed bottom-[calc(6rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] left-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] right-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] z-40 mx-auto max-w-sm"
							role="status"
							aria-live="polite"
						>
							<div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm font-medium shadow-[var(--shadow-pop)] backdrop-blur-md">
								<span>Задача удалена</span>
								<button
									type="button"
									onClick={handleUndoDelete}
									className="rounded-full bg-[var(--ink)] px-3 py-1.5 font-bold text-[var(--bg)] transition-transform active:scale-95"
								>
									Отменить
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence>
					{showDayComplete && (
						<motion.div
							initial={{ opacity: 0, scale: 0.5, y: -20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9 }}
							className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
							role="status"
							aria-live="polite"
						>
							<div className="bg-[var(--surface-glass)] backdrop-blur-xl border border-[var(--accent)]/20 shadow-[var(--shadow-pop)] rounded-[32px] p-6 flex flex-col items-center justify-center text-center">
								<div className="text-[40px] mb-2">🎉</div>
								<h2 className="text-xl font-bold text-[var(--ink)] font-[var(--font-display)]">
									День завершен!
								</h2>
								<p className="text-sm text-[var(--muted)] mt-1">
									Отличная работа, все цели достигнуты.
								</p>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</>
	);
}

