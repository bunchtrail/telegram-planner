import type { ReactNode } from 'react';
import { cn } from '@/app/lib/cn';

export type TaskCardActionsProps = {
	children: ReactNode;
	isDesktop?: boolean;
	variant: 'header' | 'grid' | 'single';
};

export default function TaskCardActions({
	children,
	isDesktop = false,
	variant,
}: TaskCardActionsProps) {
	return (
		<div
			className={cn(
				variant === 'header' && 'flex items-center gap-2',
				variant === 'grid' && 'grid grid-cols-3 gap-2',
				variant === 'single' && 'w-full',
				variant === 'grid' && isDesktop && 'gap-3',
			)}
		>
			{children}
		</div>
	);
}
