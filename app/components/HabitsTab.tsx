'use client';

import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDays, format, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
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

function getGreeting(): string {
	const h = new Date().getHours();
	if (h < 6) return 'Доброй ночи 🌙';
	if (h < 12) return 'Доброе утро ☀️';
	if (h < 18) return 'Добрый день 🌤';
	return 'Добрый вечер 🌅';
}

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
	const deleteResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const weekDays = useMemo(() => {
		const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
		return Array.from({ length: 7 }, (_, i) => addDays(start, i));
	}, [selectedDate]);

	/* Summary stats */
	const todayKey = format(new Date(), 'yyyy-MM-dd');
	const todayDone = habits.filter((h) => isChecked(h.id, todayKey)).length;
	const todayTotal = habits.length;
	const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

	/* Progress ring math */
	const circumference = 2 * Math.PI * 20; // r=20
	const strokeOffset = circumference - (pct / 100) * circumference;

	useEffect(() => {
		return () => {
			if (deleteResetTimeoutRef.current) clearTimeout(deleteResetTimeoutRef.current);
		};
	}, []);

	const handleSubmit = ({ color, icon, name }: HabitFormSubmitValue) => {
		onAddHabit(name, icon, color);
		setShowAddForm(false);
	};

	const handleRequestDelete = (id: string) => {
		if (deleteResetTimeoutRef.current) {
			clearTimeout(deleteResetTimeoutRef.current);
			deleteResetTimeoutRef.current = null;
		}
		setDeletingId(id);
	};

	const handleConfirmDelete = (id: string) => {
		if (deleteResetTimeoutRef.current) {
			clearTimeout(deleteResetTimeoutRef.current);
			deleteResetTimeoutRef.current = null;
		}
		onDeleteHabit(id);
		setDeletingId(null);
	};

	const handleCancelDelete = () => {
		if (deleteResetTimeoutRef.current) {
			clearTimeout(deleteResetTimeoutRef.current);
			deleteResetTimeoutRef.current = null;
		}
		setDeletingId(null);
	};

	const safeTop =
		'calc(max(env(safe-area-inset-top), var(--tg-content-safe-top, 0px)) + var(--tma-tg-controls-top, 0px))';

	const scrollClasses = cn(
		'h-full w-full overflow-y-auto touch-pan-y overscroll-contain',
		isDesktop ? 'custom-scrollbar px-6 pb-12 pt-6' : 'no-scrollbar pb-32',
	);

	if (isLoading) {
		return (
			<div className={cn(scrollClasses, 'flex flex-col gap-3')} style={{ paddingTop: isDesktop ? undefined : `calc(0.75rem + ${safeTop})`, paddingLeft: isDesktop ? undefined : '14px', paddingRight: isDesktop ? undefined : '14px' }}>
				{[0.8, 0.6, 0.9].map((w, i) => (
					<div key={i} className="rounded-[20px] p-4" style={{ background: 'var(--surface)', boxShadow: '0 0.5px 1px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04)' }}>
						<div className="h-5 rounded-lg skeleton-shimmer" style={{ width: `${w * 100}%` }} />
						<div className="flex gap-2 mt-3">
							{Array.from({ length: 7 }).map((_, j) => (
								<div key={j} className="w-9 h-9 rounded-full skeleton-shimmer" />
							))}
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div
			className={scrollClasses}
			style={{
				paddingTop: isDesktop ? undefined : `calc(0.75rem + ${safeTop})`,
				paddingLeft: isDesktop ? undefined : '14px',
				paddingRight: isDesktop ? undefined : '14px',
			}}
		>
			{/* ===== Greeting Header ===== */}
			{!isDesktop && (
				<div className="px-1.5 pb-4">
					<div className="flex items-center justify-between gap-3">
						{/* Left: greeting */}
						<div className="flex flex-col gap-0.5 min-w-0">
							<h1 className="text-[22px] font-extrabold text-[var(--ink)] tracking-tight leading-tight">
								{getGreeting()}
							</h1>
							<p className="text-[13px] font-medium text-[var(--muted)] tracking-wide">
								{format(new Date(), 'd MMMM, EEEE', { locale: ru })}
							</p>
						</div>
						{/* Right: progress ring */}
						{todayTotal > 0 && (
							<div className="relative w-11 h-11 shrink-0">
								<svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
									<circle cx="24" cy="24" r="20" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
									<motion.circle
										cx="24"
										cy="24"
										r="20"
										fill="none"
										stroke={pct === 100 ? '#30d158' : 'var(--accent)'}
										strokeWidth="4"
										strokeLinecap="round"
										strokeDasharray={circumference}
										initial={{ strokeDashoffset: circumference }}
										animate={{ strokeDashoffset: strokeOffset }}
										transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
									/>
								</svg>
								<span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-[var(--ink)] tabular-nums">
									{todayDone}/{todayTotal}
								</span>
							</div>
						)}
					</div>
					{/* Progress bar */}
					{todayTotal > 0 && (
						<div
							className="mt-3 h-1 rounded-full overflow-hidden"
							style={{ background: 'rgba(0,0,0,0.05)' }}
						>
							<motion.div
								className="h-full rounded-full relative"
								initial={{ width: 0 }}
								animate={{ width: `${pct}%` }}
								transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
								style={{
									background:
										pct === 100
											? 'linear-gradient(90deg, #30d158, #34c759)'
											: 'linear-gradient(90deg, var(--accent), var(--accent-secondary, #5856d6))',
								}}
							/>
						</div>
					)}
				</div>
			)}

			{/* ===== Habits list ===== */}
			<div
				className={cn(
					isDesktop
						? 'grid grid-cols-2 items-start gap-4'
						: 'flex flex-col',
				)}
				style={isDesktop ? undefined : { gap: 10 }}
			>
				<AnimatePresence mode="popLayout">
					{habits.map((habit) => (
						<motion.div
							key={habit.id}
							layout
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9 }}
						>
							<HabitCard
								habit={habit}
								isChecked={isChecked}
								isDeleting={deletingId === habit.id}
								isLogPending={isLogPending}
								onCancelDelete={handleCancelDelete}
							onConfirmDelete={handleConfirmDelete}
							onRequestDelete={handleRequestDelete}
								onToggleLog={onToggleLog}
								weekDays={weekDays}
							/>
						</motion.div>
					))}
				</AnimatePresence>

				{habits.length === 0 && !showAddForm && (
					<div
						className={cn(
							'flex flex-col items-center justify-center py-16 text-center',
							isDesktop && 'col-span-2',
						)}
					>
						<div className="text-[48px] mb-4">🌱</div>
						<h3 className="text-lg font-bold text-[var(--ink)] mb-2">
							Нет привычек
						</h3>
						<p className="text-sm text-[var(--muted)] mb-6 max-w-[240px]">
							Добавьте привычки для ежедневного трекинга — вода, спорт, чтение
						</p>
					</div>
				)}

				<AnimatePresence>
					{showAddForm && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							className={cn(
								'overflow-hidden',
								isDesktop && 'col-span-2',
							)}
						>
							<HabitForm
								onSubmit={handleSubmit}
								onCancel={() => setShowAddForm(false)}
							/>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Inline "new habit" card for desktop */}
				{isDesktop && !showAddForm && (
					<motion.button
						type="button"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => {
							setDeletingId(null);
							setShowAddForm(true);
						}}
						className="flex min-h-[160px] w-full flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-[var(--border)] bg-transparent p-6 text-[var(--muted)] outline-none transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
						aria-label="Новая привычка"
					>
						<Plus size={32} strokeWidth={2} />
						<span className="text-[15px] font-bold">
							Новая привычка
						</span>
					</motion.button>
				)}
			</div>

			{/* FAB for adding habit — mobile only */}
			{!isDesktop && !showAddForm && (
				<motion.button
					type="button"
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					whileTap={{ scale: 0.88 }}
					onClick={() => {
						setDeletingId(null);
						setShowAddForm(true);
					}}
					className={cn(
						'fixed z-40 flex items-center justify-center rounded-full text-white',
						isDesktop
							? 'bottom-8 right-8 h-14 w-14 bg-[var(--accent)]'
							: 'bottom-[calc(5.5rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] right-4 h-[52px] w-[52px]',
					)}
					style={
						!isDesktop
							? {
									background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary, #5856d6) 100%)',
									boxShadow: '0 4px 16px -2px rgba(0,122,255,0.4), 0 8px 32px -4px rgba(88,86,214,0.3)',
								}
							: undefined
					}
					aria-label="Добавить привычку"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
				</motion.button>
			)}
		</div>
	);
}
