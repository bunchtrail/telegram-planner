'use client';

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { animate, motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { cn } from '@/app/lib/cn';

type TaskCardProps = {
	children: ReactNode;
	details?: ReactNode;
	detailsHeight: number | 'auto';
	isActive: boolean;
	isDesktop?: boolean;
	isExpanded: boolean;
	reduceHeavyEffects: boolean;
	reduceMotion: boolean;
	taskColor: string;
	timeProgress: number;
};

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

export default function TaskCard({
	children,
	details,
	detailsHeight,
	isActive,
	isDesktop = false,
	isExpanded,
	reduceHeavyEffects,
	reduceMotion,
	taskColor,
	timeProgress,
}: TaskCardProps) {
	const surfaceStyle: CSSProperties | undefined =
		isExpanded && !isActive
			? {
					background: `color-mix(in srgb, ${taskColor} 5%, var(--surface))`,
				}
			: undefined;

	return (
		<div
			className="flex flex-col relative z-10 rounded-[inherit] transition-colors duration-200"
			style={surfaceStyle}
		>
			{isActive && !isExpanded ? (
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

					{!reduceHeavyEffects ? <ActiveBorder color={taskColor} /> : null}

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
			) : null}

			{children}

			<motion.div
				initial={false}
				animate={{
					height: isExpanded ? detailsHeight : 0,
					opacity: isExpanded ? 1 : 0,
				}}
				transition={
					reduceMotion
						? { duration: 0 }
						: { duration: 0.18, ease: 'easeOut' }
				}
				className="overflow-hidden"
				style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
			>
				{details}
			</motion.div>
		</div>
	);
}
