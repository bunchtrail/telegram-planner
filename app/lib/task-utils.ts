import { format } from 'date-fns';
import { DEFAULT_TASK_COLOR } from './constants';
import type { Task, TaskChecklistItem } from '../types/task';

export const DEFAULT_DURATION = 30;
const TASK_TITLE_MAX_LENGTH = 160;
const TASK_DURATION_MIN = 1;
const TASK_DURATION_MAX = 24 * 60;

export type TaskRow = {
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

export type ReorderTaskUpdate = {
	id: string;
	position: number;
};

export type SupabaseErrorLike = {
	message?: string;
	details?: string | null;
	hint?: string | null;
	code?: string;
	status?: number | string | null;
};

export const formatDateOnly = (value: Date) => format(value, 'yyyy-MM-dd');

export const parseDateOnly = (value: string) => {
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

export const parseChecklist = (value: unknown): TaskChecklistItem[] => {
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

export const parseSmallInt = (value?: number | string | null) => {
	if (value == null) return null;
	const numeric = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(numeric)) return null;
	return Math.max(0, Math.min(1439, Math.floor(numeric)));
};

export const parseRemindBefore = (value?: number | string | null) => {
	if (value == null) return 0;
	const numeric = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(numeric)) return 0;
	return Math.max(0, Math.min(1440, Math.floor(numeric)));
};

export const normalizeTaskTitle = (value: string) => value.trim();

export const isTaskTitleValid = (value: string) =>
	value.length > 0 && value.length <= TASK_TITLE_MAX_LENGTH;

export const normalizeTaskDuration = (value: number) => {
	if (!Number.isFinite(value)) return DEFAULT_DURATION;
	return Math.max(
		TASK_DURATION_MIN,
		Math.min(TASK_DURATION_MAX, Math.floor(value)),
	);
};

export const computeRemindAtIso = (
	date: Date,
	startMinutes: number | null,
	remindBeforeMinutes: number,
) => {
	if (startMinutes == null) return null;
	if (remindBeforeMinutes < 0) return null;
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	start.setMinutes(startMinutes);
	const remindAt = new Date(start.getTime() - remindBeforeMinutes * 60_000);
	return remindAt.toISOString();
};

export const areChecklistsEqual = (
	left: TaskChecklistItem[],
	right: TaskChecklistItem[],
) => {
	if (left.length !== right.length) return false;
	for (let i = 0; i < left.length; i += 1) {
		if (left[i].text !== right[i].text || left[i].done !== right[i].done)
			return false;
	}
	return true;
};

export const normalizeHex = (value?: string | null) => {
	if (!value) return null;
	const trimmed = value.trim();
	const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
	if (!/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(withHash)) return null;
	return withHash;
};

export const isUuid = (value: string) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value,
	);

export const mapTaskRow = (row: TaskRow, clientId = row.id): Task => ({
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

export const isSupabaseAuthError = (
	error: SupabaseErrorLike | null | undefined,
) => {
	if (!error) return false;

	const code = typeof error.code === 'string' ? error.code.toUpperCase() : '';
	if (code === 'PGRST301' || code === 'PGRST302' || code === 'PGRST303')
		return true;

	const rawStatus = error.status;
	const status =
		typeof rawStatus === 'number'
			? rawStatus
			: typeof rawStatus === 'string'
				? Number(rawStatus)
				: NaN;
	if (status === 401 || status === 403) return true;

	const message =
		`${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
	if (message.includes('jwt') && message.includes('expired')) return true;
	if (message.includes('invalid jwt') || message.includes('token is expired'))
		return true;
	if (message.includes('invalid token')) return true;
	if (
		message.includes('unauthorized') ||
		message.includes('not authenticated')
	)
		return true;

	return false;
};
