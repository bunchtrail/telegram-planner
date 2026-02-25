'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
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

	const expandedPeriod = useMemo(
		() =>
			expandedHour != null
				? (TIME_PERIODS.find((p) => p.hours.includes(expandedHour)) ??
					null)
				: null,
		[expandedHour],
	);

	const selectedPeriod = useMemo(
		() =>
			selectedHour != null
				? (TIME_PERIODS.find((p) => p.hours.includes(selectedHour)) ??
					null)
				: null,
		[selectedHour],
	);

	const endLabel = useMemo(() => {
		if (valueMinutes == null) return null;
		return formatMinutes(Math.min(24 * 60, valueMinutes + durationMinutes));
	}, [valueMinutes, durationMinutes]);

	const handleHourClick = useCallback(
		(hour: number) => {
			if (expandedHour === hour) {
				setExpandedHour(null);
			} else {
				setExpandedHour(hour);
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
		<div className="w-full flex flex-col select-none gap-3">
			{/* Header: selected range chip */}
			<div className="flex items-center justify-between shrink-0">
				<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider opacity-70 flex items-center gap-1.5">
					<Clock size={11} strokeWidth={2.5} />
					Время
				</div>
				<AnimatePresence mode="wait">
					{valueMinutes == null ? (
						<motion.div
							key="empty"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ duration: 0.15 }}
							className="text-[12px] font-semibold text-[var(--muted)] px-3 py-1 rounded-full bg-[var(--surface-2)]"
						>
							Не выбрано
						</motion.div>
					) : (
						<motion.div
							key="selected"
							initial={{ opacity: 0, scale: 0.85, y: -4 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.85, y: 4 }}
							transition={{
								type: 'spring',
								stiffness: 400,
								damping: 28,
							}}
							className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold tabular-nums"
							style={{
								color: selectedPeriod?.color ?? 'var(--accent)',
								background: `color-mix(in srgb, ${selectedPeriod?.color ?? 'var(--accent)'} 14%, var(--surface-2))`,
							}}
						>
							<span>{selectedPeriod?.emoji}</span>
							<span>{formatMinutes(valueMinutes)}</span>
							<span className="opacity-50 font-normal">—</span>
							<span>{endLabel}</span>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Time periods */}
			<div className="flex flex-col gap-2">
				{TIME_PERIODS.map((period) => {
					const isActivePeriod =
						expandedHour != null &&
						period.hours.includes(expandedHour);
					const hasSelectedInPeriod =
						selectedHour != null &&
						period.hours.includes(selectedHour);

					return (
						<div
							key={period.id}
							className="rounded-[18px] overflow-hidden relative border transition-all duration-200"
							style={{
								borderColor: isActivePeriod
									? `color-mix(in srgb, ${period.color} 35%, transparent)`
									: 'var(--border)',
							}}
						>
							{/* Subtle tinted background */}
							<div
								className="absolute inset-0 pointer-events-none"
								style={{
									background: `linear-gradient(135deg, ${period.bgFrom}, ${period.bgTo})`,
									opacity: isActivePeriod
										? 0.18
										: hasSelectedInPeriod
											? 0.1
											: 0.07,
									transition: 'opacity 0.25s ease',
								}}
							/>

							{/* Period header pill */}
							<div className="relative flex items-center gap-2 px-3 pt-2.5 pb-1.5">
								<span
									className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
									style={{
										color: period.color,
										background: `color-mix(in srgb, ${period.color} 14%, var(--surface-2))`,
									}}
								>
									<span className="text-[13px] leading-none">
										{period.emoji}
									</span>
									{period.label}
								</span>
							</div>

							{/* Hour grid: 6 columns */}
							<div className="relative grid grid-cols-6 gap-1 px-2 pb-2">
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
													'relative h-11 rounded-[11px] text-[15px] font-bold tabular-nums transition-all duration-200 outline-none active:scale-[0.88]',
													isSelected
														? 'text-white shadow-md'
														: isExpanded
															? 'text-[var(--ink)]'
															: 'text-[var(--ink)] hover:bg-[var(--surface-2)]/80',
												)}
												style={
													isSelected
														? {
																backgroundColor:
																	period.color,
																boxShadow: `0 4px 16px -4px ${period.color}`,
															}
														: isExpanded
															? {
																	background: `color-mix(in srgb, ${period.color} 18%, var(--surface-2))`,
																	color: period.color,
																}
															: undefined
												}
											>
												{pad2(hour)}
											</button>
										</div>
									);
								})}
							</div>

							{/* Minute selector */}
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
												ease: [0.25, 0.1, 0.25, 1],
											}}
											className="overflow-hidden relative"
										>
											<div
												className="mx-2 mb-2.5 mt-0.5 h-px opacity-20"
												style={{
													background:
														expandedPeriod?.color,
												}}
											/>
											<div className="grid grid-cols-4 gap-1.5 px-2 pb-3">
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
																'relative h-10 rounded-[10px] text-[13px] font-bold tabular-nums transition-all duration-150 outline-none active:scale-[0.9]',
																isActive
																	? 'text-white'
																	: 'text-[var(--ink)]',
															)}
															style={
																isActive
																	? {
																			backgroundColor:
																				expandedPeriod?.color,
																			boxShadow: `0 4px 14px -4px ${expandedPeriod?.color}`,
																		}
																	: {
																			background: `color-mix(in srgb, ${expandedPeriod?.color} 10%, var(--surface-2))`,
																		}
															}
														>
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

