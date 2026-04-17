'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { DEFAULT_TASK_COLOR } from '../lib/constants';
import type { TaskRepeat } from '../types/task';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import BottomSheet from './planner/shared/ui/BottomSheet';
import ModalHeader from './planner/shared/ui/ModalHeader';
import TaskForm, {
  type TaskFormSubmitValue,
} from './planner/shared/task/TaskForm';

type TaskSheetProps = {
  onClose: () => void;
  mode: 'create' | 'edit';
  initialTitle?: string;
  initialDuration?: number;
  initialRepeat?: TaskRepeat;
  initialRepeatCount?: number;
  initialColor?: string;
  initialStartMinutes?: number | null;
  initialRemindBeforeMinutes?: number;
  taskDate: Date;
  onSubmit: (
    title: string,
    duration: number,
    repeat: TaskRepeat,
    repeatCount: number,
    color: string,
    startMinutes: number | null,
    remindBeforeMinutes: number,
  ) => void;
  isDesktop?: boolean;
};

export default function TaskSheet({
  onClose,
  mode,
  initialTitle = '',
  initialDuration = 30,
  initialRepeat = 'none',
  initialRepeatCount = 7,
  initialColor = DEFAULT_TASK_COLOR,
  initialStartMinutes = null,
  initialRemindBeforeMinutes = 0,
  taskDate,
  onSubmit,
  isDesktop = false,
}: TaskSheetProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [canSubmit, setCanSubmit] = useState(Boolean(initialTitle.trim()));
  const formKey = [
    mode,
    initialTitle,
    initialDuration,
    initialRepeat,
    initialRepeatCount,
    initialColor,
    initialStartMinutes ?? '',
    initialRemindBeforeMinutes,
  ].join('|');

  useKeyboardInset();

  const handleClose = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setTimeout(onClose, 10);
  }, [onClose]);

  const handleSubmit = useCallback(
    (value: TaskFormSubmitValue) => {
      onSubmit(
        value.title,
        value.duration,
        value.repeat,
        value.repeatCount,
        value.color,
        value.startMinutes,
        value.remindBeforeMinutes,
      );
    },
    [onSubmit],
  );

  const submitButton = (
    <button
      type="button"
      onClick={() => formRef.current?.requestSubmit()}
      className={cn(
        'flex items-center gap-2 rounded-xl font-bold text-[15px] shadow-lg transition-all hover:brightness-110 active:scale-[0.94] disabled:opacity-40 disabled:shadow-none',
        isDesktop ? 'h-10 px-6' : 'h-10 px-5 disabled:active:scale-100',
        mode === 'create'
          ? isDesktop
            ? 'bg-[var(--ink)] text-[var(--bg)]'
            : 'bg-[var(--ink)] text-[var(--bg)] shadow-[var(--ink)]/20'
          : isDesktop
            ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
            : 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--accent)]/30',
      )}
      disabled={!canSubmit}
    >
      {mode === 'create' ? 'Создать' : 'Сохранить'}
    </button>
  );

  return (
    <BottomSheet
      ariaLabelledby="task-sheet-title"
      bodyClassName="min-h-0"
      contentClassName={cn(isDesktop ? 'max-w-3xl' : 'max-w-lg')}
      enableDesktopModalAnimation
      header={
        <ModalHeader
          action={submitButton}
          className={cn('items-center', !isDesktop && 'px-6')}
          closeClassName={cn(
            'rounded-xl border border-[var(--border)]/40 bg-[var(--surface-2)]/60 active:scale-[0.90]',
            !isDesktop && '-ml-2',
          )}
          closePosition="start"
          onClose={handleClose}
          title={mode === 'create' ? 'Новая задача' : 'Редактирование задачи'}
          titleClassName="sr-only"
          titleId="task-sheet-title"
        />
      }
      headerClassName={cn(
        !isDesktop &&
          'cursor-grab active:cursor-grabbing touch-none [touch-action:none]',
      )}
      isDesktop={isDesktop}
      onClose={handleClose}
      onOpenComplete={() => {
        if (mode === 'create') {
          requestAnimationFrame(() => {
            setTimeout(() => {
              titleRef.current?.focus({ preventScroll: true });
            }, 50);
          });
        }
      }}
    >
      <TaskForm
        key={formKey}
        ref={formRef}
        mode={mode}
        initialValue={{
          title: initialTitle,
          duration: initialDuration,
          repeat: initialRepeat,
          repeatCount: initialRepeatCount,
          color: initialColor,
          startMinutes: initialStartMinutes,
          remindBeforeMinutes: initialRemindBeforeMinutes,
        }}
        isDesktop={isDesktop}
        onCanSubmitChange={setCanSubmit}
        onSubmit={handleSubmit}
        taskDate={taskDate}
        titleRef={titleRef}
        className={cn(
          'h-full min-h-0',
          isDesktop
            ? 'p-8 pt-0'
            : 'px-0 pt-0 pb-[max(env(safe-area-inset-bottom),32px,var(--keyboard-height,0px))]',
        )}
      />
    </BottomSheet>
  );
}
