import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { DEFAULT_TASK_COLOR } from '../lib/constants';
import { isDesktop as checkIsDesktop } from '../lib/platform';
import { setSupabaseAccessToken, supabase } from '../lib/supabase';
import type { Task, TaskChecklistItem, TaskRepeat } from '../types/task';

const DEFAULT_DURATION = 30;
type PlannerViewMode = 'week' | 'month';

type TaskRow = {
  id: string;
  title: string;
  duration: number;
  date: string;
  completed: boolean;
  position?: number | string | null;
  series_id?: string | null;
  elapsed_ms?: number | string | null;
  active_started_at?: string | null;
  color?: string | null;
  is_pinned?: boolean | null;
  checklist?: unknown;
  start_minutes?: number | string | null;
  remind_before_minutes?: number | string | null;
  remind_at?: string | null;
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

const getTelegramWebApp = () => {
  if (typeof window === 'undefined') return null;

  const telegram = (
    window as Window & { Telegram?: { WebApp?: TelegramWebApp } }
  ).Telegram;
  return telegram?.WebApp ?? null;
};

const getTelegramInitData = () => {
  const initData = getTelegramWebApp()?.initData;
  if (typeof initData === 'string' && initData.length > 0) {
    return initData;
  }

  if (process.env.NODE_ENV !== 'production') {
    const devInitData = process.env.NEXT_PUBLIC_TELEGRAM_INIT_DATA;
    if (devInitData) return devInitData;
  }

  return null;
};

const formatDateOnly = (value: Date) => format(value, 'yyyy-MM-dd');

const parseDateOnly = (value: string) => {
  if (!value) return new Date();
  if (value.includes('T')) return new Date(value);

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};

const parseElapsedMs = (value?: number | string | null) => {
  if (value == null) return 0;
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
};

const parseTimestamp = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseChecklist = (value: unknown): TaskChecklistItem[] => {
  if (!Array.isArray(value)) return [];
  const items: TaskChecklistItem[] = [];
  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const candidate = entry as { text?: unknown; done?: unknown };
    if (typeof candidate.text !== 'string') return;
    if (typeof candidate.done !== 'boolean') return;
    items.push({ text: candidate.text, done: candidate.done });
  });
  return items;
};

const parseSmallInt = (value?: number | string | null) => {
  if (value == null) return null;
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(1439, Math.floor(numeric)));
};

const parseRemindBefore = (value?: number | string | null) => {
  if (value == null) return 0;
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1440, Math.floor(numeric)));
};

const computeRemindAtIso = (
  date: Date,
  startMinutes: number | null,
  remindBeforeMinutes: number
) => {
  if (startMinutes == null) return null;
  if (remindBeforeMinutes < 0) return null;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(startMinutes);
  const remindAt = new Date(start.getTime() - remindBeforeMinutes * 60_000);
  return remindAt.toISOString();
};

const areChecklistsEqual = (
  left: TaskChecklistItem[],
  right: TaskChecklistItem[]
) => {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i].text !== right[i].text || left[i].done !== right[i].done) {
      return false;
    }
  }
  return true;
};

const normalizeHex = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(withHash)) {
    return null;
  }
  return withHash;
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

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

const mapTaskRow = (row: TaskRow, clientId = row.id): Task => ({
  clientId,
  id: row.id,
  title: row.title,
  duration: row.duration,
  date: parseDateOnly(row.date),
  completed: row.completed,
  position: Number(row.position ?? 0),
  seriesId: row.series_id ?? null,
  elapsedMs: parseElapsedMs(row.elapsed_ms),
  activeStartedAt: parseTimestamp(row.active_started_at),
  color: normalizeHex(row.color) ?? DEFAULT_TASK_COLOR,
  isPinned: row.is_pinned ?? false,
  checklist: parseChecklist(row.checklist),
  startMinutes: parseSmallInt(row.start_minutes),
  remindBeforeMinutes: parseRemindBefore(row.remind_before_minutes),
});

