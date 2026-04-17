'use client';

import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';

type TaskCardProps = {
	children: ReactNode;
	details?: ReactNode;
	detailsHeight?: number | 'auto';
	isExpanded?: boolean;
	overlay?: ReactNode;
	reduceMotion?: boolean;
	surfaceStyle?: CSSProperties;
};

export default function TaskCard({
	children,
	details,
	detailsHeight = 'auto',
	isExpanded = false,
	overlay,
	reduceMotion = false,
	surfaceStyle,
}: TaskCardProps) {
	return (
		<div
			className="flex flex-col relative z-10 rounded-[inherit] transition-colors duration-200"
			style={surfaceStyle}
		>
			{overlay}
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
