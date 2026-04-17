'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { addDays, startOfWeek } from 'date-fns';
import { cn } from '../lib/cn';
import type { Habit } from '../types/habit';
import HabitCard from './planner/shared/habit/HabitCard';
import HabitForm, {
	type HabitFormSubmitValue,
} from './planner/shared/habit/HabitForm';

type HabitsTabProps = {
	habits: Habit[];
	isLoading: boolean;
	isChecked: (habitId: string, date: string) => boolean;
	isLogPending?: (habitId: string, date: string) => boolean;
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
	isLogPending,
	onToggleLog,
	onAddHabit,
	onDeleteHabit,
	selectedDate,
	isDesktop = false,
}: HabitsTabProps) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const deleteResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const weekDays = useMemo(() => {
		const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
		return Array.from({ length: 7 }, (_, i) => addDays(start, i));
	}, [selectedDate]);

	useEffect(() => {
		return () => {
			if (deleteResetTimeoutRef.current) {
				clearTimeout(deleteResetTimeoutRef.current);
			}
		};
	}, []);

	const handleSubmit = ({ color, icon, name }: HabitFormSubmitValue) => {
		onAddHabit(name, icon, color);
		setShowAddForm(false);
	};

	const handleDelete = (id: string) => {
		if (deleteResetTimeoutRef.current) {
			clearTimeout(deleteResetTimeoutRef.current);
			deleteResetTimeoutRef.current = null;
		}

		if (deletingId === id) {
			onDeleteHabit(id);
			setDeletingId(null);
		} else {
			setDeletingId(id);
			deleteResetTimeoutRef.current = setTimeout(() => {
				setDeletingId((current) => (current === id ? null : current));
				deleteResetTimeoutRef.current = null;
			}, 3000);
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
			{/* Habits list */}
			<div className="flex flex-col gap-3">
				<AnimatePresence mode="popLayout">
					{habits.map((habit) => (
						<motion.div
							key={habit.id}
							layout
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
						>
							<HabitCard
								habit={habit}
								isChecked={isChecked}
								isDeleting={deletingId === habit.id}
								isLogPending={isLogPending}
								onDelete={handleDelete}
								onToggleLog={onToggleLog}
								weekDays={weekDays}
							/>
						</motion.div>
					))}
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
							<HabitForm
								onSubmit={handleSubmit}
								onCancel={() => setShowAddForm(false)}
							/>
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
					onClick={() => {
						setDeletingId(null);
						setShowAddForm(true);
					}}
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
