'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/app/lib/cn';

type TaskCardMetaProps = {
	completedSteps: number;
	duration: number;
	elapsedLabel: string;
	hasElapsed: boolean;
	isActive: boolean;
	isDesktop?: boolean;
	isExpanded: boolean;
	reduceMotion?: boolean;
	startTimeLabel: string | null;
	taskColor: string;
	totalSteps: number;
};

function ActiveWave() {
	return (
		<div className="flex items-end gap-[2px] h-3 pb-[1px] mx-1">
			{[0, 1, 2].map((index) => (
				<motion.div
					key={index}
					className="w-[2px] bg-current rounded-full"
					animate={{ height: [3, 10, 3] }}
					transition={{
						duration: 0.8,
						repeat: Infinity,
						delay: index * 0.15,
						ease: 'easeInOut',
					}}
				/>
			))}
		</div>
	);
}

export default function TaskCardMeta({
	completedSteps,
	duration,
	elapsedLabel,
	hasElapsed,
	isActive,
	isDesktop = false,
	isExpanded,
	reduceMotion = false,
	startTimeLabel,
	taskColor,
	totalSteps,
}: TaskCardMetaProps) {
	if (isActive) {
		return reduceMotion ? (
			<div className="inline-flex items-center text-[var(--task-color)] font-bold tabular-nums">
				<span
					className={cn(
						'min-w-[7ch] text-right',
						isDesktop ? 'text-[15px]' : 'text-[14px]',
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
						isDesktop ? 'text-[15px]' : 'text-[14px]',
					)}
				>
					{elapsedLabel}
				</span>
			</div>
		);
	}

	return (
		<>
			<div className="flex items-center gap-3 flex-wrap opacity-70">
				{startTimeLabel ? (
					<div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-bold tabular-nums text-[var(--ink)] opacity-90">
						{startTimeLabel}
					</div>
				) : null}
				<div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] opacity-80 uppercase tracking-wide">
					<Clock size={11} strokeWidth={2.5} />
					<span>{duration} мин</span>
				</div>

				{hasElapsed ? (
					<div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] opacity-80 uppercase tracking-wide">
						<span>Факт: {elapsedLabel}</span>
					</div>
				) : null}

				{totalSteps > 0 && !isExpanded ? (
					<div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] opacity-80">
						<div
							className="w-1.5 h-1.5 rounded-full"
							style={{
								backgroundColor:
									completedSteps === totalSteps
										? taskColor
										: 'var(--muted)',
							}}
						/>
						<span>
							{completedSteps}/{totalSteps}
						</span>
					</div>
				) : null}
			</div>

			{isExpanded && !isDesktop ? (
				<motion.span
					initial={reduceMotion ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-[11px] font-semibold text-[var(--muted)] flex items-center ml-auto mr-2"
				>
					Опции
					<ChevronDown size={10} className="rotate-180 ml-0.5" />
				</motion.span>
			) : null}
		</>
	);
}
