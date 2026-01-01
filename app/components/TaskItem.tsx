import {
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import type { Task } from "../types/task";
import { cn } from "../lib/cn";
import { useHaptic } from "../hooks/useHaptic";

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const { impact, notification } = useHaptic();
  const controls = useAnimation();

  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-100, -20], [1, 0], { clamp: true });
  const iconScale = useTransform(x, [-150, -50], [1.2, 0.8], { clamp: true });

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.x < -80) {
      notification("warning");
      onDelete(task.id);
      return;
    }
    impact("light");
  };

  const handleToggle = () => {
    impact("medium");
    controls.start({
      scale: [1, 0.9, 1.05, 1],
      transition: { duration: 0.3 },
    });
    onToggle(task.id);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      whileTap={{ scale: 0.98 }}
      className="group relative mb-3 touch-pan-y select-none"
    >
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-[20px] bg-[var(--danger)] pr-6"
      >
        <motion.div style={{ scale: iconScale }}>
          <Trash2 size={24} className="text-white" />
        </motion.div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0.1 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative z-10 flex items-center overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-1 transition-all",
          task.completed &&
            "border-transparent bg-[var(--surface-2)] opacity-60 shadow-none",
        )}
      >
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={task.completed}
          className="flex min-w-0 flex-1 items-center gap-4 p-3 text-left"
        >
          <div
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-[2px] transition-colors",
              task.completed
                ? "border-[var(--accent)] bg-[var(--accent)]"
                : "border-[var(--border)] bg-transparent",
            )}
          >
            <motion.div animate={controls}>
              {task.completed && (
                <Check size={14} strokeWidth={4} className="text-white" />
              )}
            </motion.div>
          </div>

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-[17px] font-medium leading-snug transition-all",
                task.completed
                  ? "text-[var(--muted)] line-through"
                  : "text-[var(--ink)]",
              )}
            >
              {task.title}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 pr-2">
          {!task.completed && (
            <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-[11px] font-bold text-[var(--muted)] tabular-nums">
              {task.duration}м
            </span>
          )}
        </div>
      </motion.div>
    </motion.li>
  );
}
