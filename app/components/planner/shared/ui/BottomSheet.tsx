'use client';

import {
  motion,
  useReducedMotion,
  useDragControls,
} from 'framer-motion';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/app/lib/cn';
import useFrameFocusScope from './useFrameFocusScope';

type BottomSheetProps = {
  ariaLabelledby: string;
  backdropClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
  contentClassName?: string;
  disableDragDismiss?: boolean;
  enableDesktopModalAnimation?: boolean;
  header?: ReactNode;
  headerClassName?: string;
  isDesktop?: boolean;
  onFrameAnimationStart?: () => void;
  onClose: () => void;
  onOpenComplete?: () => void;
  onRequestClose?: () => void;
  overlay?: ReactNode;
  showDragHandle?: boolean;
  dragHandleClassName?: string;
};

export default function BottomSheet({
  ariaLabelledby,
  backdropClassName,
  bodyClassName,
  children,
  contentClassName,
  disableDragDismiss = false,
  dragHandleClassName,
  enableDesktopModalAnimation = true,
  header,
  headerClassName,
  isDesktop = false,
  onFrameAnimationStart,
  onClose,
  onOpenComplete,
  onRequestClose,
  overlay,
  showDragHandle = true,
}: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const requestClose = onRequestClose ?? onClose;
  const [isSettled, setIsSettled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragDismissEnabled = !isDesktop && !disableDragDismiss;
  const dragControls = useDragControls();

  useFrameFocusScope(contentRef);

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
        drag={dragDismissEnabled ? 'y' : false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={reduceMotion ? 0 : 0.05}
        dragListener={false}
        exit={
          isDesktop
            ? enableDesktopModalAnimation
              ? { opacity: 0, scale: 0.95 }
              : undefined
            : { y: '100%' }
        }
        initial={
          isDesktop
            ? enableDesktopModalAnimation
              ? { opacity: 0, scale: 0.95 }
              : undefined
            : { y: '100%' }
        }
        animate={
          isDesktop
            ? enableDesktopModalAnimation
              ? { opacity: 1, scale: 1 }
              : undefined
            : { y: 0 }
        }
        onAnimationStart={() => {
          setIsSettled(false);
          onFrameAnimationStart?.();
        }}
        onAnimationComplete={(definition) => {
          const isOpening =
            definition === 'visible' ||
            (typeof definition === 'object' &&
              definition !== null &&
              !Array.isArray(definition) &&
              'y' in definition &&
              (definition as { y?: number | string }).y === 0) ||
            (isDesktop && definition === undefined);

          if (isOpening || (isDesktop && !isSettled)) {
            setIsSettled(true);
            onOpenComplete?.();
          }
        }}
        onDragEnd={(_event, info) => {
          setIsDragging(false);

          if (!dragDismissEnabled) {
            return;
          }

          const draggingDown = info.offset.y > 0;
          const fastDrag = info.velocity.y > 300;
          const farDrag = info.offset.y > 100;

          if (draggingDown && (fastDrag || farDrag)) {
            requestClose();
          }
        }}
        onDragStart={() => setIsDragging(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            requestClose();
          }
        }}
        role="dialog"
        tabIndex={-1}
        transition={
          reduceMotion
            ? { duration: 0 }
            : isDesktop
              ? { type: 'spring', damping: 25, stiffness: 300 }
              : { type: 'spring', damping: 32, stiffness: 400, mass: 0.8 }
        }
        transformTemplate={(_transforms, generatedTransform) =>
          isSettled && !isDragging && !isDesktop ? 'none' : generatedTransform
        }
      >
        {header || (!isDesktop && showDragHandle) ? (
          <div
            className={cn(
              'shrink-0 w-full bg-[var(--surface)] select-none',
              isDesktop ? 'p-6 pb-0' : 'pt-4 pb-2',
              headerClassName,
            )}
            onPointerDown={(event) => {
              if (dragDismissEnabled) {
                dragControls.start(event);
              }
            }}
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
