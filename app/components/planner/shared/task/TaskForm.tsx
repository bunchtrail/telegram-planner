'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from 'react';
import { useHaptic } from '@/app/hooks/useHaptic';
import { cn } from '@/app/lib/cn';
import { DEFAULT_TASK_COLOR } from '@/app/lib/constants';
import {
  isTaskTitleValid,
  normalizeHex,
  normalizeTaskDuration,
  normalizeTaskTitle,
  parseRemindBefore,
  parseSmallInt,
} from '@/app/lib/task-utils';
import type { TaskRepeat } from '@/app/types/task';
import TaskColorSection from './TaskColorSection';
import TaskDurationSection from './TaskDurationSection';
import TaskReminderSection from './TaskReminderSection';
import TaskRepeatSection from './TaskRepeatSection';
import TaskScheduleSection from './TaskScheduleSection';
import TaskTitleField from './TaskTitleField';

const DEFAULT_REPEAT_COUNT = 7;
const MOBILE_DIVIDER_CLASS_NAME =
  'mx-8 h-px shrink-0 bg-gradient-to-r from-transparent via-[var(--border)]/50 to-transparent';

export type TaskFormValue = {
  color: string;
  duration: number;
  remindBeforeMinutes: number;
  repeat: TaskRepeat;
  repeatCount: number;
  startMinutes: number | null;
  title: string;
};

export type TaskFormSubmitValue = TaskFormValue;

export type TaskFormProps = {
  className?: string;
  initialValue?: Partial<TaskFormValue>;
  isDesktop?: boolean;
  mode: 'create' | 'edit';
  onCanSubmitChange?: (value: boolean) => void;
  onSubmit: (value: TaskFormSubmitValue) => void;
  taskDate: Date;
  titleRef?: Ref<HTMLTextAreaElement>;
};

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  ref.current = value;
};

const createInitialValue = (
  initialValue?: Partial<TaskFormValue>,
): TaskFormValue => ({
  title: initialValue?.title ?? '',
  duration: normalizeTaskDuration(initialValue?.duration ?? 30),
  repeat: initialValue?.repeat ?? 'none',
  repeatCount: Math.max(
    1,
    Math.floor(initialValue?.repeatCount ?? DEFAULT_REPEAT_COUNT),
  ),
  color: normalizeHex(initialValue?.color) ?? DEFAULT_TASK_COLOR,
  startMinutes: parseSmallInt(initialValue?.startMinutes),
  remindBeforeMinutes: parseRemindBefore(initialValue?.remindBeforeMinutes),
});

