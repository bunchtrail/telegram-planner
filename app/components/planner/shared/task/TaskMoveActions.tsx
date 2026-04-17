'use client';

import { useRef } from 'react';
import { Calendar, Check, Sunrise, X } from 'lucide-react';

type TaskMoveActionsProps = {
	effectivePickerValue: string;
	hasPendingChange: boolean;
	onCancelPendingDate: () => void;
	onChangePendingDate: (value: string) => void;
	onConfirmPendingDate: () => void;
	onMoveTomorrow: () => void;
};

export default function TaskMoveActions({
	effectivePickerValue,
	hasPendingChange,
	onCancelPendingDate,
	onChangePendingDate,
	onConfirmPendingDate,
	onMoveTomorrow,
}: TaskMoveActionsProps) {
	const dateInputRef = useRef<HTMLInputElement>(null);

	const handleOpenDatePicker = () => {
		const input = dateInputRef.current;
		if (!input) return;

		if (typeof input.showPicker === 'function') {
			input.showPicker();
			return;
		}

		input.click();
	};

	return (
		<div className="grid grid-cols-2 gap-2 md:gap-3">
			<button
				type="button"
				aria-label="Перенести на завтра"
				onClick={(event) => {
					event.stopPropagation();
					onMoveTomorrow();
				}}
				className="col-span-1 flex flex-col items-center justify-center gap-1.5 h-[64px] md:h-[72px] rounded-[18px] bg-[var(--surface-2)] text-[var(--ink)] active:scale-[0.96] transition-all duration-200 relative overflow-hidden group border border-[var(--border)]/40 hover:border-[var(--border)]"
			>
				<div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
					<Sunrise size={18} className="text-[var(--accent)]" />
				</div>
				<span className="text-[11px] font-bold uppercase tracking-wide">
					Завтра
				</span>
			</button>

			<div className="col-span-1 relative h-[64px] md:h-[72px]">
				{hasPendingChange ? (
					<div className="absolute inset-0 flex flex-col gap-0.5">
						<button
							type="button"
							aria-label="Подтвердить перенос"
							onClick={(event) => {
								event.stopPropagation();
								onConfirmPendingDate();
							}}
							className="flex-1 w-full bg-[var(--ink)] text-[var(--bg)] rounded-t-[18px] flex items-center justify-center gap-1.5 active:opacity-90"
						>
							<Check size={14} strokeWidth={3} />
						</button>
						<button
							type="button"
							aria-label="Отменить перенос"
							onClick={(event) => {
								event.stopPropagation();
								onCancelPendingDate();
							}}
							className="flex-1 w-full bg-[var(--surface-2)] text-[var(--muted)] rounded-b-[18px] flex items-center justify-center gap-1.5 active:bg-[var(--border)]"
						>
							<X size={14} strokeWidth={3} />
						</button>
					</div>
				) : (
					<>
						<input
							ref={dateInputRef}
							type="date"
							value={effectivePickerValue}
							onChange={(event) => onChangePendingDate(event.target.value)}
							onClick={(event) => event.stopPropagation()}
							className="pointer-events-none absolute inset-0 w-full h-full opacity-0"
							tabIndex={-1}
							aria-hidden="true"
						/>
						<button
							type="button"
							aria-label="Выбрать дату"
							onClick={(event) => {
								event.stopPropagation();
								handleOpenDatePicker();
							}}
							className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[18px] bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--border)]/40 transition-colors hover:bg-[var(--border)] hover:border-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 focus-visible:border-[var(--accent)]"
						>
							<Calendar
								size={20}
								className="text-[var(--muted)] mb-0.5"
							/>
							<span className="text-[12px] font-bold">Дата</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
}
