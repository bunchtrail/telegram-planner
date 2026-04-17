import {
	AnimatePresence,
	motion,
	useReducedMotion,
	LayoutGroup,
} from 'framer-motion';
import {
	AlertTriangle,
	ChevronRight,
	Clock,
	Repeat,
	Trash2,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, getDay, startOfDay, isSameYear } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '../lib/cn';
import { useHaptic } from '../hooks/useHaptic';
import type { TaskSeriesRow, TaskSeriesSkipRow } from '../hooks/usePlanner';
import BottomSheet from './planner/shared/ui/BottomSheet';
import ModalHeader from './planner/shared/ui/ModalHeader';
import useFrameFocusScope from './planner/shared/ui/useFrameFocusScope';

const UPCOMING_OCCURRENCES_COUNT = 5;
const WEEKDAY_SHORT_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;

type ConfirmAction =
	| { type: 'delete-series'; seriesId: string; title: string }
	| { type: 'skip-date'; seriesId: string; date: Date; title: string };

type RecurringTasksSheetProps = {
	onClose: () => void;
	recurringTasks: TaskSeriesRow[];
	recurringSkips: TaskSeriesSkipRow[];
	onDeleteSeries: (id: string) => void;
	onSkipDate: (seriesId: string, date: Date) => void;
	isDesktop?: boolean;
};

const getSeriesWord = (count: number) => {
	const abs = Math.abs(count);
	const mod100 = abs % 100;
	const mod10 = abs % 10;

	if (mod100 >= 11 && mod100 <= 14) return 'серий';
	if (mod10 === 1) return 'серия';
	if (mod10 >= 2 && mod10 <= 4) return 'серии';
	return 'серий';
};

const formatSeriesCountLabel = (count: number) =>
	`${count} ${getSeriesWord(count)}`;