const TaskForm = forwardRef<HTMLFormElement, TaskFormProps>(
  (
    {
      className,
      initialValue,
      isDesktop = false,
      mode,
      onCanSubmitChange,
      onSubmit,
      taskDate,
      titleRef,
    },
    ref,
  ) => {
    const [value, setValue] = useState(() => createInitialValue(initialValue));
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { notification } = useHaptic();

    const setTextareaRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        assignRef(titleRef, node);
      },
      [titleRef],
    );

    useEffect(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.style.height = 'auto';
      element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
    }, [value.title]);

    const canSubmit = normalizeTaskTitle(value.title).length > 0;

    useEffect(() => {
      onCanSubmitChange?.(canSubmit);
    }, [canSubmit, onCanSubmitChange]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const title = normalizeTaskTitle(value.title);
      if (!isTaskTitleValid(title)) {
        notification('error');
        textareaRef.current?.focus({ preventScroll: true });
        return;
      }

      const startMinutes = parseSmallInt(value.startMinutes);
      const remindBeforeMinutes =
        startMinutes == null ? 0 : parseRemindBefore(value.remindBeforeMinutes);

      notification('success');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      onSubmit({
        title,
        duration: normalizeTaskDuration(value.duration),
        repeat: value.repeat,
        repeatCount: Math.max(1, Math.floor(value.repeatCount)),
        color: normalizeHex(value.color) ?? DEFAULT_TASK_COLOR,
        startMinutes,
        remindBeforeMinutes,
      });
    };

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className={cn(
          'flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden no-scrollbar touch-pan-y',
          className,
        )}
      >
        <div className={cn('shrink-0', isDesktop ? 'mb-8' : 'px-6 py-2')}>
          <TaskTitleField
            ref={setTextareaRefs}
            color={value.color}
            isDesktop={isDesktop}
            onChange={(title) =>
              setValue((current) => ({
                ...current,
                title,
              }))
            }
            value={value.title}
          />
        </div>

        <div
          className={cn(
            'flex gap-8',
            isDesktop ? 'grid grid-cols-2 items-start pb-8' : 'mt-4 flex-col',
          )}
        >
          {isDesktop ? (
            <>
              <div className="flex flex-col gap-6">
                <TaskScheduleSection
                  color={value.color}
                  duration={value.duration}
                  isDesktop
                  onChange={(startMinutes) =>
                    setValue((current) => ({
                      ...current,
                      startMinutes,
                      remindBeforeMinutes:
                        startMinutes == null ? 0 : current.remindBeforeMinutes,
                    }))
                  }
                  startMinutes={value.startMinutes}
                  taskDate={taskDate}
                />
                <TaskDurationSection
                  color={value.color}
                  duration={value.duration}
                  onChange={(duration) =>
                    setValue((current) => ({
                      ...current,
                      duration,
                    }))
                  }
                />
                <TaskReminderSection
                  onChange={(remindBeforeMinutes) =>
                    setValue((current) => ({
                      ...current,
                      remindBeforeMinutes,
                    }))
                  }
                  remindBeforeMinutes={value.remindBeforeMinutes}
                  startMinutes={value.startMinutes}
                />
              </div>

              <div className="flex flex-col gap-6">
                <TaskColorSection
                  color={value.color}
                  onChange={(color) =>
                    setValue((current) => ({
                      ...current,
                      color,
                    }))
                  }
                />
                <TaskRepeatSection
                  isDesktop
                  mode={mode}
                  onRepeatChange={(repeat) =>
                    setValue((current) => ({
                      ...current,
                      repeat,
                    }))
                  }
                  onRepeatCountChange={(repeatCount) =>
                    setValue((current) => ({
                      ...current,
                      repeatCount,
                    }))
                  }
                  repeat={value.repeat}
                  repeatCount={value.repeatCount}
                />
              </div>
            </>
          ) : (
            <>
              <div className="shrink-0 px-6">
                <TaskScheduleSection
                  color={value.color}
                  duration={value.duration}
                  onChange={(startMinutes) =>
                    setValue((current) => ({
                      ...current,
                      startMinutes,
                      remindBeforeMinutes:
                        startMinutes == null ? 0 : current.remindBeforeMinutes,
                    }))
                  }
                  startMinutes={value.startMinutes}
                  taskDate={taskDate}
                />
              </div>

              {value.startMinutes != null ? (
                <div className="mt-6 shrink-0 px-6">
                  <TaskReminderSection
                    onChange={(remindBeforeMinutes) =>
                      setValue((current) => ({
                        ...current,
                        remindBeforeMinutes,
                      }))
                    }
                    remindBeforeMinutes={value.remindBeforeMinutes}
                    startMinutes={value.startMinutes}
                  />
                </div>
              ) : null}

              <div className={MOBILE_DIVIDER_CLASS_NAME} />

              <div className="shrink-0 px-6">
                <TaskDurationSection
                  color={value.color}
                  duration={value.duration}
                  onChange={(duration) =>
                    setValue((current) => ({
                      ...current,
                      duration,
                    }))
                  }
                />
              </div>

              <div className={MOBILE_DIVIDER_CLASS_NAME} />

              <div className="shrink-0 px-6">
                <TaskColorSection
                  color={value.color}
                  onChange={(color) =>
                    setValue((current) => ({
                      ...current,
                      color,
                    }))
                  }
                />
              </div>

              <div className={MOBILE_DIVIDER_CLASS_NAME} />

              <div className="mb-6 shrink-0 px-4">
                <TaskRepeatSection
                  mode={mode}
                  onRepeatChange={(repeat) =>
                    setValue((current) => ({
                      ...current,
                      repeat,
                    }))
                  }
                  onRepeatCountChange={(repeatCount) =>
                    setValue((current) => ({
                      ...current,
                      repeatCount,
                    }))
                  }
                  repeat={value.repeat}
                  repeatCount={value.repeatCount}
                />
              </div>
            </>
          )}

          {!isDesktop ? <div className="h-6 shrink-0" /> : null}
        </div>
      </form>
    );
  },
);

TaskForm.displayName = 'TaskForm';

export default TaskForm;
