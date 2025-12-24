import { cn } from "../lib/cn";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

type AddTaskSheetProps = {
  isOpen: boolean;
  title: string;
  duration: number;
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onDurationChange: (value: number) => void;
  onAdd: () => void;
  isAddDisabled: boolean;
};

export default function AddTaskSheet({
  isOpen,
  title,
  duration,
  onClose,
  onTitleChange,
  onDurationChange,
  onAdd,
  isAddDisabled,
}: AddTaskSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_180ms_ease-out]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md animate-[sheetIn_260ms_cubic-bezier(0.22,1,0.36,1)] rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_-12px_40px_-24px_rgba(16,12,8,0.6)]">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-[var(--border)]" />

        <h2 className="mb-4 text-xl font-semibold text-[var(--ink)] font-[var(--font-display)]">
          Новая задача
        </h2>

        <label className="sr-only" htmlFor="task-title">
          Название задачи
        </label>
        <input
          autoFocus
          id="task-title"
          type="text"
          placeholder="Что планируем?"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="mb-6 w-full rounded-xl border border-transparent bg-[var(--surface-2)] p-4 text-lg text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
        />

        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold text-[var(--muted)]">
            Длительность
          </p>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => onDurationChange(mins)}
                aria-pressed={duration === mins}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                  duration === mins
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_10px_20px_-16px_rgba(23,95,86,0.6)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]",
                )}
              >
                {mins}м
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onAdd}
          disabled={isAddDisabled}
          className="w-full rounded-xl bg-[var(--accent)] py-4 text-lg font-semibold text-[var(--accent-ink)] shadow-[0_16px_28px_-18px_rgba(23,95,86,0.6)] transition-all hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:bg-[var(--border)] disabled:text-[var(--muted)] disabled:shadow-none active:scale-[0.98]"
        >
          Добавить в план
        </button>
      </div>
    </div>
  );
}
