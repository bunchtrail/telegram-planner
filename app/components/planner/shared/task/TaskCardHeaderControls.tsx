'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, GripVertical, Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { cn } from '@/app/lib/cn';
import TaskCardActions from './TaskCardActions';

type TaskCardHeaderControlsProps = {
	canReorder?: boolean;
	isActive: boolean;
	isDesktop?: boolean;
	showTimerAction: boolean;
	onDelete: () => void;
	onDragStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
	onEdit: () => void;
	onMoveTomorrow: () => void;
	onToggleActive: () => void;
};

export default function TaskCardHeaderControls({
	canReorder = true,
	isActive,
	isDesktop = false,
	showTimerAction,
	onDelete,
	onDragStart,
	onEdit,
	onMoveTomorrow,
	onToggleActive,
}: TaskCardHeaderControlsProps) {
	return (
		<TaskCardActions isDesktop={isDesktop} variant="header">
			{showTimerAction ? (
				<button
					type="button"
					aria-label={
						isActive ? 'Поставить таймер на паузу' : 'Запустить таймер'
					}
					onClick={(event) => {
						event.stopPropagation();
						onToggleActive();
					}}
					className={cn(
						'flex items-center justify-center rounded-full transition-[transform,colors] active:scale-90 relative z-20',
						isDesktop ? 'h-9 w-9' : 'h-8 w-8',
						isActive
							? 'bg-[var(--task-color)] text-[var(--bg)] shadow-lg'
							: 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)]',
					)}
				>
					{isActive ? (
						<Pause size={isDesktop ? 16 : 14} fill="currentColor" />
					) : (
						<Play
							size={isDesktop ? 16 : 14}
							fill="currentColor"
							className="ml-0.5"
						/>
					)}
				</button>
			) : null}

			{isDesktop ? (
				<>
					<button
						type="button"
						aria-label="Изменить задачу"
						onClick={(event) => {
							event.stopPropagation();
							onEdit();
						}}
						className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors opacity-0 group-hover:opacity-100 duration-200"
						title="Изменить"
					>
						<Pencil size={18} />
					</button>
					<button
						type="button"
						aria-label="Перенести на завтра"
						onClick={(event) => {
							event.stopPropagation();
							onMoveTomorrow();
						}}
						className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors opacity-0 group-hover:opacity-100 duration-200"
						title="На завтра"
					>
						<ArrowRight size={18} />
					</button>
					<button
						type="button"
						aria-label="Удалить задачу"
						onClick={(event) => {
							event.stopPropagation();
							onDelete();
						}}
						className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors opacity-0 group-hover:opacity-100 duration-200"
						title="Удалить"
					>
						<Trash2 size={18} />
					</button>
				</>
			) : null}

			<div
				aria-hidden="true"
				className={cn(
					'flex items-center justify-center text-[var(--muted)] touch-none [touch-action:none]',
					isDesktop
						? 'h-9 w-6 opacity-20 hover:opacity-100'
						: 'h-8 w-8 opacity-20 group-hover:opacity-50 transition-opacity -mr-1',
					canReorder
						? 'cursor-grab active:cursor-grabbing'
						: 'cursor-not-allowed opacity-10',
				)}
				onPointerDown={(event) => {
					if (!canReorder) return;
					onDragStart(event);
				}}
			>
				<GripVertical size={isDesktop ? 18 : 20} />
			</div>
		</TaskCardActions>
	);
}
