export type TaskChecklistItem = {
  text: string;
  done: boolean;
};

export type TaskRepeat = "none" | "daily" | "weekly";

export type Task = {
  clientId: string;
  id: string;
  title: string;
  duration: number;
  date: Date;
  completed: boolean;
  position: number;
  seriesId?: string | null;
  elapsedMs: number;
  activeStartedAt: Date | null;
  color: string;
  isPinned: boolean;
  checklist: TaskChecklistItem[];
  startMinutes: number | null;
  remindBeforeMinutes: number;
};
