'use client';

import type { ReactNode } from 'react';
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
	return (
		<div
			className={cn(
				'flex items-start gap-4 pr-3',
				isDesktop ? 'p-6' : 'p-5',
			)}
		>
			{checkbox}

			<button
				type="button"
				aria-expanded={isExpanded}
				aria-label={`Открыть задачу ${title}`}
				onClick={onToggleExpand}
				className="flex-1 min-w-0 cursor-pointer select-none touch-manipulation text-left rounded-[20px] outline-none"
			>
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
			</button>

			<div className="flex items-center gap-2">{actions}</div>
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
