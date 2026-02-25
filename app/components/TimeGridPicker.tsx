'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/cn';

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatMinutes = (value: number) =>
	`${pad2(Math.floor(value / 60))}:${pad2(value % 60)}`;

const MINUTE_SLOTS = [0, 15, 30, 45] as const;

type TimePeriod = 'night' | 'morning' | 'day' | 'evening';

const TIME_PERIODS: {
	id: TimePeriod;
	label: string;
	emoji: string;
	hours: number[];
	color: string;
	bgFrom: string;
	bgTo: string;
}[] = [
	{
		id: 'night',
		label: 'Ночь',
		emoji: '🌙',
		hours: [0, 1, 2, 3, 4, 5],
		color: 'hsl(230, 50%, 65%)',
		bgFrom: 'hsl(230, 40%, 20%)',
		bgTo: 'hsl(230, 35%, 28%)',
	},
	{
		id: 'morning',
		label: 'Утро',
		emoji: '☀️',
		hours: [6, 7, 8, 9, 10, 11],
		color: 'hsl(35, 90%, 55%)',
		bgFrom: 'hsl(35, 55%, 22%)',
		bgTo: 'hsl(35, 45%, 30%)',
	},
	{
		id: 'day',
		label: 'День',
		emoji: '🌤',
		hours: [12, 13, 14, 15, 16, 17],
		color: 'hsl(200, 80%, 55%)',
		bgFrom: 'hsl(200, 45%, 20%)',
		bgTo: 'hsl(200, 40%, 28%)',
	},
	{
		id: 'evening',
		label: 'Вечер',
		emoji: '🌆',
		hours: [18, 19, 20, 21, 22, 23],
		color: 'hsl(270, 50%, 62%)',
		bgFrom: 'hsl(270, 35%, 22%)',
		bgTo: 'hsl(270, 30%, 30%)',
	},
];

type TimeGridPickerProps = {
	valueMinutes: number | null;
	durationMinutes: number;
	onChange: (minutes: number) => void;
	defaultMinutes?: number;
};

export default function TimeGridPicker({
	valueMinutes,
	durationMinutes,
	onChange,
}: TimeGridPickerProps) {
	const selectedHour =
		valueMinutes != null ? Math.floor(valueMinutes / 60) : null;
	const selectedMinute = valueMinutes != null ? valueMinutes % 60 : null;

	const [expandedHour, setExpandedHour] = useState<number | null>(
		selectedHour,
	);

	const endLabel = useMemo(() => {
		if (valueMinutes == null) return null;
		return formatMinutes(Math.min(24 * 60, valueMinutes + durationMinutes));
	}, [valueMinutes, durationMinutes]);

	const handleHourClick = useCallback(
		(hour: number) => {
			if (expandedHour === hour) {
				// collapse if clicking same hour again
				setExpandedHour(null);
			} else {
				setExpandedHour(hour);
				// auto-select :00 when a new hour is picked
				onChange(hour * 60);
			}
		},
		[expandedHour, onChange],
	);

	const handleMinuteClick = useCallback(
		(minute: number) => {
			if (expandedHour != null) {
				onChange(expandedHour * 60 + minute);
			}
		},
		[expandedHour, onChange],
	);

	return (
		<div className="w-full flex flex-col select-none">
			{/* Header: selected range */}
			<div className="flex items-center justify-between mb-3 px-1 shrink-0">
				<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider opacity-80">
					Начало — Конец
				</div>
				<div className="text-[13px] font-bold tabular-nums text-[var(--ink)]">
					{valueMinutes == null
						? 'Не выбрано'
						: `${formatMinutes(valueMinutes)} — ${endLabel}`}
				</div>
			</div>

			{/* Time periods */}
			<div className="flex flex-col gap-2">
				{TIME_PERIODS.map((period) => {
					return (
						<div
							key={period.id}
							className="rounded-[16px] overflow-hidden border border-[var(--border)]/40"
						>
							{/* Period label */}
							<div
								className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
								style={{ color: period.color }}
							>
								<span className="text-sm">{period.emoji}</span>
								{period.label}
							</div>

							{/* Hour grid: 6 columns */}
							<div className="grid grid-cols-6 gap-1 px-2 pb-2">
								{period.hours.map((hour) => {
									const isSelected = selectedHour === hour;
									const isExpanded = expandedHour === hour;

									return (
										<div
											key={hour}
											className="flex flex-col"
										>
											<button
												type="button"
												onClick={() =>
													handleHourClick(hour)
												}
												className={cn(
													'relative h-11 rounded-[10px] text-[15px] font-bold tabular-nums transition-[transform,colors] duration-200 outline-none',
													'active:scale-95',
													isSelected
														? 'text-[var(--accent-ink)] shadow-md z-10'
														: 'text-[var(--ink)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]',
												)}
												style={
													isSelected
														? {
																backgroundColor:
																	'var(--accent)',
																boxShadow: `0 4px 14px -4px var(--accent)`,
															}
														: undefined
												}
											>
												{pad2(hour)}
												{isExpanded && !isSelected && (
													<div
														className="absolute inset-0 rounded-[10px] border-2 pointer-events-none"
														style={{
															borderColor:
																'var(--accent)',
														}}
													/>
												)}
											</button>
										</div>
									);
								})}
							</div>

							{/* Minute selector - slides out under the hour row */}
							<AnimatePresence>
								{expandedHour != null &&
									period.hours.includes(expandedHour) && (
										<motion.div
											key={`minutes-${expandedHour}`}
											initial={{ height: 0, opacity: 0 }}
											animate={{
												height: 'auto',
												opacity: 1,
											}}
											exit={{ height: 0, opacity: 0 }}
											transition={{
												duration: 0.2,
												ease: 'easeOut',
											}}
											className="overflow-hidden"
										>
											<div className="flex gap-2 px-2 pb-2.5 pt-0.5">
												{MINUTE_SLOTS.map((minute) => {
													const isActive =
														selectedHour ===
															expandedHour &&
														selectedMinute ===
															minute;

													return (
														<button
															key={minute}
															type="button"
															onClick={() =>
																handleMinuteClick(
																	minute,
																)
															}
															className={cn(
																'flex-1 h-10 rounded-[10px] text-[14px] font-bold tabular-nums transition-[transform,colors] duration-150 outline-none',
																'active:scale-95',
																isActive
																	? 'text-[var(--accent-ink)] shadow-sm'
																	: 'bg-[var(--surface-2)]/60 text-[var(--ink)] hover:bg-[var(--surface-2)]',
															)}
															style={
																isActive
																	? {
																			backgroundColor:
																				'var(--accent)',
																		}
																	: undefined
															}
														>
															{pad2(expandedHour)}
															:{pad2(minute)}
														</button>
													);
												})}
											</div>
										</motion.div>
									)}
							</AnimatePresence>
						</div>
					);
				})}
			</div>
		</div>
	);
}

