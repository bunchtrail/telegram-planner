import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	addDays,
	addMonths,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
} from 'date-fns';
import { isDesktop as checkIsDesktop } from '../lib/platform';
import { setSupabaseAccessToken, supabase } from '../lib/supabase';
import type { Task } from '../types/task';
import {
	type SupabaseErrorLike,
	formatDateOnly,
	normalizeHex,
	isSupabaseAuthError,
} from '../lib/task-utils';
import { useTasks } from './useTasks';
import { useStreak } from './useStreak';
import { useRecurringTasks } from './useRecurringTasks';
import { useHabits } from './useHabits';
import { usePomodoroStats } from './usePomodoroStats';

type PlannerViewMode = 'week' | 'month';

type TelegramAuthPayload = {
	token?: string;
	error?: string;
	user?: { id?: string | number };
};

type Insets = { top: number; right: number; bottom: number; left: number };
type TelegramWebAppEventHandler = (...args: unknown[]) => void;

type TelegramWebApp = {
	initData?: string;
	ready?: () => void;
	expand?: () => void;
	isVersionAtLeast?: (version: string) => boolean;
	requestFullscreen?: () => void;
	exitFullscreen?: () => void;
	isFullscreen?: boolean;
	platform?: string;
	isVerticalSwipesEnabled?: boolean;
	disableVerticalSwipes?: () => void;
	enableVerticalSwipes?: () => void;
	safeAreaInset?: Insets;
	contentSafeAreaInset?: Insets;
	onEvent?: (event: string, cb: TelegramWebAppEventHandler) => void;
	offEvent?: (event: string, cb: TelegramWebAppEventHandler) => void;
	setHeaderColor?: (color: string) => void;
	setBackgroundColor?: (color: string) => void;
	setBottomBarColor?: (color: string) => void;
	themeParams?: {
		bg_color?: string;
		text_color?: string;
		hint_color?: string;
		link_color?: string;
		button_color?: string;
		button_text_color?: string;
		secondary_bg_color?: string;
		header_bg_color?: string;
		section_bg_color?: string;
		section_header_text_color?: string;
		subtitle_text_color?: string;
		accent_text_color?: string;
		destructive_text_color?: string;
	};
};

export type TaskSeriesRow = {
	id: string;
	title: string;
	duration: number;
	repeat: 'daily' | 'weekly';
	weekday: number | null;
	start_minutes?: number | string | null;
	remind_before_minutes?: number | string | null;
	start_date: string;
	end_date: string | null;
};

export type TaskSeriesSkipRow = {
	series_id: string;
	date: string;
};

const getTelegramWebApp = () => {
	if (typeof window === 'undefined') return null;
	const telegram = (
		window as Window & { Telegram?: { WebApp?: TelegramWebApp } }
	).Telegram;
	return telegram?.WebApp ?? null;
};

const getTelegramInitData = () => {
	const initData = getTelegramWebApp()?.initData;
	if (typeof initData === 'string' && initData.length > 0) return initData;
	if (process.env.NODE_ENV !== 'production') {
		const devInitData = process.env.NEXT_PUBLIC_TELEGRAM_INIT_DATA;
		if (devInitData) return devInitData;
	}
	return null;
};

const hexToRgb = (hex: string) => {
	const normalized = normalizeHex(hex);
	if (!normalized) return null;
	const value = normalized.slice(1);
	const r = parseInt(value.slice(0, 2), 16);
	const g = parseInt(value.slice(2, 4), 16);
	const b = parseInt(value.slice(4, 6), 16);
	return { r, g, b };
};

