'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { Pin } from 'lucide-react';
import { cn } from '@/app/lib/cn';

export type TaskCardHeaderProps = {
	actions: ReactNode;
	checkbox: ReactNode;
	completed?: boolean;
	isDesktop?: boolean;
	isExpanded: boolean;
	meta?: ReactNode;
	onToggleExpand: () => void;
	title: string;
	titleSuffix?: ReactNode;
};

export default function TaskCardHeader({
	actions,
	checkbox,
	completed = false,
	isDesktop = false,
	isExpanded,
	meta,
	onToggleExpand,
	title,
	titleSuffix,
}: TaskCardHeaderProps) {
	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onToggleExpand();
		}
	};

	return (
		<div
			role="button"
			tabIndex={0}
			aria-expanded={isExpanded}
			aria-label={`Открыть задачу ${title}`}
			onClick={onToggleExpand}
			onKeyDown={handleKeyDown}
			className={cn(
				'flex items-start gap-4 pr-3 cursor-pointer select-none touch-manipulation rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35',
				isDesktop ? 'p-6' : 'p-5',
			)}
		>
			{checkbox}

			<div className="flex-1 min-w-0 text-left">
				<div className="relative w-full max-w-full">
					<div className="flex items-center gap-2 min-w-0">
						<p
							className={cn(
								'font-semibold leading-snug tracking-tight transition-colors mb-1 font-[var(--font-display)]',
								isDesktop ? 'text-xl' : 'text-[17px]',
								completed
									? 'text-[var(--muted)] line-through decoration-2 decoration-[var(--border)]'
									: 'text-[var(--ink)]',
								!isExpanded && 'truncate',
							)}
						>
							{title}
						</p>
						{titleSuffix}
					</div>
				</div>

				{!completed && meta ? (
					<div className="flex items-center gap-3 flex-wrap mt-1 min-h-[20px]">
						{meta}
					</div>
				) : null}
			</div>

			<div
				className="flex items-center gap-2"
				onClick={(event) => event.stopPropagation()}
			>
				{actions}
			</div>
		</div>
	);
}

export function TaskCardPin({
	isDesktop = false,
}: {
	isDesktop?: boolean;
}) {
	return (
		<Pin
			size={isDesktop ? 14 : 12}
			className="text-[var(--accent)] fill-current rotate-45 flex-shrink-0"
		/>
	);
}
