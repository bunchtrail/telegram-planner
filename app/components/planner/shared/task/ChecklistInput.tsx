'use client';

import { useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { CornerDownLeft, Plus } from 'lucide-react';

export type ChecklistInputProps = {
	onSubmit: (value: string) => void;
	placeholder?: string;
};

export default function ChecklistInput({
	onSubmit,
	placeholder = 'Добавить шаг...',
}: ChecklistInputProps) {
	const [value, setValue] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const canSubmit = value.trim().length > 0;

	const focusInput = (preventScroll = false) => {
		const input = inputRef.current;
		if (!input) return;
		if (preventScroll) {
			try {
				input.focus({ preventScroll: true });
				return;
			} catch {}
		}
		input.focus();
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = value.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
		setValue('');
		requestAnimationFrame(() => {
			focusInput(true);
		});
	};

	const handlePointerDown = (event: ReactPointerEvent<HTMLInputElement>) => {
		event.stopPropagation();
		if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
			return;
		}
		event.preventDefault();
		focusInput(true);
	};

	return (
		<form onSubmit={handleSubmit} className="mt-2 relative group">
			<div className="flex items-center gap-3 w-full bg-transparent rounded-2xl px-3 py-2 border border-dashed border-[var(--border)]/60 hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)]/30 transition-all duration-200 focus-within:border-[var(--accent)] focus-within:bg-[var(--surface)] focus-within:shadow-sm">
				<div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--muted)]">
					<Plus size={16} />
				</div>
				<input
					ref={inputRef}
					type="text"
					value={value}
					onChange={(event) => setValue(event.target.value)}
					onPointerDown={handlePointerDown}
					placeholder={placeholder}
					aria-label="Добавить шаг"
					className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--muted)]/60 text-[var(--ink)] min-w-0"
				/>
				<button
					type="submit"
					aria-label="Добавить шаг"
					disabled={!canSubmit}
					className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--ink)] text-[var(--bg)] opacity-0 scale-75 transition-[transform,opacity] disabled:opacity-0 group-focus-within:opacity-100 group-focus-within:scale-100 disabled:group-focus-within:opacity-30 disabled:group-focus-within:scale-90"
				>
					<CornerDownLeft size={12} strokeWidth={3} />
				</button>
			</div>
		</form>
	);
}