export function usePlanner() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<PlannerViewMode>('week');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);
  const [recurringTasks, setRecurringTasks] = useState<TaskSeriesRow[]>([]);
  const [recurringSkips, setRecurringSkips] = useState<TaskSeriesSkipRow[]>([]);
  const toggleRequestRef = useRef(new Map<string, number>());
  const pendingInsertRef = useRef(new Map<string, TaskRow>());

  const activeMonthKey = useMemo(
    () => format(selectedDate, 'yyyy-MM'),
    [selectedDate]
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

  const taskDates = useMemo(() => {
    const dateSet = new Set<string>();
    tasks.forEach((task) => {
      dateSet.add(formatDateOnly(task.date));
    });
    return dateSet;
  }, [tasks]);

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach((task) => map.set(task.id, task));
    return map;
  }, [tasks]);

  const activeTask = useMemo(
    () =>
      tasks.find((task) => task.activeStartedAt && !task.completed) ?? null,
    [tasks]
  );

  const activeTaskId = activeTask?.id ?? null;

  const toggleActiveTask = useCallback(
    async (id: string) => {
      if (!userId) return;
      const target = tasksById.get(id);
      if (!target || target.completed) return;
      const now = Date.now();
      const isTargetActive = Boolean(target.activeStartedAt);
      const previousTasks = tasks;

      setTasks((prev) =>
        prev.map((task) => {
          if (task.activeStartedAt) {
            const elapsed =
              task.elapsedMs +
              Math.max(0, now - task.activeStartedAt.getTime());
            if (task.id === id) {
              return isTargetActive
                ? { ...task, elapsedMs: elapsed, activeStartedAt: null }
                : { ...task, elapsedMs: elapsed, activeStartedAt: new Date(now) };
            }
            return { ...task, elapsedMs: elapsed, activeStartedAt: null };
          }
          if (task.id === id && !isTargetActive) {
            return { ...task, activeStartedAt: new Date(now) };
          }
          return task;
        })
      );
      const { error } = await supabase.rpc('toggle_task_timer', {
        task_id: id,
      });

      if (error) {
        console.error('Toggle task timer failed', error);
        setTasks(previousTasks);
      }
    },
    [tasksById, tasks, userId]
  );

  const isDateInActiveMonth = useCallback(
    (value: string | Date | null | undefined) => {
      if (!value) return false;
      if (typeof value === 'string') {
        return value.slice(0, 7) === activeMonthKey;
      }
      return format(value, 'yyyy-MM') === activeMonthKey;
    },
    [activeMonthKey]
  );

  const ensureSeriesInstancesForMonth = useCallback(
    async (
      series: TaskSeriesRow,
      monthStartKeyValue: string,
      monthEndKeyValue: string,
      existingKeys: Set<string>,
      skipKeys: Set<string>,
      positionByDate: Map<string, number>
    ) => {
      if (!userId) return;

      const seriesStart = parseDateOnly(series.start_date);
      const monthStartDate = parseDateOnly(monthStartKeyValue);
      const monthEndDate = parseDateOnly(monthEndKeyValue);
      const seriesEndDate = series.end_date
        ? parseDateOnly(series.end_date)
        : null;

      const rangeStart =
        seriesStart > monthStartDate ? seriesStart : monthStartDate;
      const rangeEnd =
        seriesEndDate && seriesEndDate < monthEndDate
          ? seriesEndDate
          : monthEndDate;

      if (rangeStart > rangeEnd) return;

      const weeklyDay =
        series.repeat === 'weekly'
          ? series.weekday ?? getDay(seriesStart)
          : null;

      const rows: Array<Record<string, unknown>> = [];
      const seriesStartMinutes = parseSmallInt(series.start_minutes ?? null);
      const seriesRemindBefore = parseRemindBefore(
        series.remind_before_minutes ?? 0
      );
      for (
        let cursor = rangeStart;
        cursor <= rangeEnd;
        cursor = addDays(cursor, 1)
      ) {
        const dateKey = formatDateOnly(cursor);
        const key = `${series.id}:${dateKey}`;
        if (existingKeys.has(key) || skipKeys.has(key)) continue;

        if (series.repeat === 'weekly' && weeklyDay != null) {
          if (getDay(cursor) !== weeklyDay) continue;
        }

        const nextPosition = (positionByDate.get(dateKey) ?? -1) + 1;
        positionByDate.set(dateKey, nextPosition);

        rows.push({
          title: series.title,
          duration: series.duration,
          date: dateKey,
          completed: false,
          telegram_id: userId,
          series_id: series.id,
          position: nextPosition,
          start_minutes: seriesStartMinutes,
          remind_before_minutes: seriesRemindBefore,
          remind_at: computeRemindAtIso(
            cursor,
            seriesStartMinutes,
            seriesRemindBefore
          ),
        });
      }

      if (rows.length > 0) {
        const { error } = await supabase.from('tasks').upsert(rows, {
          onConflict: 'series_id,date',
          ignoreDuplicates: true,
        });
        if (error) {
          console.error('Series instance upsert failed', error);
        }
      }
    },
    [userId]
  );

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
    if (webApp.isVersionAtLeast?.('7.7')) {
      webApp.disableVerticalSwipes?.();
    }
    webApp.expand?.();

    const applyTheme = () => {
      const styleRoot = document.documentElement.style;
      const params = webApp.themeParams ?? {};
      const bgColor = normalizeHex(params.bg_color) ?? '#f2f2f7';
      const surfaceColor = normalizeHex(params.secondary_bg_color) ?? '#ffffff';
      const surfaceAlt =
        normalizeHex(params.section_bg_color) ?? surfaceColor;
      const textColor = normalizeHex(params.text_color) ?? '#000000';
      const mutedColor = normalizeHex(params.hint_color) ?? '#8e8e93';
      const accentColor = normalizeHex(params.button_color) ?? '#ff9f0a';
      const accentInk = normalizeHex(params.button_text_color) ?? '#ffffff';
      const dangerColor =
        normalizeHex(params.destructive_text_color) ?? '#ff3b30';
      const borderColor = withAlpha(textColor, 0.08) ?? 'rgba(0,0,0,0.08)';
      const glassSurface = withAlpha(surfaceColor, 0.9);

      styleRoot.setProperty('--bg', bgColor);
      styleRoot.setProperty('--surface', surfaceColor);
      styleRoot.setProperty('--surface-2', surfaceAlt);
      if (glassSurface) {
        styleRoot.setProperty('--surface-glass', glassSurface);
      }
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
          `${contentInsets.top}px`
        );
        styleRoot.setProperty(
          '--tg-content-safe-area-inset-right',
          `${contentInsets.right}px`
        );
        styleRoot.setProperty(
          '--tg-content-safe-area-inset-bottom',
          `${contentInsets.bottom}px`
        );
        styleRoot.setProperty(
          '--tg-content-safe-area-inset-left',
          `${contentInsets.left}px`
        );
        styleRoot.setProperty('--tg-content-safe-top', `${contentInsets.top}px`);
        styleRoot.setProperty(
          '--tg-content-safe-right',
          `${contentInsets.right}px`
        );
        styleRoot.setProperty(
          '--tg-content-safe-bottom',
          `${contentInsets.bottom}px`
        );
        styleRoot.setProperty(
          '--tg-content-safe-left',
          `${contentInsets.left}px`
        );
      }

      if (safeInsets) {
        styleRoot.setProperty('--tg-safe-area-inset-top', `${safeInsets.top}px`);
        styleRoot.setProperty(
          '--tg-safe-area-inset-right',
          `${safeInsets.right}px`
        );
        styleRoot.setProperty(
          '--tg-safe-area-inset-bottom',
          `${safeInsets.bottom}px`
        );
        styleRoot.setProperty(
          '--tg-safe-area-inset-left',
          `${safeInsets.left}px`
        );
        styleRoot.setProperty('--tg-safe-top', `${safeInsets.top}px`);
        styleRoot.setProperty('--tg-safe-right', `${safeInsets.right}px`);
        styleRoot.setProperty('--tg-safe-bottom', `${safeInsets.bottom}px`);
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

    window.addEventListener('pointerdown', handlePointerDown, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const initAuth = async () => {
      if (!isCancelled) {
        setIsLoading(true);
      }

      try {
        const initData = getTelegramInitData();
        if (!initData) {
          if (!isCancelled) {
            setIsLoading(false);
          }
          return;
        }

        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
        const payload = (await response.json().catch(() => null)) as {
          token?: string;
          error?: string;
          user?: { id?: string | number };
        } | null;

        if (!response.ok || !payload?.token) {
          if (!isCancelled) {
            setIsLoading(false);
          }
          return;
        }

        setSupabaseAccessToken(payload.token);
        if (payload.user?.id != null) {
          setUserId(String(payload.user.id));
        } else if (!isCancelled) {
          setIsLoading(false);
        }
      } catch {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`tasks-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `telegram_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as TaskRow;
            if (!row?.id || !isDateInActiveMonth(row.date)) return;
            const rowPosition = Number(row.position ?? 0);
            const rowSeriesId = row.series_id ?? null;
            const rowColor = normalizeHex(row.color) ?? DEFAULT_TASK_COLOR;
            const rowPinned = row.is_pinned ?? false;
            const rowChecklist = parseChecklist(row.checklist);
            const rowStartMinutes = parseSmallInt(row.start_minutes);
            const rowRemindBefore = parseRemindBefore(row.remind_before_minutes);

            setTasks((prev) => {
              if (prev.some((task) => task.id === row.id)) {
                return prev;
              }

              let pendingMatchId: string | null = null;
              for (const [tempId, pending] of pendingInsertRef.current) {
                const pendingColor =
                  normalizeHex(pending.color) ?? DEFAULT_TASK_COLOR;
                const pendingPinned = pending.is_pinned ?? false;
                const pendingChecklist = parseChecklist(pending.checklist);
                const pendingStartMinutes = parseSmallInt(pending.start_minutes);
                const pendingRemindBefore = parseRemindBefore(
                  pending.remind_before_minutes
                );
                if (
                  pending.title === row.title &&
                  pending.duration === row.duration &&
                  pending.date === row.date &&
                  pending.completed === row.completed &&
                  (pending.position ?? 0) === rowPosition &&
                  (pending.series_id ?? null) === rowSeriesId &&
                  pendingColor === rowColor &&
                  pendingPinned === rowPinned &&
                  areChecklistsEqual(pendingChecklist, rowChecklist) &&
                  pendingStartMinutes === rowStartMinutes &&
                  pendingRemindBefore === rowRemindBefore
                ) {
                  pendingMatchId = tempId;
                  break;
                }
              }

              if (pendingMatchId) {
                pendingInsertRef.current.delete(pendingMatchId);
                return prev.map((task) =>
                  task.id === pendingMatchId
                    ? mapTaskRow(row, task.clientId)
                    : task
                );
              }

              return [...prev, mapTaskRow(row)];
            });
          }

          if (payload.eventType === 'UPDATE') {
            const row = payload.new as TaskRow;
            if (!row?.id) return;
            const isInMonth = isDateInActiveMonth(row.date);

            setTasks((prev) => {
              const exists = prev.some((task) => task.id === row.id);

              if (isInMonth) {
                if (exists) {
                  return prev.map((task) =>
                    task.id === row.id ? mapTaskRow(row, task.clientId) : task
                  );
                }
                return [...prev, mapTaskRow(row)];
              }

              if (!exists) return prev;
              return prev.filter((task) => task.id !== row.id);
            });
          }

          if (payload.eventType === 'DELETE') {
            const row = payload.old as TaskRow;
            if (!row?.id) return;
            setTasks((prev) => prev.filter((task) => task.id !== row.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_series',
          filter: `telegram_id=eq.${userId}`,
        },
        () => {
          setRefetchKey((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_series_skips',
          filter: `telegram_id=eq.${userId}`,
        },
        () => {
          setRefetchKey((prev) => prev + 1);
        }
      )
      .subscribe((status) => {
        console.log('[realtime] tasks channel:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isDateInActiveMonth]);

  useEffect(() => {
    if (!userId) return;
    let isCancelled = false;

    const fetchTasks = async () => {
      setIsLoading(true);
      setTasks([]);
      pendingInsertRef.current.clear();

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .gte('date', monthStartKey)
        .lte('date', monthEndKey)
        .order('date', { ascending: true })
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (!isCancelled) {
        if (!tasksError && tasksData) {
          setTasks(tasksData.map((t: TaskRow) => mapTaskRow(t)));
        }
        setIsLoading(false);
      }

      if (isCancelled || tasksError || !tasksData) {
        return;
      }

      const existingKeys = new Set<string>();
      const positionByDate = new Map<string, number>();
      tasksData.forEach((row: TaskRow) => {
        const rowDate = row.date;
        const rowPosition = Number(row.position ?? 0);
        positionByDate.set(
          rowDate,
          Math.max(positionByDate.get(rowDate) ?? -1, rowPosition)
        );
        if (row.series_id) {
          existingKeys.add(`${row.series_id}:${rowDate}`);
        }
      });

      const { data: skipsData } = await supabase
        .from('task_series_skips')
        .select('series_id,date')
        .gte('date', monthStartKey)
        .lte('date', monthEndKey);

      if (isCancelled) {
        return;
      }

      const skipKeys = new Set(
        (skipsData ?? []).map(
          (skip: TaskSeriesSkipRow) => `${skip.series_id}:${skip.date}`
        )
      );

      const { data: seriesData } = await supabase
        .from('task_series')
        .select(
          'id,title,duration,repeat,weekday,start_minutes,remind_before_minutes,start_date,end_date'
        )
        .lte('start_date', monthEndKey)
        .or(`end_date.is.null,end_date.gte.${monthStartKey}`);

      if (isCancelled) {
        return;
      }

      for (const series of seriesData ?? []) {
        await ensureSeriesInstancesForMonth(
          series as TaskSeriesRow,
          monthStartKey,
          monthEndKey,
          existingKeys,
          skipKeys,
          positionByDate
        );
      }
    };

    fetchTasks();
    return () => {
      isCancelled = true;
    };
  }, [userId, monthStartKey, monthEndKey, ensureSeriesInstancesForMonth, refetchKey]);

  useEffect(() => {
    if (!userId) return;
    let isCancelled = false;

    supabase
      .rpc('get_user_streak', { user_telegram_id: userId })
      .then(({ data, error }) => {
        if (isCancelled) return;
        if (error) {
          console.error('Fetch streak failed', error);
          return;
        }
        setStreak(typeof data === 'number' ? data : 0);
      });

    return () => {
      isCancelled = true;
    };
  }, [userId, tasks]);

  useEffect(() => {
    if (!userId) return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setRefetchKey((prev) => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  const currentTasks = useMemo(() => {
    const dayTasks = tasks.filter((task) => isSameDay(task.date, selectedDate));
    const getSortGroup = (task: Task) => {
      if (task.activeStartedAt && !task.completed) return 0;
      if (task.isPinned && !task.completed) return 1;
      if (task.completed) return 3;
      return 2;
    };
    return dayTasks.sort((a, b) => {
      const aGroup = getSortGroup(a);
      const bGroup = getSortGroup(b);
      if (aGroup !== bGroup) {
        return aGroup - bGroup;
      }
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
        0
      ),
    [currentTasks]
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const goToPreviousPeriod = useCallback(() => {
    setSelectedDate((current) =>
      viewMode === 'month' ? subMonths(current, 1) : subWeeks(current, 1)
    );
  }, [viewMode]);

  const goToNextPeriod = useCallback(() => {
    setSelectedDate((current) =>
      viewMode === 'month' ? addMonths(current, 1) : addWeeks(current, 1)
    );
  }, [viewMode]);

  const handleReorder = async (nextOrder: Task[]) => {
    const selectedDateKey = formatDateOnly(selectedDate);
    const positionsById = new Map(
      nextOrder.map((task, index) => [task.id, index])
    );

    setTasks((prev) => {
      if (positionsById.size === 0) return prev;
      return prev.map((task) => {
        if (formatDateOnly(task.date) !== selectedDateKey) return task;
        const nextPosition = positionsById.get(task.id);
        if (nextPosition == null || task.position === nextPosition) return task;
        return { ...task, position: nextPosition };
      });
    });

    if (!userId || positionsById.size === 0) {
      return;
    }

    const updates = nextOrder
      .filter((task) => isUuid(task.id))
      .map((task) => ({
        id: task.id,
        title: task.title,
        duration: task.duration,
        date: formatDateOnly(task.date),
        completed: task.completed,
        telegram_id: userId,
        position: positionsById.get(task.id) ?? task.position ?? 0,
      }));

    if (updates.length === 0) {
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('Reorder failed', error);
    }
  };

  const addTask = async (
    title: string,
    duration = DEFAULT_DURATION,
    repeat: TaskRepeat = 'none',
    repeatCount = 1,
    color: Task['color'] = DEFAULT_TASK_COLOR,
    startMinutes: number | null = null,
    remindBeforeMinutes = 0
  ) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }
    if (!userId) {
      return;
    }
    const resolvedColor = normalizeHex(color) ?? DEFAULT_TASK_COLOR;
    const normalizedStartMinutes = parseSmallInt(startMinutes);
    const normalizedRemindBefore = parseRemindBefore(remindBeforeMinutes);
    const remindAt = computeRemindAtIso(
      selectedDate,
      normalizedStartMinutes,
      normalizedRemindBefore
    );

    const selectedDateKey = formatDateOnly(selectedDate);
    const nextPosition =
      tasks
        .filter((task) => isSameDay(task.date, selectedDate))
        .reduce((max, task) => Math.max(max, task.position ?? 0), -1) + 1;

    if (repeat === 'none') {
      const tempId = Math.random().toString(36).substring(2, 9);
      const pendingRow: TaskRow = {
        id: tempId,
        title: trimmedTitle,
        duration,
        date: selectedDateKey,
        completed: false,
        position: nextPosition,
        series_id: null,
        color: resolvedColor,
        is_pinned: false,
        checklist: [],
        start_minutes: normalizedStartMinutes,
        remind_before_minutes: normalizedRemindBefore,
        remind_at: remindAt,
      };
      pendingInsertRef.current.set(tempId, pendingRow);

      const newTask: Task = {
        clientId: tempId,
        id: tempId,
        title: trimmedTitle,
        duration,
        date: selectedDate,
        completed: false,
        position: nextPosition,
        seriesId: null,
        elapsedMs: 0,
        activeStartedAt: null,
        color: resolvedColor,
        isPinned: false,
        checklist: [],
        startMinutes: normalizedStartMinutes,
        remindBeforeMinutes: normalizedRemindBefore,
      };

      setTasks((prev) => [...prev, newTask]);

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          duration: newTask.duration,
          date: formatDateOnly(newTask.date),
          completed: false,
          telegram_id: userId,
          position: newTask.position,
          series_id: null,
          color: resolvedColor,
          is_pinned: false,
          checklist: [],
          start_minutes: normalizedStartMinutes,
          remind_before_minutes: normalizedRemindBefore,
          remind_at: remindAt,
        })
        .select()
        .single();

      pendingInsertRef.current.delete(tempId);

      if (error) {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      } else if (data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, id: data.id } : t))
        );
      }
      return;
    }

    const normalizedRepeatCount = Math.max(1, Math.floor(repeatCount || 1));
    const endDate =
      repeat === 'weekly'
        ? addWeeks(selectedDate, normalizedRepeatCount - 1)
        : addDays(selectedDate, normalizedRepeatCount - 1);
    const endDateKey = formatDateOnly(endDate);

    const { data: seriesData, error: seriesError } = await supabase
      .from('task_series')
      .insert({
        telegram_id: userId,
        title: trimmedTitle,
        duration,
        repeat: repeat === 'daily' ? 'daily' : 'weekly',
        weekday: repeat === 'weekly' ? getDay(selectedDate) : null,
        start_date: selectedDateKey,
        end_date: endDateKey,
        start_minutes: normalizedStartMinutes,
        remind_before_minutes: normalizedRemindBefore,
      })
      .select()
      .single();

    if (seriesError || !seriesData) {
      return;
    }

    const series = seriesData as TaskSeriesRow;
    const seriesId = series.id;
    const tempId = Math.random().toString(36).substring(2, 9);
    const pendingRow: TaskRow = {
      id: tempId,
      title: trimmedTitle,
      duration,
      date: selectedDateKey,
      completed: false,
      position: nextPosition,
      series_id: seriesId,
      color: resolvedColor,
      is_pinned: false,
      checklist: [],
      start_minutes: normalizedStartMinutes,
      remind_before_minutes: normalizedRemindBefore,
      remind_at: remindAt,
    };
    pendingInsertRef.current.set(tempId, pendingRow);

    const newTask: Task = {
      clientId: tempId,
      id: tempId,
      title: trimmedTitle,
      duration,
      date: selectedDate,
      completed: false,
      position: nextPosition,
      seriesId,
      elapsedMs: 0,
      activeStartedAt: null,
      color: resolvedColor,
      isPinned: false,
      checklist: [],
      startMinutes: normalizedStartMinutes,
      remindBeforeMinutes: normalizedRemindBefore,
    };

    setTasks((prev) => [...prev, newTask]);

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: newTask.title,
        duration: newTask.duration,
        date: selectedDateKey,
        completed: false,
        telegram_id: userId,
        position: newTask.position,
        series_id: seriesId,
        color: resolvedColor,
        is_pinned: false,
        checklist: [],
        start_minutes: normalizedStartMinutes,
        remind_before_minutes: normalizedRemindBefore,
        remind_at: remindAt,
      })
      .select()
      .single();

    pendingInsertRef.current.delete(tempId);

    if (error) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      return;
    }

    if (data) {
      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? { ...t, id: data.id } : t))
      );
    }

    const existingKeys = new Set<string>();
    const positionByDate = new Map<string, number>();
    tasks.forEach((task) => {
      const dateKey = formatDateOnly(task.date);
      positionByDate.set(
        dateKey,
        Math.max(positionByDate.get(dateKey) ?? -1, task.position ?? 0)
      );
      if (task.seriesId) {
        existingKeys.add(`${task.seriesId}:${dateKey}`);
      }
    });
    existingKeys.add(`${seriesId}:${selectedDateKey}`);
    positionByDate.set(
      selectedDateKey,
      Math.max(positionByDate.get(selectedDateKey) ?? -1, nextPosition)
    );

    void ensureSeriesInstancesForMonth(
      series,
      monthStartKey,
      monthEndKey,
      existingKeys,
      new Set(),
      positionByDate
    );
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const existingTask = tasks.find((task) => task.id === id);
    if (!existingTask) return;

    const appliedUpdates: Partial<Task> = {};
    if (updates.title !== undefined) appliedUpdates.title = updates.title;
    if (updates.duration !== undefined) appliedUpdates.duration = updates.duration;
    if (updates.color !== undefined) {
      appliedUpdates.color = normalizeHex(updates.color) ?? DEFAULT_TASK_COLOR;
    }
    if (updates.isPinned !== undefined) {
      appliedUpdates.isPinned = updates.isPinned;
    }
    if (updates.checklist !== undefined) {
      appliedUpdates.checklist = Array.isArray(updates.checklist)
        ? updates.checklist
        : [];
    }
    if (updates.startMinutes !== undefined) {
      appliedUpdates.startMinutes = parseSmallInt(updates.startMinutes);
    }
    if (updates.remindBeforeMinutes !== undefined) {
      appliedUpdates.remindBeforeMinutes = parseRemindBefore(
        updates.remindBeforeMinutes
      );
    }
    if (updates.date !== undefined) {
      appliedUpdates.date = updates.date;
    }

    if (Object.keys(appliedUpdates).length === 0) return;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, ...appliedUpdates } : task
      )
    );

    const dbUpdates: Record<string, unknown> = {};
    if (appliedUpdates.title !== undefined) {
      dbUpdates.title = appliedUpdates.title;
    }
    if (appliedUpdates.duration !== undefined) {
      dbUpdates.duration = appliedUpdates.duration;
    }
    if (appliedUpdates.color !== undefined) {
      dbUpdates.color = appliedUpdates.color;
    }
    if (appliedUpdates.isPinned !== undefined) {
      dbUpdates.is_pinned = appliedUpdates.isPinned;
    }
    if (appliedUpdates.checklist !== undefined) {
      dbUpdates.checklist = appliedUpdates.checklist;
    }
    if (appliedUpdates.startMinutes !== undefined) {
      dbUpdates.start_minutes = appliedUpdates.startMinutes;
    }
    if (appliedUpdates.remindBeforeMinutes !== undefined) {
      dbUpdates.remind_before_minutes = appliedUpdates.remindBeforeMinutes;
    }
    if (appliedUpdates.date !== undefined) {
      dbUpdates.date = formatDateOnly(appliedUpdates.date);
    }

    if (
      appliedUpdates.startMinutes !== undefined ||
      appliedUpdates.remindBeforeMinutes !== undefined ||
      appliedUpdates.date !== undefined
    ) {
      const nextDate = appliedUpdates.date ?? existingTask.date;
      const nextStart =
        appliedUpdates.startMinutes ?? existingTask.startMinutes;
      const nextBefore =
        appliedUpdates.remindBeforeMinutes ?? existingTask.remindBeforeMinutes;
      dbUpdates.remind_at = computeRemindAtIso(
        nextDate,
        nextStart,
        nextBefore
      );
      dbUpdates.reminder_sent_at = null;
    }

    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);

    if (error) {
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? existingTask : task))
      );
    }
  };

  const moveTask = async (id: string, nextDateKey: string) => {
    const taskToMove = tasks.find((task) => task.id === id);
    if (!taskToMove) return;

    const currentDateKey = formatDateOnly(taskToMove.date);
    if (!nextDateKey || nextDateKey === currentDateKey) return;

    const nextPosition =
      tasks
        .filter(
          (task) => formatDateOnly(task.date) === nextDateKey && task.id !== id
        )
        .reduce((max, task) => Math.max(max, task.position ?? 0), -1) + 1;

    const nextDate = parseDateOnly(nextDateKey);
    const isNextInMonth = isDateInActiveMonth(nextDateKey);
    const remindAt = computeRemindAtIso(
      nextDate,
      taskToMove.startMinutes,
      taskToMove.remindBeforeMinutes
    );
    const updatedTask: Task = {
      ...taskToMove,
      date: nextDate,
      position: nextPosition,
      seriesId: taskToMove.seriesId ? null : taskToMove.seriesId,
    };

    setTasks((prev) => {
      const next = prev.filter((task) => task.id !== id);
      if (isNextInMonth) {
        next.push(updatedTask);
      }
      return next;
    });

    if (!userId) {
      return;
    }

    if (taskToMove.seriesId) {
      const { error: skipError } = await supabase
        .from('task_series_skips')
        .upsert(
          {
            series_id: taskToMove.seriesId,
            telegram_id: userId,
            date: currentDateKey,
          },
          { onConflict: 'series_id,date', ignoreDuplicates: true }
        );

      if (skipError) {
        setTasks((prev) => {
          const next = prev.filter((task) => task.id !== id);
          if (isDateInActiveMonth(taskToMove.date)) {
            next.push(taskToMove);
          }
          return next;
        });
        return;
      }
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        date: nextDateKey,
        position: nextPosition,
        series_id: taskToMove.seriesId ? null : taskToMove.seriesId ?? null,
        remind_at: remindAt,
        reminder_sent_at: null,
      })
      .eq('id', id);

    if (error) {
      setTasks((prev) => {
        const next = prev.filter((task) => task.id !== id);
        if (isDateInActiveMonth(taskToMove.date)) {
          next.push(taskToMove);
        }
        return next;
      });
      if (taskToMove.seriesId) {
        await supabase
          .from('task_series_skips')
          .delete()
          .eq('series_id', taskToMove.seriesId)
          .eq('date', currentDateKey);
      }
    }
  };

  const toggleTask = async (id: string) => {
    const targetTask = tasks.find((task) => task.id === id);
    if (!targetTask) return;

    const requestId = (toggleRequestRef.current.get(id) ?? 0) + 1;
    toggleRequestRef.current.set(id, requestId);

    const newStatus = !targetTask.completed;
    const wasActive = Boolean(targetTask.activeStartedAt);
    const completionElapsed = wasActive
      ? targetTask.elapsedMs +
      Math.max(0, Date.now() - targetTask.activeStartedAt!.getTime())
      : targetTask.elapsedMs;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
            ...task,
            completed: newStatus,
            activeStartedAt: newStatus ? null : task.activeStartedAt,
            elapsedMs: newStatus ? completionElapsed : task.elapsedMs,
          }
          : task
      )
    );

    const { error } = await supabase
      .from('tasks')
      .update({ completed: newStatus })
      .eq('id', id);

    if (error) {
      if (toggleRequestRef.current.get(id) !== requestId) {
        return;
      }
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
              ...task,
              completed: !newStatus,
              activeStartedAt: targetTask.activeStartedAt,
              elapsedMs: targetTask.elapsedMs,
            }
            : task
        )
      );
    }
  };

  const deleteTask = async (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;
    const taskIndex = tasks.findIndex((t) => t.id === id);

    setTasks((prev) => prev.filter((task) => task.id !== id));

    const restoreInState = () => {
      setTasks((prev) => {
        const next = [...prev];
        const index =
          taskIndex >= 0 && taskIndex <= next.length ? taskIndex : next.length;
        next.splice(index, 0, taskToDelete);
        return next;
      });
    };

    if (!taskToDelete.seriesId) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) {
        restoreInState();
        return null;
      }
      return taskToDelete;
    }

    if (!userId) {
      restoreInState();
      return null;
    }

    const dateKey = formatDateOnly(taskToDelete.date);
    const { error: skipError } = await supabase
      .from('task_series_skips')
      .upsert(
        {
          series_id: taskToDelete.seriesId,
          telegram_id: userId,
          date: dateKey,
        },
        { onConflict: 'series_id,date', ignoreDuplicates: true }
      );

    if (skipError) {
      restoreInState();
      return null;
    }

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      restoreInState();
      return null;
    }

    return taskToDelete;
  };

  const restoreTask = async (task: Task) => {
    setTasks((prev) => [...prev, task]);

    if (!userId) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      return;
    }

    const dateKey = formatDateOnly(task.date);
    let skipRemoved = false;

    if (task.seriesId) {
      const { error: skipError } = await supabase
        .from('task_series_skips')
        .delete()
        .eq('series_id', task.seriesId)
        .eq('date', dateKey);
      skipRemoved = !skipError;
    }

    const remindAt = computeRemindAtIso(
      task.date,
      task.startMinutes,
      task.remindBeforeMinutes
    );

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: task.title,
        duration: task.duration,
        date: dateKey,
        completed: task.completed,
        telegram_id: userId,
        position: task.position ?? 0,
        series_id: task.seriesId ?? null,
        elapsed_ms: task.elapsedMs ?? 0,
        active_started_at: null,
        color: task.color,
        is_pinned: task.isPinned,
        checklist: task.checklist,
        start_minutes: task.startMinutes,
        remind_before_minutes: task.remindBeforeMinutes,
        remind_at: remindAt,
        reminder_sent_at: null,
      })
      .select()
      .single();

    if (error) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (task.seriesId && skipRemoved) {
        await supabase.from('task_series_skips').upsert(
          {
            series_id: task.seriesId,
            telegram_id: userId,
            date: dateKey,
          },
          { onConflict: 'series_id,date', ignoreDuplicates: true }
        );
      }
    } else if (data) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, id: data.id } : t))
      );
    }
  };
  const fetchRecurringTasks = useCallback(async () => {
    if (!userId) return;
    const todayKey = formatDateOnly(new Date());

    const { data, error } = await supabase
      .from('task_series')
      .select('*')
      .eq('telegram_id', userId)
      .or(`end_date.is.null,end_date.gte.${todayKey}`);

    if (!error && data) {
      const seriesRows = data as TaskSeriesRow[];
      setRecurringTasks(seriesRows);

      const seriesIds = seriesRows.map((series) => series.id);
      if (seriesIds.length === 0) {
        setRecurringSkips([]);
        return;
      }

      const { data: skipsData, error: skipsError } = await supabase
        .from('task_series_skips')
        .select('series_id,date')
        .eq('telegram_id', userId)
        .in('series_id', seriesIds)
        .gte('date', todayKey);

      if (!skipsError && skipsData) {
        setRecurringSkips(skipsData as TaskSeriesSkipRow[]);
      } else {
        setRecurringSkips([]);
      }
    } else {
      setRecurringTasks([]);
      setRecurringSkips([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const timerId = window.setTimeout(() => {
      void fetchRecurringTasks();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [fetchRecurringTasks, userId, refetchKey]);

  const deleteTaskSeries = async (seriesId: string) => {
    if (!userId) return;
    const today = startOfDay(new Date());
    const todayKey = formatDateOnly(today);
    const yesterdayKey = formatDateOnly(addDays(today, -1));

    setRecurringTasks((prev) => prev.filter((series) => series.id !== seriesId));
    setRecurringSkips((prev) =>
      prev.filter((skip) => skip.series_id !== seriesId)
    );
    setTasks((prev) =>
      prev.filter(
        (task) => !(task.seriesId === seriesId && formatDateOnly(task.date) >= todayKey)
      )
    );

    const { error: updateError } = await supabase
      .from('task_series')
      .update({ end_date: yesterdayKey })
      .eq('telegram_id', userId)
      .eq('id', seriesId);

    if (updateError) {
      void fetchRecurringTasks();
      setRefetchKey((prev) => prev + 1);
      return;
    }

    const { error: deleteFutureError } = await supabase
      .from('tasks')
      .delete()
      .eq('telegram_id', userId)
      .eq('series_id', seriesId)
      .gte('date', todayKey);

    if (deleteFutureError) {
      setRefetchKey((prev) => prev + 1);
    }

    await supabase.from('task_series_skips').delete().eq('series_id', seriesId);
  };

  const skipTaskSeriesDate = async (seriesId: string, date: Date) => {
    if (!userId) return;
    const dateKey = formatDateOnly(date);
    const hasSkip = recurringSkips.some(
      (skip) => skip.series_id === seriesId && skip.date === dateKey
    );
    const skipAddedOptimistically = !hasSkip;

    // Optimistic update: remove from current view if it's there
    setTasks((prev) =>
      prev.filter(
        (t) => !(t.seriesId === seriesId && isSameDay(t.date, date))
      )
    );
    if (skipAddedOptimistically) {
      setRecurringSkips((prev) => [...prev, { series_id: seriesId, date: dateKey }]);
    }

    // 1. Add to task_series_skips
    const { error } = await supabase.from('task_series_skips').upsert(
      {
        series_id: seriesId,
        telegram_id: userId,
        date: dateKey,
      },
      { onConflict: 'series_id,date', ignoreDuplicates: true }
    );

    // 2. Delete any concrete instance if it exists
    if (!error) {
      // We need to find if there's a concrete task for this date to delete it
      // We can just try to delete matching criteria
      await supabase
        .from('tasks')
        .delete()
        .eq('series_id', seriesId)
        .eq('date', dateKey);
    } else {
      if (skipAddedOptimistically) {
        setRecurringSkips((prev) =>
          prev.filter(
            (skip) =>
              !(skip.series_id === seriesId && skip.date === dateKey)
          )
        );
      }
      setRefetchKey((prev) => prev + 1);
    }
  };

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
  };
}