const withAlpha = (hex: string, alpha: number) => {
	const rgb = hexToRgb(hex);
	if (!rgb) return null;
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const getRelativeLuminance = (hex: string) => {
	const rgb = hexToRgb(hex);
	if (!rgb) return null;
	const toLinear = (value: number) => {
		const srgb = value / 255;
		return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
	};
	const r = toLinear(rgb.r);
	const g = toLinear(rgb.g);
	const b = toLinear(rgb.b);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function usePlanner() {
	const [selectedDate, setSelectedDate] = useState(() => new Date());
	const [viewMode, setViewMode] = useState<PlannerViewMode>('week');
	const [userId, setUserId] = useState<string | null>(null);
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [isDesktop, setIsDesktop] = useState(false);
	const authRefreshPromiseRef = useRef<Promise<boolean> | null>(null);

	// --- Auth ---

	const applyAuthSession = useCallback(
		(token: string, authUserId: string | null) => {
			setSupabaseAccessToken(token);
			if (authUserId)
				setUserId((current) =>
					current === authUserId ? current : authUserId,
				);
		},
		[],
	);

	const requestTelegramAuth = useCallback(async () => {
		const initData = getTelegramInitData();
		if (!initData) return null;

		const response = await fetch('/api/auth/telegram', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ initData }),
		});
		const payload = (await response
			.json()
			.catch(() => null)) as TelegramAuthPayload | null;

		if (!response.ok || !payload?.token) return null;

		return {
			token: payload.token,
			userId: payload.user?.id != null ? String(payload.user.id) : null,
		};
	}, []);

	const refreshSupabaseAuth = useCallback(async () => {
		if (authRefreshPromiseRef.current) return authRefreshPromiseRef.current;

		const refreshPromise = (async () => {
			try {
				const authPayload = await requestTelegramAuth();
				if (!authPayload?.token) return false;
				applyAuthSession(authPayload.token, authPayload.userId);
				return true;
			} catch (error) {
				console.error('Supabase auth refresh failed', error);
				return false;
			}
		})();

		authRefreshPromiseRef.current = refreshPromise;
		try {
			return await refreshPromise;
		} finally {
			if (authRefreshPromiseRef.current === refreshPromise)
				authRefreshPromiseRef.current = null;
		}
	}, [applyAuthSession, requestTelegramAuth]);

	const runWithAuthRetry = useCallback(
		async <T extends { error: SupabaseErrorLike | null | undefined }>(
			operation: () => PromiseLike<T> | T,
		) => {
			let result = await operation();
			if (!isSupabaseAuthError(result.error)) return result;
			const refreshed = await refreshSupabaseAuth();
			if (!refreshed) return result;
			result = await operation();
			return result;
		},
		[refreshSupabaseAuth],
	);

	// --- Date navigation ---

	const activeMonthKey = useMemo(
		() => format(selectedDate, 'yyyy-MM'),
		[selectedDate],
	);

	const { monthStart, monthEnd, monthStartKey, monthEndKey } = useMemo(() => {
		const start = startOfMonth(selectedDate);
		const end = endOfMonth(start);
		return {
			monthStart: start,
			monthEnd: end,
			monthStartKey: formatDateOnly(start),
			monthEndKey: formatDateOnly(end),
		};
	}, [selectedDate]);

	const weekDays = useMemo(() => {
		const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
		return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
	}, [selectedDate]);

	const monthDays = useMemo(() => {
		const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
		const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
		const days: Date[] = [];
		let cursor = gridStart;
		while (cursor <= gridEnd) {
			days.push(cursor);
			cursor = addDays(cursor, 1);
		}
		return days;
	}, [monthStart, monthEnd]);

	// --- Tasks (TanStack Query) ---

	const {
		tasks,
		isLoading: tasksLoading,
		addTask,
		updateTask,
		deleteTask,
		toggleTask,
		moveTask,
		restoreTask,
		handleReorder,
		toggleActiveTask,
		refetchTasks,
		setTasksCache,
	} = useTasks({
		userId,
		monthStartKey,
		monthEndKey,
		selectedDate,
		activeMonthKey,
		runWithAuthRetry,
	});

	// --- Streak (TanStack Query) ---

	const streak = useStreak({ userId, runWithAuthRetry });

	// --- Habits ---

	const weekStart = useMemo(
		() => startOfWeek(selectedDate, { weekStartsOn: 1 }),
		[selectedDate],
	);
	const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

	const habitsData = useHabits({
		userId,
		weekStartKey: formatDateOnly(weekStart),
		weekEndKey: formatDateOnly(weekEnd),
		runWithAuthRetry,
	});

	// --- Pomodoro Stats ---

	const pomodoroStats = usePomodoroStats({
		userId,
		weekEndDate: formatDateOnly(selectedDate),
		runWithAuthRetry,
	});

	// --- Recurring tasks (TanStack Query) ---

	const {
		recurringTasks,
		recurringSkips,
		fetchRecurringTasks,
		deleteTaskSeries,
		skipTaskSeriesDate,
	} = useRecurringTasks({
		userId,
		runWithAuthRetry,
		onTasksChanged: refetchTasks,
		setTasksCache,
	});

	// --- Derived task data ---

	const taskDates = useMemo(() => {
		const dateSet = new Set<string>();
		tasks.forEach((task) => dateSet.add(formatDateOnly(task.date)));
		return dateSet;
	}, [tasks]);

	const activeTask = useMemo(
		() =>
			tasks.find((task) => task.activeStartedAt && !task.completed) ??
			null,
		[tasks],
	);

	const activeTaskId = activeTask?.id ?? null;

	const currentTasks = useMemo(() => {
		const dayTasks = tasks.filter((task) =>
			isSameDay(task.date, selectedDate),
		);
		const getSortGroup = (task: Task) => {
			if (task.activeStartedAt && !task.completed) return 0;
			if (task.isPinned && !task.completed) return 1;
			if (task.completed) return 3;
			return 2;
		};
		return dayTasks.sort((a, b) => {
			const aGroup = getSortGroup(a);
			const bGroup = getSortGroup(b);
			if (aGroup !== bGroup) return aGroup - bGroup;
			const aPos = a.position ?? 0;
			const bPos = b.position ?? 0;
			if (aPos !== bPos) return aPos - bPos;
			return a.id.localeCompare(b.id);
		});
	}, [tasks, selectedDate]);

	const totalMinutes = useMemo(
		() =>
			currentTasks.reduce(
				(acc, task) => acc + (task.completed ? 0 : task.duration),
				0,
			),
		[currentTasks],
	);

	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	// --- Navigation ---

	const goToToday = useCallback(() => setSelectedDate(new Date()), []);

	const goToPreviousPeriod = useCallback(() => {
		setSelectedDate((current) =>
			viewMode === 'month' ? subMonths(current, 1) : subDays(current, 1),
		);
	}, [viewMode]);

	const goToNextPeriod = useCallback(() => {
		setSelectedDate((current) =>
			viewMode === 'month' ? addMonths(current, 1) : addDays(current, 1),
		);
	}, [viewMode]);

	// --- Auth loading state ---

	const [authLoading, setAuthLoading] = useState(true);

	useEffect(() => {
		let isCancelled = false;

		const initAuth = async () => {
			try {
				const authPayload = await requestTelegramAuth();
				if (!authPayload?.token) {
					if (!isCancelled) setAuthLoading(false);
					return;
				}
				applyAuthSession(authPayload.token, authPayload.userId);
				if (!isCancelled) setAuthLoading(false);
			} catch {
				if (!isCancelled) setAuthLoading(false);
			}
		};

		initAuth();
		return () => {
			isCancelled = true;
		};
	}, [applyAuthSession, requestTelegramAuth]);

	const isLoading = authLoading || tasksLoading;

	// --- Visibility refetch ---

	useEffect(() => {
		if (!userId) return;

		const onVisible = () => {
			if (document.visibilityState === 'visible') refetchTasks();
		};

		document.addEventListener('visibilitychange', onVisible);
		return () =>
			document.removeEventListener('visibilitychange', onVisible);
	}, [userId, refetchTasks]);

	// --- Telegram WebApp setup ---

	useEffect(() => {
		const webApp = getTelegramWebApp();
		const root = document.documentElement;

		const applyPlatform = () => {
			const platform = webApp?.platform;
			if (platform) {
				root.dataset.tgPlatform = platform;
			} else {
				delete root.dataset.tgPlatform;
			}
			const desktop = checkIsDesktop();
			setIsDesktop(desktop);
			root.classList.toggle('tg-desktop', desktop);
		};

		applyPlatform();

		if (!webApp) {
			return () => {
				delete root.dataset.tgPlatform;
				root.classList.remove('tg-desktop');
			};
		}

		webApp.ready?.();
		if (webApp.isVersionAtLeast?.('7.7')) webApp.disableVerticalSwipes?.();
		webApp.expand?.();

		const applyTheme = () => {
			const styleRoot = document.documentElement.style;
			const params = webApp.themeParams ?? {};
			const bgColor = normalizeHex(params.bg_color) ?? '#f2f2f7';
			const surfaceColor =
				normalizeHex(params.secondary_bg_color) ?? '#ffffff';
			const surfaceAlt =
				normalizeHex(params.section_bg_color) ?? surfaceColor;
			const textColor = normalizeHex(params.text_color) ?? '#000000';
			const mutedColor = normalizeHex(params.hint_color) ?? '#8e8e93';
			const accentColor = normalizeHex(params.button_color) ?? '#ff9f0a';
			const accentInk =
				normalizeHex(params.button_text_color) ?? '#ffffff';
			const dangerColor =
				normalizeHex(params.destructive_text_color) ?? '#ff3b30';
			const borderColor =
				withAlpha(textColor, 0.08) ?? 'rgba(0,0,0,0.08)';
			const glassSurface = withAlpha(surfaceColor, 0.9);

			styleRoot.setProperty('--bg', bgColor);
			styleRoot.setProperty('--surface', surfaceColor);
			styleRoot.setProperty('--surface-2', surfaceAlt);
			if (glassSurface)
				styleRoot.setProperty('--surface-glass', glassSurface);
			styleRoot.setProperty('--ink', textColor);
			styleRoot.setProperty('--muted', mutedColor);
			styleRoot.setProperty('--border', borderColor);
			styleRoot.setProperty('--accent', accentColor);
			styleRoot.setProperty('--accent-ink', accentInk);
			styleRoot.setProperty('--danger', dangerColor);

			const headerColor =
				normalizeHex(params.header_bg_color) ??
				normalizeHex(params.secondary_bg_color) ??
				bgColor;
			webApp.setHeaderColor?.(headerColor);
			webApp.setBackgroundColor?.(bgColor);
			webApp.setBottomBarColor?.(headerColor);

			const luminance = getRelativeLuminance(bgColor);
			if (luminance != null) {
				document.documentElement.style.colorScheme =
					luminance < 0.35 ? 'dark' : 'light';
			}
		};

		applyTheme();

		const applyInsets = () => {
			const styleRoot = document.documentElement.style;
			const contentInsets = webApp.contentSafeAreaInset;
			const safeInsets = webApp.safeAreaInset;

			if (contentInsets) {
				styleRoot.setProperty(
					'--tg-content-safe-area-inset-top',
					`${contentInsets.top}px`,
				);
				styleRoot.setProperty(
					'--tg-content-safe-area-inset-right',
					`${contentInsets.right}px`,
				);
				styleRoot.setProperty(
					'--tg-content-safe-area-inset-bottom',
					`${contentInsets.bottom}px`,
				);
				styleRoot.setProperty(
					'--tg-content-safe-area-inset-left',
					`${contentInsets.left}px`,
				);
				styleRoot.setProperty(
					'--tg-content-safe-top',
					`${contentInsets.top}px`,
				);
				styleRoot.setProperty(
					'--tg-content-safe-right',
					`${contentInsets.right}px`,
				);
				styleRoot.setProperty(
					'--tg-content-safe-bottom',
					`${contentInsets.bottom}px`,
				);
				styleRoot.setProperty(
					'--tg-content-safe-left',
					`${contentInsets.left}px`,
				);
			}

			if (safeInsets) {
				styleRoot.setProperty(
					'--tg-safe-area-inset-top',
					`${safeInsets.top}px`,
				);
				styleRoot.setProperty(
					'--tg-safe-area-inset-right',
					`${safeInsets.right}px`,
				);
				styleRoot.setProperty(
					'--tg-safe-area-inset-bottom',
					`${safeInsets.bottom}px`,
				);
				styleRoot.setProperty(
					'--tg-safe-area-inset-left',
					`${safeInsets.left}px`,
				);
				styleRoot.setProperty('--tg-safe-top', `${safeInsets.top}px`);
				styleRoot.setProperty(
					'--tg-safe-right',
					`${safeInsets.right}px`,
				);
				styleRoot.setProperty(
					'--tg-safe-bottom',
					`${safeInsets.bottom}px`,
				);
				styleRoot.setProperty('--tg-safe-left', `${safeInsets.left}px`);
			}
		};

		const applyTelegramControlsOffsets = () => {
			const isFullscreen = Boolean(webApp.isFullscreen);
			const platform = webApp.platform;
			const top = !isFullscreen ? 0 : platform === 'ios' ? 44 : 48;
			const side = !isFullscreen ? 0 : platform === 'ios' ? 44 : 40;
			const styleRoot = document.documentElement.style;
			styleRoot.setProperty('--tma-tg-controls-top', `${top}px`);
			styleRoot.setProperty('--tma-tg-controls-side', `${side}px`);
		};

		let onAny: (() => void) | null = null;
		if (webApp.isVersionAtLeast?.('8.0')) {
			onAny = () => {
				applyInsets();
				applyTelegramControlsOffsets();
			};
			onAny();
			webApp.onEvent?.('safeAreaChanged', onAny);
			webApp.onEvent?.('contentSafeAreaChanged', onAny);
			webApp.onEvent?.('fullscreenChanged', onAny);
		}

		webApp.onEvent?.('themeChanged', applyTheme);

		return () => {
			webApp.offEvent?.('themeChanged', applyTheme);
			delete root.dataset.tgPlatform;
			root.classList.remove('tg-desktop');
			if (!onAny) return;
			webApp.offEvent?.('safeAreaChanged', onAny);
			webApp.offEvent?.('contentSafeAreaChanged', onAny);
			webApp.offEvent?.('fullscreenChanged', onAny);
		};
	}, []);

	useEffect(() => {
		const handlePointerDown = () => {
			const webApp = getTelegramWebApp();
			if (!webApp?.isVersionAtLeast?.('8.0')) return;
			webApp.requestFullscreen?.();
		};

		window.addEventListener('pointerdown', handlePointerDown, {
			once: true,
		});
		return () =>
			window.removeEventListener('pointerdown', handlePointerDown);
	}, []);

	return {
		selectedDate,
		setSelectedDate,
		viewMode,
		setViewMode,
		isAddOpen,
		setIsAddOpen,
		tasks,
		streak,
		currentTasks,
		weekDays,
		monthDays,
		taskDates,
		hours,
		minutes,
		activeTaskId,
		toggleActiveTask,
		goToToday,
		goToPreviousPeriod,
		goToNextPeriod,
		handleReorder,
		addTask,
		toggleTask,
		deleteTask,
		restoreTask,
		updateTask,
		moveTask,
		isLoading,
		recurringTasks,
		recurringSkips,
		fetchRecurringTasks,
		deleteTaskSeries,
		skipTaskSeriesDate,
		isDesktop,
		runWithAuthRetry,
		userId,
		habits: habitsData.habits,
		habitsLoading: habitsData.isLoading,
		addHabit: habitsData.addHabit,
		deleteHabit: habitsData.deleteHabit,
		toggleHabitLog: habitsData.toggleLog,
		isHabitChecked: habitsData.isChecked,
		pomodoroStats,
	};
}