const formatStartTime = (startMinutes?: number | string | null) => {
	if (startMinutes == null) return 'Весь день';
	const parsed =
		typeof startMinutes === 'string' ? Number(startMinutes) : startMinutes;

	if (!Number.isFinite(parsed)) return 'Весь день';

	const minutes = Math.max(0, Math.min(1439, Math.floor(parsed)));
	return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
		minutes % 60,
	).padStart(2, '0')}`;
};

const formatRepeatLabel = (series: TaskSeriesRow) => {
	if (series.repeat === 'daily') return 'Ежедневно';
	if (series.weekday == null) return 'Еженедельно';

	const weekday =
		series.weekday >= 0 && series.weekday < WEEKDAY_SHORT_RU.length
			? WEEKDAY_SHORT_RU[series.weekday]
			: null;

	return weekday ? `Еженедельно · ${weekday}` : 'Еженедельно';
};

const parseDateOnly = (value: string) => {
	const [year, month, day] = value.split('-').map(Number);
	if (!year || !month || !day) {
		return startOfDay(new Date(value));
	}
	return new Date(year, month - 1, day);
};

export default function RecurringTasksSheet({
	onClose,
	recurringTasks,
	recurringSkips,
	onDeleteSeries,
	onSkipDate,
	isDesktop = false,
}: RecurringTasksSheetProps) {
	const [isSettled, setIsSettled] = useState(false);
	const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(
		null,
	);
	const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
		null,
	);

	const { impact, notification } = useHaptic();
	const prefersReducedMotion = useReducedMotion();
	const reduceMotion = Boolean(prefersReducedMotion);
	const confirmDialogRef = useRef<HTMLDivElement>(null);

	useFrameFocusScope(confirmDialogRef, { active: confirmAction != null });

	useEffect(() => {
		if (confirmAction == null) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				setConfirmAction(null);
			}
		};

		document.addEventListener('keydown', handleKeyDown, true);
		return () => document.removeEventListener('keydown', handleKeyDown, true);
	}, [confirmAction]);

	const handleClose = useCallback(() => {
		setConfirmAction(null);
		setIsSettled(false);
		setTimeout(onClose, 10);
	}, [onClose]);

	const skipsBySeriesId = useMemo(() => {
		const map = new Map<string, Set<string>>();
		recurringSkips.forEach((skip) => {
			const current = map.get(skip.series_id) ?? new Set<string>();
			current.add(skip.date);
			map.set(skip.series_id, current);
		});
		return map;
	}, [recurringSkips]);

	const calculateNextOccurrences = (
		series: TaskSeriesRow,
		count = UPCOMING_OCCURRENCES_COUNT,
	) => {
		const dates: Date[] = [];
		if (series.repeat === 'weekly' && series.weekday == null) {
			return dates;
		}

		const today = startOfDay(new Date());
		const seriesStartDate = startOfDay(parseDateOnly(series.start_date));
		const seriesEndDate = series.end_date
			? startOfDay(parseDateOnly(series.end_date))
			: null;
		let currentDate =
			seriesStartDate.getTime() > today.getTime()
				? seriesStartDate
				: today;
		const skipSet = skipsBySeriesId.get(series.id);
		let sanityCheck = 0;
		while (dates.length < count && sanityCheck < 365 * 3) {
			sanityCheck += 1;

			if (
				seriesEndDate &&
				currentDate.getTime() > seriesEndDate.getTime()
			) {
				break;
			}

			const dayMatches =
				series.repeat === 'daily' ||
				(series.repeat === 'weekly' &&
					getDay(currentDate) === series.weekday);

			if (dayMatches) {
				const dateKey = format(currentDate, 'yyyy-MM-dd');
				if (!skipSet?.has(dateKey)) {
					dates.push(new Date(currentDate));
				}
			}

			currentDate = addDays(currentDate, 1);
		}

		return dates;
	};

	const requestDeleteSeries = (series: TaskSeriesRow) => {
		impact('medium');
		setConfirmAction({
			type: 'delete-series',
			seriesId: series.id,
			title: series.title,
		});
	};

	const requestDeleteDate = (series: TaskSeriesRow, date: Date) => {
		impact('medium');
		setConfirmAction({
			type: 'skip-date',
			seriesId: series.id,
			date,
			title: series.title,
		});
	};

	const handleConfirmAction = () => {
		if (!confirmAction) return;

		impact('medium');
		notification('warning');

		if (confirmAction.type === 'delete-series') {
			onDeleteSeries(confirmAction.seriesId);
			if (expandedSeriesId === confirmAction.seriesId) {
				setExpandedSeriesId(null);
			}
		} else {
			onSkipDate(confirmAction.seriesId, confirmAction.date);
		}

		setConfirmAction(null);
	};

	const confirmTitle =
		confirmAction?.type === 'delete-series'
			? 'Удалить все повторы?'
			: 'Удалить повтор за день?';

	const confirmDescription =
		confirmAction == null
			? ''
			: confirmAction.type === 'delete-series'
				? `Будущие повторы серии «${confirmAction.title}» будут остановлены. Прошлые задачи останутся в истории.`
				: `Повтор «${confirmAction.title}» за ${format(
						confirmAction.date,
						'd MMMM (EEEE)',
						{ locale: ru },
					)} будет удален из расписания.`;

	return (
		<LayoutGroup>
			<BottomSheet
				ariaLabelledby="recurring-sheet-title"
				bodyClassName={cn(
					'overflow-y-auto overflow-x-hidden no-scrollbar touch-pan-y',
					isDesktop
						? 'p-8 pt-0'
						: 'px-0 pt-0 pb-[max(env(safe-area-inset-bottom),32px)]',
				)}
				contentClassName={cn(isDesktop ? 'max-w-2xl' : 'max-w-lg h-[80vh]')}
				disableDragDismiss={confirmAction != null}
				dragHandleClassName="h-1.5 w-12 bg-[var(--muted)]/20"
				enableDesktopModalAnimation
				header={
					<ModalHeader
						action={
							recurringTasks.length > 0 ? (
								<div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[13px] font-bold text-[var(--muted)] shadow-sm">
									<Repeat size={14} strokeWidth={2.5} />
									<span>{formatSeriesCountLabel(recurringTasks.length)}</span>
								</div>
							) : undefined
						}
						className={cn(!isDesktop && 'px-6')}
						closeClassName={cn(
							'rounded-full bg-transparent hover:bg-[var(--surface-2)] active:scale-95',
							!isDesktop && '-ml-2',
						)}
						closeIcon={<X size={24} strokeWidth={2.5} />}
						closePosition="start"
						description={
							isDesktop ? 'Управляйте сериями задач и их расписанием' : undefined
						}
						descriptionClassName={cn(isDesktop && 'text-[15px]')}
						onClose={handleClose}
						title="Повторяющиеся задачи"
						titleClassName="text-[32px]"
						titleId="recurring-sheet-title"
					/>
				}
				headerClassName={cn(
					!isDesktop &&
						'cursor-grab active:cursor-grabbing touch-none [touch-action:none]',
				)}
				isDesktop={isDesktop}
				onFrameAnimationStart={() => setIsSettled(false)}
				onClose={handleClose}
				onOpenComplete={() => setIsSettled(true)}
				onRequestClose={() => {
					if (confirmAction) {
						setConfirmAction(null);
						return;
					}
					handleClose();
				}}
				overlay={
					<AnimatePresence>
						{confirmAction && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: reduceMotion ? 0 : 0.2 }}
								className="absolute inset-0 z-30 pointer-events-auto flex items-center justify-center"
							>
								<div
									className="absolute inset-0 bg-black/20"
									onClick={() => setConfirmAction(null)}
								/>

							<motion.div
								ref={confirmDialogRef}
								aria-labelledby="recurring-confirm-title"
								aria-modal="true"
								initial={
										isDesktop
											? { opacity: 0, scale: 0.9, y: 0 }
											: { opacity: 0, y: 20, scale: 0.95 }
									}
									animate={
										isDesktop
											? { opacity: 1, scale: 1, y: 0 }
											: { opacity: 1, y: 0, scale: 1 }
									}
									exit={
										isDesktop
											? { opacity: 0, scale: 0.9, y: 0 }
											: { opacity: 0, y: 20, scale: 0.95 }
									}
									transition={
										reduceMotion
											? { duration: 0 }
											: isDesktop
												? { type: 'spring', damping: 25, stiffness: 300 }
												: { type: 'spring', damping: 32, stiffness: 400, mass: 0.8 }
									}
									className={cn(
										'relative mx-4 w-full max-w-sm overflow-hidden rounded-[32px] bg-[var(--surface)] p-6 shadow-2xl ring-1 ring-white/20',
										!isDesktop && 'mb-8',
									)}
									onKeyDown={(event) => {
										if (event.key === 'Escape') {
											event.stopPropagation();
											setConfirmAction(null);
										}
									}}
									role="dialog"
									tabIndex={-1}
								>
									<div className="flex flex-col items-center text-center">
										<h3
											id="recurring-confirm-title"
											className="mb-2 flex items-center gap-2 font-[var(--font-display)] text-[17px] font-bold leading-tight text-[var(--ink)]"
										>
											<AlertTriangle
												size={20}
												className="text-[var(--danger)]"
											/>
											<span>{confirmTitle}</span>
										</h3>

										<p className="mb-6 max-w-[260px] text-[14px] leading-relaxed text-[var(--muted)]">
											{confirmDescription}
										</p>

										<div className="grid w-full grid-cols-2 gap-3">
											<button
												type="button"
												onClick={() => setConfirmAction(null)}
												className="h-10 rounded-xl bg-[var(--surface-2)] text-[14px] font-semibold text-[var(--ink)] transition-all hover:bg-[var(--border)] active:scale-[0.97]"
											>
												Отмена
											</button>
											<button
												type="button"
												onClick={handleConfirmAction}
												className="h-10 rounded-xl bg-[var(--danger)] text-[14px] font-semibold text-white shadow-md shadow-[var(--danger)]/20 transition-all hover:bg-[var(--danger)]/90 active:scale-[0.97]"
											>
												{confirmAction.type === 'delete-series'
													? 'Остановить'
													: 'Удалить'}
											</button>
										</div>
									</div>
								</motion.div>
							</motion.div>
						)}
					</AnimatePresence>
				}
			>
				<div className={cn(isDesktop ? '' : 'px-5')}>
							{recurringTasks.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center text-center text-[var(--muted)] py-12">
									<motion.div
										initial={{ scale: 0.8, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										transition={{
											delay: 0.1,
											type: 'spring',
										}}
										className="relative h-24 w-24 rounded-[32px] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-6 shadow-[var(--shadow-card)] ring-4 ring-[var(--surface)]"
									>
										<div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-transparent opacity-[0.08] rounded-[32px]" />
										<Repeat
											size={40}
											strokeWidth={1.5}
											className="text-[var(--accent)] relative z-10"
										/>
										<div className="absolute bottom-4 right-4 h-3 w-3 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
									</motion.div>
									<motion.h3
										initial={{ y: 10, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
										transition={{ delay: 0.2 }}
										className="text-[20px] font-bold text-[var(--ink)] mb-2"
									>
										Нет повторяющихся задач
									</motion.h3>
									<motion.p
										initial={{ y: 10, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
										transition={{ delay: 0.3 }}
										className="text-[15px] max-w-[280px] leading-relaxed opacity-70"
									>
										Создайте задачу с повтором в окне
										добавления, чтобы она появилась здесь.
									</motion.p>
								</div>
							) : (
								<div className="space-y-4 pb-20" role="list">
									<LayoutGroup>
										{recurringTasks.map((series) => {
											const isExpanded =
												expandedSeriesId === series.id;
											const nextDates = isExpanded
												? calculateNextOccurrences(
														series,
													)
												: [];

											return (
												<motion.article
													layout={
														isSettled
															? 'position'
															: undefined
													}
													key={series.id}
													role="listitem"
													className={cn(
														'relative bg-[var(--surface)] border border-[var(--border)] overflow-hidden transition-all duration-300',
														isExpanded
															? 'rounded-[32px] shadow-[var(--shadow-card)] ring-2 ring-[var(--accent)]/10 z-10 my-4'
															: 'rounded-[24px] shadow-sm hover:bg-[var(--surface-2)]/50 active:scale-[0.99]',
													)}
												>
													{isExpanded && (
														<motion.div
															initial={{
																opacity: 0,
															}}
															animate={{
																opacity: 1,
															}}
															className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent pointer-events-none"
														/>
													)}

													<button
														type="button"
														aria-expanded={
															isExpanded
														}
														aria-controls={`series-panel-${series.id}`}
														className="relative z-10 w-full p-5 text-left transition-colors"
														onClick={() => {
															impact('light');
															setExpandedSeriesId(
																isExpanded
																	? null
																	: series.id,
															);
														}}
													>
														<div className="flex items-start gap-4">
															<div
																className={cn(
																	'shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 shadow-sm',
																	isExpanded
																		? 'bg-[var(--accent)] text-[var(--accent-ink)] scale-110 shadow-[var(--shadow-glow)]'
																		: 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]',
																)}
															>
																<Repeat
																	size={22}
																	strokeWidth={
																		isExpanded
																			? 2.5
																			: 2
																	}
																/>
															</div>
															<div className="min-w-0 flex-1 pt-0.5">
																<h3
																	className={cn(
																		'font-bold text-[var(--ink)] leading-tight transition-all duration-200',
																		isExpanded
																			? 'text-[20px] mb-1.5'
																			: 'text-[17px] mb-1',
																	)}
																>
																	{
																		series.title
																	}
																</h3>
																<div className="flex flex-wrap items-center gap-2">
																	<span className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--muted)]">
																		<Clock
																			size={
																				14
																			}
																			strokeWidth={
																				2.5
																			}
																		/>
																		{formatStartTime(
																			series.start_minutes,
																		)}
																	</span>
																	<span className="h-1 w-1 rounded-full bg-[var(--border)]" />
																	<span className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--muted)]">
																		{formatRepeatLabel(
																			series,
																		)}
																	</span>
																</div>
															</div>
															<motion.div
																animate={{
																	rotate: isExpanded
																		? 90
																		: 0,
																}}
																transition={{
																	type: 'spring',
																	stiffness: 300,
																	damping: 30,
																}}
																className={cn(
																	'ml-1 mt-1 shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-colors',
																	isExpanded
																		? 'bg-[var(--accent)]/20 text-[var(--accent)]'
																		: 'text-[var(--muted)]',
																)}
															>
																<ChevronRight
																	size={20}
																	strokeWidth={
																		2.5
																	}
																/>
															</motion.div>
														</div>
													</button>

													<AnimatePresence>
														{isExpanded && (
															<motion.div
																id={`series-panel-${series.id}`}
																initial={{
																	height: 0,
																	opacity: 0,
																}}
																animate={{
																	height: 'auto',
																	opacity: 1,
																}}
																exit={{
																	height: 0,
																	opacity: 0,
																}}
																transition={{
																	duration:
																		reduceMotion
																			? 0
																			: 0.3,
																	type: 'spring',
																	bounce: 0,
																	opacity: {
																		duration: 0.2,
																	},
																}}
																className="relative z-10"
															>
																<div className="px-5 pb-5 pt-1">
																	<div className="ml-[27px] pl-7 border-l-2 border-dashed border-[var(--border)]/60 space-y-3 pb-2 pt-2 relative">
																		<div className="mb-3 -ml-[36px] flex items-center gap-2.5">
																			<div className="h-2.5 w-2.5 rounded-full bg-[var(--muted)]/40 ring-2 ring-[var(--surface)]" />
																			<span className="text-[11px] font-bold text-[var(--muted)]/70 uppercase tracking-wider">
																				Ближайшие
																				повторы
																			</span>
																		</div>

																		{nextDates.map(
																			(
																				date,
																				idx,
																			) => (
																				<motion.div
																					initial={{
																						x: -8,
																						opacity: 0,
																					}}
																					animate={{
																						x: 0,
																						opacity: 1,
																					}}
																					transition={{
																						delay:
																							idx *
																							0.04,
																					}}
																					key={date.toISOString()}
																					className="relative group/item"
																				>
																					<div className="absolute -left-[32px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--accent)] z-10" />
																					{idx ===
																						0 && (
																						<div className="absolute -left-[32px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[var(--accent)] opacity-30 animate-[pulse_2s_ease-in-out_infinite]" />
																					)}

																					<div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)]/50 hover:bg-[var(--surface-2)] transition-all">
																						<div className="flex items-center gap-3">
																							<div className="h-10 w-10 flex flex-col items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
																								<span className="text-[10px] uppercase font-bold text-[var(--accent)] leading-none mb-0.5">
																									{format(
																										date,
																										'MMM',
																										{
																											locale: ru,
																										},
																									).slice(
																										0,
																										3,
																									)}
																								</span>
																								<span className="text-[16px] font-bold text-[var(--ink)] leading-none">
																									{format(
																										date,
																										'd',
																									)}
																								</span>
																							</div>
																							<div className="flex flex-col">
																								<span className="text-[15px] font-semibold text-[var(--ink)] capitalize">
																									{format(
																										date,
																										'EEEE',
																										{
																											locale: ru,
																										},
																									)}
																								</span>
																								<span className="text-[12px] text-[var(--muted)]">
																									{isSameYear(
																										date,
																										new Date(),
																									)
																										? format(
																												date,
																												'd MMMM',
																												{
																													locale: ru,
																												},
																											)
																										: format(
																												date,
																												'd MMM yyyy',
																												{
																													locale: ru,
																												},
																											)}
																								</span>
																							</div>
																						</div>

																						<button
																							type="button"
																							onClick={(
																								e,
																							) => {
																								e.stopPropagation();
																								requestDeleteDate(
																									series,
																									date,
																								);
																							}}
																							className="h-8 w-8 flex items-center justify-center text-[var(--muted)]/60 rounded-lg active:scale-90 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition-all"
																							aria-label={`Удалить повтор за ${format(
																								date,
																								'd MMMM',
																								{
																									locale: ru,
																								},
																							)}`}
																						>
																							<X
																								size={
																									16
																								}
																								strokeWidth={
																									2.5
																								}
																							/>
																						</button>
																					</div>
																				</motion.div>
																			),
																		)}
																	</div>

																	<motion.button
																		initial={{
																			opacity: 0,
																			y: 8,
																		}}
																		animate={{
																			opacity: 1,
																			y: 0,
																		}}
																		transition={{
																			delay: 0.15,
																		}}
																		type="button"
																		onClick={(
																			e,
																		) => {
																			e.stopPropagation();
																			requestDeleteSeries(
																				series,
																			);
																		}}
																		className="mt-4 w-full h-11 flex items-center justify-center gap-2 bg-[var(--danger)]/8 text-[var(--danger)] font-bold rounded-xl border border-[var(--danger)]/15 active:scale-[0.98] transition-all hover:bg-[var(--danger)]/12 text-[14px]"
																	>
																		<Trash2
																			size={
																				16
																			}
																		/>
																		<span>
																			Остановить
																			серию
																		</span>
																	</motion.button>
																</div>
															</motion.div>
														)}
													</AnimatePresence>
												</motion.article>
											);
										})}
									</LayoutGroup>
								</div>
							)}
				</div>
			</BottomSheet>
		</LayoutGroup>
	);
}

