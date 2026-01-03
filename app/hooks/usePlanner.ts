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
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { setSupabaseAccessToken, supabase } from '../lib/supabase';
import type { Task, TaskRepeat } from '../types/task';

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
};

type TaskSeriesRow = {
  id: string;
  title: string;
  duration: number;
  repeat: 'daily' | 'weekly';
  weekday: number | null;
  start_date: string;
  end_date: string | null;
};

type TaskSeriesSkipRow = {
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

const normalizeHex = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(withHash)) {
    return null;
  }
  return withHash;
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

const mapTaskRow = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  duration: row.duration,
  date: parseDateOnly(row.date),
  completed: row.completed,
  position: Number(row.position ?? 0),
  seriesId: row.series_id ?? null,
  elapsedMs: parseElapsedMs(row.elapsed_ms),
  activeStartedAt: parseTimestamp(row.active_started_at),
});

export function usePlanner() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<PlannerViewMode>('week');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchKey, setRefetchKey] = useState(0);
  const [timerNow, setTimerNow] = useState(() => Date.now());
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
      setTimerNow(now);

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

  const getTaskElapsedMs = useCallback(
    (id: string) => {
      const task = tasksById.get(id);
      if (!task) return 0;
      const base = task.elapsedMs ?? 0;
      if (task.activeStartedAt) {
        return base + Math.max(0, timerNow - task.activeStartedAt.getTime());
      }
      return base;
    },
    [tasksById, timerNow]
  );

  useEffect(() => {
    if (!activeTaskId) return;
    const interval = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeTaskId]);

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
    if (!webApp) return;

    webApp.ready?.();
    if (webApp.isVersionAtLeast?.('7.7')) {
      webApp.disableVerticalSwipes?.();
    }
    webApp.expand?.();

    const applyTheme = () => {
      const root = document.documentElement.style;
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

      root.setProperty('--bg', bgColor);
      root.setProperty('--surface', surfaceColor);
      root.setProperty('--surface-2', surfaceAlt);
      if (glassSurface) {
        root.setProperty('--surface-glass', glassSurface);
      }
      root.setProperty('--ink', textColor);
      root.setProperty('--muted', mutedColor);
      root.setProperty('--border', borderColor);
      root.setProperty('--accent', accentColor);
      root.setProperty('--accent-ink', accentInk);
      root.setProperty('--danger', dangerColor);

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
      const root = document.documentElement.style;
      const contentInsets = webApp.contentSafeAreaInset;
      const safeInsets = webApp.safeAreaInset;

      if (contentInsets) {
        root.setProperty(
          '--tg-content-safe-area-inset-top',
          `${contentInsets.top}px`
        );
        root.setProperty(
          '--tg-content-safe-area-inset-right',
          `${contentInsets.right}px`
        );
        root.setProperty(
          '--tg-content-safe-area-inset-bottom',
          `${contentInsets.bottom}px`
        );
        root.setProperty(
          '--tg-content-safe-area-inset-left',
          `${contentInsets.left}px`
        );
        root.setProperty('--tg-content-safe-top', `${contentInsets.top}px`);
        root.setProperty('--tg-content-safe-right', `${contentInsets.right}px`);
        root.setProperty(
          '--tg-content-safe-bottom',
          `${contentInsets.bottom}px`
        );
        root.setProperty('--tg-content-safe-left', `${contentInsets.left}px`);
      }

      if (safeInsets) {
        root.setProperty('--tg-safe-area-inset-top', `${safeInsets.top}px`);
        root.setProperty('--tg-safe-area-inset-right', `${safeInsets.right}px`);
        root.setProperty(
          '--tg-safe-area-inset-bottom',
          `${safeInsets.bottom}px`
        );
        root.setProperty('--tg-safe-area-inset-left', `${safeInsets.left}px`);
        root.setProperty('--tg-safe-top', `${safeInsets.top}px`);
        root.setProperty('--tg-safe-right', `${safeInsets.right}px`);
        root.setProperty('--tg-safe-bottom', `${safeInsets.bottom}px`);
        root.setProperty('--tg-safe-left', `${safeInsets.left}px`);
      }
    };

    const applyTelegramControlsOffsets = () => {
      const root = document.documentElement.style;
      const isFullscreen = Boolean(webApp.isFullscreen);
      const platform = webApp.platform;
      const top = !isFullscreen ? 0 : platform === 'ios' ? 44 : 48;
      const side = !isFullscreen ? 0 : platform === 'ios' ? 44 : 40;
      root.setProperty('--tma-tg-controls-top', `${top}px`);
      root.setProperty('--tma-tg-controls-side', `${side}px`);
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

            setTasks((prev) => {
              if (prev.some((task) => task.id === row.id)) {
                return prev;
              }

              let pendingMatchId: string | null = null;
              for (const [tempId, pending] of pendingInsertRef.current) {
                if (
                  pending.title === row.title &&
                  pending.duration === row.duration &&
                  pending.date === row.date &&
                  pending.completed === row.completed &&
                  (pending.position ?? 0) === rowPosition &&
                  (pending.series_id ?? null) === rowSeriesId
                ) {
                  pendingMatchId = tempId;
                  break;
                }
              }

              if (pendingMatchId) {
                pendingInsertRef.current.delete(pendingMatchId);
                return prev.map((task) =>
                  task.id === pendingMatchId ? mapTaskRow(row) : task
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
                    task.id === row.id ? mapTaskRow(row) : task
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
        .select('id,title,duration,repeat,weekday,start_date,end_date')
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

  const currentTasks = useMemo(
    () => {
      const dayTasks = tasks.filter((task) =>
        isSameDay(task.date, selectedDate)
      );
      const isActiveTask = (task: Task) =>
        Boolean(task.activeStartedAt) && !task.completed;
      return dayTasks.sort((a, b) => {
        const aActive = isActiveTask(a);
        const bActive = isActiveTask(b);
        if (aActive !== bActive) {
          return aActive ? -1 : 1;
        }
        const aPos = a.position ?? 0;
        const bPos = b.position ?? 0;
        if (aPos !== bPos) return aPos - bPos;
        return a.id.localeCompare(b.id);
      });
    },
    [tasks, selectedDate]
  );

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
    const reordered = nextOrder.map((task, index) => ({
      ...task,
      position: index,
    }));

    setTasks((prev) => {
      let inserted = false;
      const next: Task[] = [];
      for (const task of prev) {
        if (formatDateOnly(task.date) === selectedDateKey) {
          if (!inserted) {
            next.push(...reordered);
            inserted = true;
          }
          continue;
        }
        next.push(task);
      }
      if (!inserted) {
        next.push(...reordered);
      }
      return next;
    });

    if (!userId || reordered.length === 0) {
      return;
    }

    const updates = reordered.map((task) => ({
      id: task.id,
      title: task.title,
      duration: task.duration,
      date: formatDateOnly(task.date),
      completed: task.completed,
      telegram_id: userId,
      position: task.position ?? 0,
    }));

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
    repeatCount = 1
  ) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }
    if (!userId) {
      return;
    }

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
      };
      pendingInsertRef.current.set(tempId, pendingRow);

      const newTask: Task = {
        id: tempId,
        title: trimmedTitle,
        duration,
        date: selectedDate,
        completed: false,
        position: nextPosition,
        seriesId: null,
        elapsedMs: 0,
        activeStartedAt: null,
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
    };
    pendingInsertRef.current.set(tempId, pendingRow);

    const newTask: Task = {
      id: tempId,
      title: trimmedTitle,
      duration,
      date: selectedDate,
      completed: false,
      position: nextPosition,
      seriesId,
      elapsedMs: 0,
      activeStartedAt: null,
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

  const updateTask = async (
    id: string,
    updates: { title: string; duration: number }
  ) => {
    const existingTask = tasks.find((task) => task.id === id);
    if (!existingTask) return;

    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );

    const { error } = await supabase.from('tasks').update(updates).eq('id', id);

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

  return {
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    isAddOpen,
    setIsAddOpen,
    tasks,
    currentTasks,
    weekDays,
    monthDays,
    taskDates,
    hours,
    minutes,
    activeTaskId,
    toggleActiveTask,
    getTaskElapsedMs,
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
  };
}
