'use client';

import {
  type HTMLMotionProps,
  motion,
  useReducedMotion,
} from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/app/lib/cn';

type MotionDivProps = Omit<
  HTMLMotionProps<'div'>,
  'aria-labelledby' | 'aria-modal' | 'children' | 'ref' | 'role' | 'tabIndex'
>;

type DialogProps = {
  ariaLabelledby: string;
  children: ReactNode;
  contentClassName?: string;
  contentMotionProps?: MotionDivProps;
  onClose: () => void;
  onRequestClose?: () => void;
  backdropClassName?: string;
  backdropMotionProps?: MotionDivProps;
};

export default function Dialog({
  ariaLabelledby,
  backdropClassName,
  backdropMotionProps,
  children,
  contentClassName,
  contentMotionProps,
  onClose,
  onRequestClose,
}: DialogProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center py-4 pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))] pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))]">
      <motion.div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm',
          backdropClassName,
        )}
        data-testid="dialog-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
        onClick={requestClose}
        {...backdropMotionProps}
      />

      <motion.div
        ref={contentRef}
        aria-labelledby={ariaLabelledby}
        aria-modal="true"
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[32px] bg-[var(--surface)] shadow-2xl ring-1 ring-[var(--border)]',
          contentClassName,
        )}
        initial={{ scale: reduceMotion ? 1 : 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: reduceMotion ? 1 : 0.95, opacity: 0, y: 10 }}
        role="dialog"
        tabIndex={-1}
        transition={{ type: 'spring', duration: reduceMotion ? 0 : 0.4, bounce: 0.3 }}
        {...contentMotionProps}
      >
        {children}
      </motion.div>
    </div>
  );
}
