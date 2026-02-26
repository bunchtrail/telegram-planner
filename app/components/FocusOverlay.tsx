'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Minimize2, Volume2, SkipForward, Timer, Clock } from 'lucide-react';
import type { Task } from '../types/task';
import { isIOSDevice } from '../lib/platform';
import { usePomodoro } from '../hooks/usePomodoro';
import type { SupabaseErrorLike } from '../lib/task-utils';
import {
	POMODORO_FOCUS_MS,
	POMODORO_SHORT_BREAK_MS,
	POMODORO_LONG_BREAK_MS,
	POMODOROS_BEFORE_LONG_BREAK,
} from '../types/pomodoro';

const SOUNDS = [
	{
		name: 'Дождь',
		url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
	},
	{
		name: 'Кафе',
		url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
	},
];

type FocusMode = 'stopwatch' | 'pomodoro';

type FocusOverlayProps = {
	task: Task;
	isActive: boolean;
	onToggleTimer: () => void;
	onClose: () => void;
	runWithAuthRetry: <T extends { error: SupabaseErrorLike | null | undefined }>(
		operation: () => PromiseLike<T> | T,
	) => Promise<T>;
};

const formatTime = (ms: number) => {
	const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const phaseColor = (phase: string) => {
	switch (phase) {
		case 'focus':
			return 'var(--accent)';
		case 'short_break':
			return '#34c759';
		case 'long_break':
			return '#5856d6';
		default:
			return 'var(--accent)';
	}
};

export default function FocusOverlay({
	task,
	isActive,
	onToggleTimer,
	onClose,
	runWithAuthRetry,
}: FocusOverlayProps) {
	const [mode, setMode] = useState<FocusMode>('stopwatch');
	const [soundIdx, setSoundIdx] = useState<number | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();
	const isIOS = isIOSDevice();
	const reduceMotion = Boolean(prefersReducedMotion);
	const reduceHeavyEffects = reduceMotion || isIOS;
	const [tickNow, setTickNow] = useState(() => Date.now());

	const pomodoro = usePomodoro({ taskId: task.id, runWithAuthRetry });

	useEffect(() => {
		if (mode !== 'stopwatch') return;
		if (!isActive || !task.activeStartedAt) return;
		const interval = window.setInterval(() => {
			setTickNow(Date.now());
		}, 1000);
		return () => window.clearInterval(interval);
	}, [isActive, task.activeStartedAt, mode]);

	// Stopwatch calculations
	const elapsedMs =
		isActive && task.activeStartedAt
			? (task.elapsedMs ?? 0) +
				Math.max(0, tickNow - task.activeStartedAt.getTime())
			: (task.elapsedMs ?? 0);

	const targetMs = (task.duration || 30) * 60 * 1000;

	// Progress logic per mode
	const isPomodoro = mode === 'pomodoro';
	const currentPhaseDuration = isPomodoro
		? (pomodoro.phase === 'focus'
				? POMODORO_FOCUS_MS
				: pomodoro.phase === 'short_break'
					? POMODORO_SHORT_BREAK_MS
					: POMODORO_LONG_BREAK_MS)
		: targetMs;

	const displayTimeMs = isPomodoro ? pomodoro.timeLeftMs : elapsedMs;
	const progress = isPomodoro
		? Math.min(100, ((currentPhaseDuration - pomodoro.timeLeftMs) / currentPhaseDuration) * 100)
		: Math.min(100, (elapsedMs / targetMs) * 100);

	const ringColor = isPomodoro ? phaseColor(pomodoro.phase) : (task.color || 'var(--accent)');

	const radius = 136;
	const stroke = 8;
	const normalizedRadius = radius - stroke * 2;
	const circumference = normalizedRadius * 2 * Math.PI;
	const strokeDashoffset = circumference - (progress / 100) * circumference;

	useEffect(() => {
		dialogRef.current?.focus();
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	const toggleSound = () => {
		if (SOUNDS.length === 0) return;
		const next =
			soundIdx === null
				? 0
				: soundIdx + 1 >= SOUNDS.length
					? null
					: soundIdx + 1;
		setSoundIdx(next);
	};

	const handleMainAction = () => {
		if (isPomodoro) {
			pomodoro.toggle();
		} else {
			onToggleTimer();
		}
	};

	const timerRunning = isPomodoro ? pomodoro.isRunning : isActive;

	return (
		<motion.div
			ref={dialogRef}
			role="dialog"
			aria-modal="true"
			aria-labelledby="focus-title"
			tabIndex={-1}
			initial={{ y: reduceMotion ? 0 : '100%' }}
			animate={{ y: 0 }}
			exit={{ y: reduceMotion ? 0 : '100%' }}
			transition={{
				type: 'spring',
				damping: 30,
				stiffness: 350,
				mass: 0.8,
			}}
			className="fixed inset-0 z-[60] bg-[var(--bg)] flex flex-col items-center justify-center px-6 text-center"
			style={{
				paddingTop:
					'max(env(safe-area-inset-top), var(--tg-content-safe-top, 0px))',
				paddingBottom:
					'max(env(safe-area-inset-bottom), var(--tg-content-safe-bottom, 0px))',
			}}
		>
			{/* Top buttons */}
			<div
				className="absolute flex items-center gap-3"
				style={{
					top: 'calc(max(env(safe-area-inset-top), var(--tg-content-safe-top, 0px)) + 1rem)',
					right: 'calc(max(env(safe-area-inset-right), var(--tg-content-safe-right, 0px)) + 1rem)',
				}}
			>
				{/* Mode toggle */}
				<div className="flex bg-[var(--surface-2)] rounded-full p-1 gap-0.5">
					<button
						onClick={() => setMode('stopwatch')}
						className={`p-2.5 rounded-full transition-all ${
							mode === 'stopwatch'
								? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
								: 'text-[var(--muted)]'
						}`}
						aria-label="Секундомер"
					>
						<Clock size={18} />
					</button>
					<button
						onClick={() => setMode('pomodoro')}
						className={`p-2.5 rounded-full transition-all ${
							mode === 'pomodoro'
								? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
								: 'text-[var(--muted)]'
						}`}
						aria-label="Помодоро"
					>
						<Timer size={18} />
					</button>
				</div>

				<button
					onClick={onClose}
					className="p-4 bg-[var(--surface-2)] rounded-full"
					aria-label="Свернуть"
				>
					<Minimize2 />
				</button>
			</div>

			<h2
				id="focus-title"
				className="text-3xl font-bold text-center mb-2 font-[var(--font-display)] max-w-sm"
			>
				{task.title}
			</h2>

			{/* Pomodoro phase label */}
			<AnimatePresence mode="wait">
				{isPomodoro && (
					<motion.div
						key={pomodoro.phase}
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 8 }}
						className="mb-6"
					>
						<span
							className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider"
							style={{
								backgroundColor: `color-mix(in srgb, ${phaseColor(pomodoro.phase)} 15%, transparent)`,
								color: phaseColor(pomodoro.phase),
							}}
						>
							{pomodoro.phaseLabel}
						</span>
					</motion.div>
				)}
			</AnimatePresence>

			{!isPomodoro && <div className="mb-6" />}

			<div className="relative w-72 h-72 flex items-center justify-center mb-8">
				{timerRunning && !reduceHeavyEffects && (
					<motion.div
						animate={{
							scale: [1, 1.1, 1],
							opacity: [0.2, 0.05, 0.2],
						}}
						transition={{
							duration: 3,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
						className="absolute inset-0 rounded-full blur-2xl"
						style={{ backgroundColor: ringColor }}
					/>
				)}

				<div className="absolute inset-0 rounded-full border-[8px] border-[var(--surface-2)]" />

				<svg
					className="absolute inset-0 rotate-[-90deg] w-full h-full pointer-events-none"
					viewBox="0 0 288 288"
				>
					<circle
						stroke={ringColor}
						fill="transparent"
						strokeWidth={stroke}
						strokeDasharray={`${circumference} ${circumference}`}
						style={{ strokeDashoffset }}
						strokeLinecap="round"
						r={normalizedRadius}
						cx="144"
						cy="144"
						className="transition-[stroke-dashoffset] duration-200 ease-linear"
					/>
				</svg>

				<div className="text-7xl font-bold font-mono tabular-nums z-10">
					{formatTime(displayTimeMs)}
				</div>
			</div>

			{/* Pomodoro rounds indicator */}
			{isPomodoro && (
				<div className="flex items-center gap-2 mb-6">
					{Array.from({ length: POMODOROS_BEFORE_LONG_BREAK }).map((_, i) => (
						<div
							key={i}
							className="w-3 h-3 rounded-full transition-all duration-300"
							style={{
								backgroundColor:
									i < pomodoro.round - (pomodoro.phase === 'focus' ? 1 : 0) + (pomodoro.phase !== 'focus' ? 1 : 0)
										? 'var(--accent)'
										: i === pomodoro.round - 1 && pomodoro.phase === 'focus'
											? `color-mix(in srgb, var(--accent) 40%, transparent)`
											: 'var(--surface-2)',
								transform:
									i === pomodoro.round - 1 && pomodoro.phase === 'focus' && pomodoro.isRunning
										? 'scale(1.3)'
										: 'scale(1)',
							}}
						/>
					))}
					{pomodoro.totalPomodoros > 0 && (
						<span className="text-xs font-bold text-[var(--muted)] ml-2 tabular-nums">
							×{pomodoro.totalPomodoros}
						</span>
					)}
				</div>
			)}

			<div className="flex gap-4 items-center">
				<button
					onClick={toggleSound}
					className={`p-5 rounded-full transition-colors ${
						soundIdx !== null
							? 'bg-[var(--accent)] text-[var(--accent-ink)]'
							: 'bg-[var(--surface-2)]'
					}`}
					aria-label="Переключить звук"
				>
					<Volume2 />
				</button>
				<button
					onClick={handleMainAction}
					className="px-10 py-5 rounded-3xl bg-[var(--ink)] text-[var(--bg)] font-bold text-xl shadow-xl active:scale-95 transition-transform"
				>
					{timerRunning ? 'Пауза' : 'Старт'}
				</button>
				{isPomodoro && (
					<button
						onClick={pomodoro.skip}
						className="p-5 rounded-full bg-[var(--surface-2)] transition-colors active:scale-95"
						aria-label="Пропустить"
					>
						<SkipForward />
					</button>
				)}
			</div>

			{soundIdx !== null && (
				<audio src={SOUNDS[soundIdx].url} autoPlay loop />
			)}
		</motion.div>
	);
}

