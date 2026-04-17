'use client';

import {
  type HTMLMotionProps,
  motion,
  useReducedMotion,
} from 'framer-motion';
import { useEffect, useRef, type PointerEventHandler, type ReactNode } from 'react';
import { cn } from '@/app/lib/cn';

type MotionDivProps = Omit<
  HTMLMotionProps<'div'>,
  'aria-labelledby' | 'aria-modal' | 'children' | 'ref' | 'role' | 'tabIndex'
>;

type BottomSheetProps = {
  ariaLabelledby: string;
  backdropClassName?: string;
  backdropMotionProps?: MotionDivProps;
  bodyClassName?: string;
  children: ReactNode;
  contentClassName?: string;
  contentMotionProps?: MotionDivProps;
  header?: ReactNode;
  headerClassName?: string;
  isDesktop?: boolean;
  onClose: () => void;
  onHandlePointerDown?: PointerEventHandler<HTMLDivElement>;
  onRequestClose?: () => void;
  overlay?: ReactNode;
  showDragHandle?: boolean;
  dragHandleClassName?: string;
};

export default function BottomSheet({
  ariaLabelledby,
  backdropClassName,
  backdropMotionProps,
  bodyClassName,
  children,
  contentClassName,
  contentMotionProps,
  dragHandleClassName,
  header,
  headerClassName,
  isDesktop = false,
  onClose,
  onHandlePointerDown,
  onRequestClose,
  overlay,
  showDragHandle = true,
}: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const requestClose = onRequestClose ?? onClose;

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        isDesktop
          ? 'flex items-center justify-center pointer-events-auto py-4 pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))]'
          : 'flex flex-col justify-end pointer-events-none touch-none pl-[max(env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(env(safe-area-inset-right),var(--tg-content-safe-right,0px))]',
      )}
    >
      <motion.div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto',
          backdropClassName,
        )}
        data-testid="dialog-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
        onClick={requestClose}
        {...backdropMotionProps}
      />

      <motion.div
        ref={contentRef}
        aria-labelledby={ariaLabelledby}
        aria-modal="true"
        className={cn(
          'pointer-events-auto relative flex w-full flex-col overflow-hidden bg-[var(--surface)] ring-1 ring-inset ring-[var(--border)] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]',
          isDesktop
            ? 'h-auto max-h-[85vh] rounded-3xl border border-[var(--border)] shadow-2xl'
            : 'mx-auto max-h-[92dvh] rounded-t-[32px]',
          contentClassName,
        )}
        initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
        animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
        exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
        role="dialog"
        tabIndex={-1}
        transition={
          reduceMotion
            ? { duration: 0 }
            : isDesktop
              ? { type: 'spring', damping: 25, stiffness: 300 }
              : { type: 'spring', damping: 32, stiffness: 400, mass: 0.8 }
        }
        {...contentMotionProps}
      >
        {header || (!isDesktop && showDragHandle) ? (
          <div
            className={cn(
              'shrink-0 w-full bg-[var(--surface)] select-none',
              isDesktop ? 'p-6 pb-0' : 'pt-4 pb-2',
              headerClassName,
            )}
            onPointerDown={onHandlePointerDown}
          >
            {!isDesktop && showDragHandle ? (
              <div className="mb-4 flex justify-center">
                <div
                  className={cn(
                    'h-[5px] w-10 rounded-full bg-[var(--muted)]/16',
                    dragHandleClassName,
                  )}
                  data-testid="bottom-sheet-handle"
                />
              </div>
            ) : null}

            {header}
          </div>
        ) : null}

        <div className={cn('flex-1 min-h-0', bodyClassName)}>{children}</div>
        {overlay}
      </motion.div>
    </div>
  );
}
