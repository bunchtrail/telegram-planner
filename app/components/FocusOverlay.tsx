'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Minimize2, Volume2 } from 'lucide-react';
import type { Task } from '../types/task';
import { isIOSDevice } from '../lib/platform';

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

type FocusOverlayProps = {
	task: Task;
	isActive: boolean;
	onToggleTimer: () => void;
	onClose: () => void;
};

const formatTime = (ms: number) => {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function FocusOverlay({
	task,
	isActive,
	onToggleTimer,
	onClose,
}: FocusOverlayProps) {
	const [soundIdx, setSoundIdx] = useState<number | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();
	const isIOS = isIOSDevice();
	const reduceMotion = Boolean(prefersReducedMotion);
	const reduceHeavyEffects = reduceMotion || isIOS;
	const [tickNow, setTickNow] = useState(() => Date.now());

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
			: (task.elapsedMs ?? 0);

	const targetMs = (task.duration || 30) * 60 * 1000;
	const progress = Math.min(100, (elapsedMs / targetMs) * 100);
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
			className="fixed inset-0 z-[60] bg-[var(--bg)] flex flex-col items-center justify-center px-6 text-center"
			style={{
				paddingTop:
					'max(env(safe-area-inset-top), var(--tg-content-safe-top, 0px))',
				paddingBottom:
					'max(env(safe-area-inset-bottom), var(--tg-content-safe-bottom, 0px))',
			}}
		>
			<button
				onClick={onClose}
				className="absolute p-4 bg-[var(--surface-2)] rounded-full"
				style={{
					top: 'calc(max(env(safe-area-inset-top), var(--tg-content-safe-top, 0px)) + 1rem)',
					right: 'calc(max(env(safe-area-inset-right), var(--tg-content-safe-right, 0px)) + 1rem)',
				}}
				aria-label="Свернуть"
			>
				<Minimize2 />
			</button>

			<h2
				id="focus-title"
				className="text-3xl font-bold text-center mb-8 font-[var(--font-display)] max-w-sm"
			>
				{task.title}
			</h2>

			<div className="relative w-72 h-72 flex items-center justify-center mb-12">
				{isActive && !reduceHeavyEffects && (
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
						className="absolute inset-0 rounded-full bg-[var(--accent)] blur-2xl"
					/>
				)}

				<div className="absolute inset-0 rounded-full border-[8px] border-[var(--surface-2)]" />

				<svg
					className="absolute inset-0 rotate-[-90deg] w-full h-full pointer-events-none"
					viewBox="0 0 288 288"
				>
					<circle
						stroke={task.color || 'var(--accent)'}
						fill="transparent"
						strokeWidth={stroke}
						strokeDasharray={`${circumference} ${circumference}`}
						style={{ strokeDashoffset }}
						strokeLinecap="round"
						r={normalizedRadius}
						cx="144"
						cy="144"
						className="transition-all duration-1000 ease-linear"
					/>
				</svg>

				<div className="text-7xl font-bold font-mono tabular-nums z-10">
					{formatTime(elapsedMs)}
				</div>
			</div>

			<div className="flex gap-6">
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
					onClick={onToggleTimer}
					className="px-10 py-5 rounded-3xl bg-[var(--ink)] text-[var(--bg)] font-bold text-xl shadow-xl active:scale-95 transition-transform"
				>
					{isActive ? 'Пауза' : 'Старт'}
				</button>
			</div>

			{soundIdx !== null && (
				<audio src={SOUNDS[soundIdx].url} autoPlay loop />
			)}
		</motion.div>
	);
}

