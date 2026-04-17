'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/app/lib/cn';
import type { TaskChecklistItem } from '@/app/types/task';
import ChecklistInput from './ChecklistInput';

export type ChecklistEditorProps = {
	items: TaskChecklistItem[];
	onAddItem: (value: string) => void;
	onDeleteItem: (index: number) => void;
	onToggleItem: (index: number) => void;
	reduceMotion?: boolean;
	taskColor: string;
	taskId: string;
};

type ChecklistRowProps = {
	index: number;
	item: TaskChecklistItem;
	onDeleteItem: (index: number) => void;
	onToggleItem: (index: number) => void;
	reduceMotion: boolean;
};

function ChecklistRow({
	index,
	item,
	onDeleteItem,
	onToggleItem,
	reduceMotion,
}: ChecklistRowProps) {
	return (
		<div
			className={cn(
				'group flex items-center gap-3 w-full rounded-2xl px-3 py-2.5 border border-[var(--border)]/30',
				reduceMotion
					? 'bg-[var(--surface-2)]/50'
					: 'bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] transition-colors hover:border-[var(--border)]/60',
			)}
		>
			<button
				type="button"
				onClick={() => onToggleItem(index)}
				aria-label={`Отметить шаг ${item.text}`}
				className={cn(
					'flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center',
					reduceMotion ? '' : 'transition-colors duration-200',
					item.done
						? 'bg-[var(--ink)] border-[var(--ink)]'
						: reduceMotion
							? 'border-[var(--muted)]/40'
							: 'border-[var(--muted)]/40 hover:border-[var(--accent)]',
				)}
			>
				{item.done ? (
					reduceMotion ? (
						<Check
							size={12}
							className="text-[var(--bg)]"
							strokeWidth={3.5}
						/>
					) : (
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{
								type: 'spring',
								stiffness: 400,
								damping: 25,
							}}
						>
							<Check
								size={12}
								className="text-[var(--bg)]"
								strokeWidth={3.5}
							/>
						</motion.div>
					)
				) : null}
			</button>

			<button
				type="button"
				onClick={() => onToggleItem(index)}
				aria-label={`Переключить шаг ${item.text}`}
				className={cn(
					'flex-1 text-left text-[14px] leading-snug break-words select-none font-medium rounded-lg outline-none',
					reduceMotion ? '' : 'transition-colors duration-300',
					item.done
						? 'text-[var(--muted)] line-through decoration-[var(--muted)] decoration-2'
						: 'text-[var(--ink)]',
				)}
			>
				{item.text}
			</button>

			<button
				type="button"
				onClick={() => onDeleteItem(index)}
				aria-label={`Удалить шаг ${item.text}`}
				className={cn(
					'w-6 h-6 flex items-center justify-center rounded-full text-[var(--muted)]/40 outline-none',
					reduceMotion
						? 'opacity-100'
						: 'hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 focus-visible:opacity-100 focus-visible:text-[var(--danger)] focus-visible:bg-[var(--danger)]/10 focus-visible:ring-2 focus-visible:ring-[var(--danger)]/20 transition-[transform,opacity,colors] active:scale-90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
				)}
			>
				<X size={14} />
			</button>
		</div>
	);
}

export default function ChecklistEditor({
	items,
	onAddItem,
	onDeleteItem,
	onToggleItem,
	reduceMotion = false,
	taskColor,
	taskId,
}: ChecklistEditorProps) {
	const completedSteps = items.filter((item) => item.done).length;
	const totalSteps = items.length;
	const checklistProgress =
		totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
	const isAllStepsDone = totalSteps > 0 && completedSteps === totalSteps;

	const itemKeys = useMemo(() => {
		const counts = new Map<string, number>();
		return items.map((item) => {
			const count = counts.get(item.text) ?? 0;
			counts.set(item.text, count + 1);
			return `${taskId}-step-${item.text}-${count}`;
		});
	}, [items, taskId]);

	return (
		<div className="bg-[var(--surface)] rounded-[20px] p-3 border border-[var(--border)]/40 shadow-sm">
			<div className="flex items-center justify-between mb-3 pl-1 pr-1">
				<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest flex items-center gap-2">
					<span>Подзадачи</span>
					<span
						className="px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold transition-colors duration-300"
						style={{
							color: isAllStepsDone ? taskColor : 'var(--ink)',
							background: isAllStepsDone
								? `color-mix(in srgb, ${taskColor} 15%, var(--surface-2))`
								: 'var(--surface-2)',
						}}
					>
						{completedSteps}/{totalSteps}
					</span>
				</div>
			</div>

			{totalSteps > 0 ? (
				<div className="h-1 w-full bg-[var(--surface-2)] rounded-full mb-4 overflow-hidden">
					<motion.div
						className="h-full transition-colors duration-500"
						style={{
							backgroundColor: isAllStepsDone
								? taskColor
								: 'var(--ink)',
						}}
						initial={reduceMotion ? false : { width: 0 }}
						animate={{ width: `${checklistProgress}%` }}
						transition={
							reduceMotion
								? { duration: 0 }
								: { duration: 0.5, ease: 'circOut' }
						}
					/>
				</div>
			) : null}

			<ul className="space-y-1">
				{reduceMotion ? (
					items.map((item, index) => (
						<li key={itemKeys[index]}>
							<ChecklistRow
								index={index}
								item={item}
								onDeleteItem={onDeleteItem}
								onToggleItem={onToggleItem}
								reduceMotion
							/>
						</li>
					))
				) : (
					<AnimatePresence initial={false}>
						{items.map((item, index) => (
							<motion.li
								key={itemKeys[index]}
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
								transition={{ duration: 0.2 }}
							>
								<ChecklistRow
									index={index}
									item={item}
									onDeleteItem={onDeleteItem}
									onToggleItem={onToggleItem}
									reduceMotion={false}
								/>
							</motion.li>
						))}
					</AnimatePresence>
				)}
			</ul>

			<ChecklistInput onSubmit={onAddItem} />
		</div>
	);
}
