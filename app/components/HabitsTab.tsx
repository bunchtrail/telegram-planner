'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check } from 'lucide-react';
import { addDays, format, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '../lib/cn';
import { TASK_COLOR_OPTIONS } from '../lib/constants';
import type { Habit } from '../types/habit';

const HABIT_ICONS = [
	'💧',
	'🏃',
	'📖',
	'🧘',
	'💊',
	'🥗',
	'😴',
	'✍️',
	'🎯',
	'💪',
];

type HabitsTabProps = {
	habits: Habit[];
	isLoading: boolean;
	isChecked: (habitId: string, date: string) => boolean;
	onToggleLog: (habitId: string, date: string) => void;
	onAddHabit: (name: string, icon: string, color: string) => void;
	onDeleteHabit: (habitId: string) => void;
	selectedDate: Date;
	isDesktop?: boolean;
};

export default function HabitsTab({
	habits,
	isLoading,
	isChecked,
	onToggleLog,
	onAddHabit,
	onDeleteHabit,
	selectedDate,
	isDesktop = false,
}: HabitsTabProps) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [newName, setNewName] = useState('');
	const [newIcon, setNewIcon] = useState(HABIT_ICONS[0]);
	const [newColor, setNewColor] = useState<string>(TASK_COLOR_OPTIONS[2]);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const weekDays = useMemo(() => {
		const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
		return Array.from({ length: 7 }, (_, i) => addDays(start, i));
	}, [selectedDate]);

	const handleSubmit = () => {
		const trimmed = newName.trim();
		if (!trimmed) return;
		onAddHabit(trimmed, newIcon, newColor);
		setNewName('');
		setNewIcon(HABIT_ICONS[0]);
		setNewColor(TASK_COLOR_OPTIONS[2]);
		setShowAddForm(false);
	};

	const handleDelete = (id: string) => {
		if (deletingId === id) {
			onDeleteHabit(id);
			setDeletingId(null);
		} else {
			setDeletingId(id);
			setTimeout(() => setDeletingId(null), 3000);
		}
	};

	const scrollClasses = cn(
		'h-full w-full overflow-y-auto pt-2 touch-pan-y overscroll-contain no-scrollbar',
		isDesktop
			? 'pb-8 pt-4 px-0'
			: 'pb-32 pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))]',
	);

	if (isLoading) {
		return (
			<div className={cn(scrollClasses, 'flex flex-col gap-4')}>
				{[0.8, 0.6, 0.9].map((w, i) => (
					<div
						key={i}
						className="bg-[var(--surface)] rounded-[24px] shadow-[var(--shadow-card)] p-5"
					>
						<div
							className="h-5 rounded-lg skeleton-shimmer"
							style={{ width: `${w * 100}%` }}
						/>
						<div className="flex gap-2 mt-3">
							{Array.from({ length: 7 }).map((_, j) => (
								<div
									key={j}
									className="w-9 h-9 rounded-full skeleton-shimmer"
								/>
							))}
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className={scrollClasses}>
			{/* Column day labels */}
			<div className="flex items-center gap-2 mb-2 px-1">
				<div className="w-10 shrink-0" />
				<div className="flex-1 min-w-0" />
				<div className="flex gap-1">
					{weekDays.map((day) => (
						<div
							key={day.toISOString()}
							className="w-9 flex items-center justify-center"
						>
							<span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
								{format(day, 'EEEEEE', { locale: ru })}
							</span>
						</div>
					))}
				</div>
				<div className="w-6 shrink-0" />
			</div>

			{/* Habits list */}
			<div className="flex flex-col gap-3">
				<AnimatePresence mode="popLayout">
					{habits.map((habit) => {
						const checkedCount = weekDays.filter((d) =>
							isChecked(habit.id, format(d, 'yyyy-MM-dd')),
						).length;

						return (
							<motion.div
								key={habit.id}
								layout
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.9 }}
								className="bg-[var(--surface)] rounded-[24px] shadow-[var(--shadow-card)] p-4 flex items-center gap-2"
							>
								{/* Habit icon & name */}
								<button
									className={cn(
										'shrink-0 flex flex-col items-center gap-0.5 w-10 transition-colors',
										deletingId === habit.id
											? 'text-[var(--danger)]'
											: 'text-[var(--ink)]',
									)}
									onClick={() => handleDelete(habit.id)}
									aria-label={
										deletingId === habit.id
											? 'Подтвердить удаление'
											: 'Удалить привычку'
									}
								>
									{deletingId === habit.id ? (
										<Trash2
											size={20}
											className="text-[var(--danger)]"
										/>
									) : (
										<span className="text-xl">
											{habit.icon}
										</span>
									)}
									<span className="text-[9px] font-bold truncate max-w-[40px] text-[var(--muted)]">
										{habit.name}
									</span>
								</button>

								<div className="flex-1 min-w-0" />

								{/* Day checkboxes */}
								<div className="flex gap-1">
									{weekDays.map((day) => {
										const dateKey = format(
											day,
											'yyyy-MM-dd',
										);
										const checked = isChecked(
											habit.id,
											dateKey,
										);

										return (
											<motion.button
												key={dateKey}
												whileTap={{ scale: 0.85 }}
												onClick={() =>
													onToggleLog(
														habit.id,
														dateKey,
													)
												}
												className={cn(
													'w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all duration-200',
													checked
														? 'border-transparent shadow-sm'
														: 'border-[var(--border)] bg-transparent',
												)}
												style={
													checked
														? {
																backgroundColor:
																	habit.color,
															}
														: undefined
												}
												aria-label={`${habit.name} ${format(day, 'd MMM', { locale: ru })}`}
											>
												{checked && (
													<motion.div
														initial={{ scale: 0 }}
														animate={{ scale: 1 }}
														transition={{
															type: 'spring',
															stiffness: 500,
															damping: 25,
														}}
													>
														<Check
															size={16}
															strokeWidth={3}
															className="text-white"
														/>
													</motion.div>
												)}
											</motion.button>
										);
									})}
								</div>

								{/* Week progress */}
								<div className="shrink-0 w-6 text-center">
									<span
										className="text-[11px] font-bold tabular-nums"
										style={{
											color:
												checkedCount === 7
													? habit.color
													: 'var(--muted)',
										}}
									>
										{checkedCount}/7
									</span>
								</div>
							</motion.div>
						);
					})}
				</AnimatePresence>

				{habits.length === 0 && !showAddForm && (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<div className="text-[48px] mb-4">🌱</div>
						<h3 className="text-lg font-bold text-[var(--ink)] font-[var(--font-display)] mb-2">
							Нет привычек
						</h3>
						<p className="text-sm text-[var(--muted)] mb-6 max-w-[240px]">
							Добавьте привычки для ежедневного трекинга — вода,
							спорт, чтение
						</p>
					</div>
				)}

				{/* Add habit form */}
				<AnimatePresence>
					{showAddForm && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							className="overflow-hidden"
						>
							<div className="bg-[var(--surface)] rounded-[24px] shadow-[var(--shadow-card)] p-5 flex flex-col gap-4">
								<input
									type="text"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="Название привычки"
									maxLength={100}
									autoFocus
									className="w-full bg-[var(--surface-2)] rounded-2xl px-4 py-3 text-[var(--ink)] placeholder:text-[var(--muted)] outline-none border border-[var(--border)] focus:border-[var(--accent)] transition-colors"
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleSubmit();
										if (e.key === 'Escape')
											setShowAddForm(false);
									}}
									onFocus={(e) =>
										setTimeout(
											() =>
												e.target.scrollIntoView({
													behavior: 'smooth',
													block: 'center',
												}),
											300,
										)
									}
								/>

								{/* Icon picker */}
								<div>
									<div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
										Иконка
									</div>
									<div className="flex gap-2 flex-wrap">
										{HABIT_ICONS.map((icon) => (
											<button
												key={icon}
												onClick={() => setNewIcon(icon)}
												className={cn(
													'w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all',
													newIcon === icon
														? 'bg-[var(--accent)]/15 ring-2 ring-[var(--accent)] scale-110'
														: 'bg-[var(--surface-2)]',
												)}
											>
												{icon}
											</button>
										))}
									</div>
								</div>

								{/* Color picker */}
								<div>
									<div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
										Цвет
									</div>
									<div className="flex gap-2">
										{TASK_COLOR_OPTIONS.map((color) => (
											<button
												key={color}
												onClick={() =>
													setNewColor(color)
												}
												className={cn(
													'w-8 h-8 rounded-full transition-all',
													newColor === color &&
														'ring-2 ring-offset-2 ring-offset-[var(--surface)] scale-110',
												)}
												style={{
													backgroundColor: color,
													boxShadow:
														newColor === color
															? `0 0 0 2px ${color}`
															: undefined,
												}}
											/>
										))}
									</div>
								</div>

								{/* Actions */}
								<div className="flex gap-3">
									<button
										onClick={() => setShowAddForm(false)}
										className="flex-1 py-3 rounded-2xl bg-[var(--surface-2)] text-[var(--muted)] font-bold transition-colors active:scale-95"
									>
										Отмена
									</button>
									<button
										onClick={handleSubmit}
										disabled={!newName.trim()}
										className="flex-1 py-3 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] font-bold transition-all active:scale-95 disabled:opacity-40"
									>
										Добавить
									</button>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* FAB for adding habit */}
			{!showAddForm && (
				<motion.button
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					whileTap={{ scale: 0.9 }}
					onClick={() => setShowAddForm(true)}
					className={cn(
						'fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-lg',
						isDesktop
							? 'bottom-8 right-8'
							: 'bottom-[calc(5.5rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] right-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))]',
					)}
					aria-label="Добавить привычку"
				>
					<Plus size={24} strokeWidth={2.5} />
				</motion.button>
			)}
		</div>
	);
}
