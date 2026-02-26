export type PomodoroPhase = 'focus' | 'short_break' | 'long_break';

export type PomodoroState = {
  phase: PomodoroPhase;
  round: number;        // 1-4, current pomodoro round
  timeLeftMs: number;    // ms remaining in current phase
  isRunning: boolean;
  totalPomodoros: number; // completed focus rounds in this session
};

export const POMODORO_FOCUS_MS = 25 * 60 * 1000;
export const POMODORO_SHORT_BREAK_MS = 5 * 60 * 1000;
export const POMODORO_LONG_BREAK_MS = 15 * 60 * 1000;
export const POMODOROS_BEFORE_LONG_BREAK = 4;
