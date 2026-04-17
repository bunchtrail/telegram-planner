'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/app/lib/cn';
import IconButton from './IconButton';

type ModalHeaderProps = {
  title: ReactNode;
  onClose: () => void;
  action?: ReactNode;
  closeClassName?: string;
  closeIcon?: ReactNode;
  closePosition?: 'start' | 'end';
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  meta?: ReactNode;
  titleAs?: 'h1' | 'h2' | 'h3';
  titleClassName?: string;
  titleId?: string;
};

export default function ModalHeader({
  action,
  className,
  closeClassName,
  closeIcon,
  closePosition = 'end',
  description,
  descriptionClassName,
  meta,
  onClose,
  title,
  titleAs = 'h2',
  titleClassName,
  titleId,
}: ModalHeaderProps) {
  const TitleTag = titleAs;

  const closeButton = (
    <IconButton
      className={cn(
        'h-10 w-10 rounded-xl bg-[var(--surface-2)]/60 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] active:scale-[0.95]',
        closeClassName,
      )}
      icon={closeIcon ?? <X size={20} strokeWidth={2.5} />}
      label="Закрыть"
      onClick={onClose}
      variant="ghost"
    />
  );

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {closePosition === 'start' ? closeButton : null}

      <div className="min-w-0 flex-1">
        <TitleTag
          id={titleId}
          className={cn(
            'font-[var(--font-display)] font-bold leading-tight tracking-tight text-[var(--ink)]',
            titleClassName,
          )}
        >
          {title}
        </TitleTag>

        {description ? (
          <div
            className={cn(
              'mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]',
              descriptionClassName,
            )}
          >
            {description}
          </div>
        ) : null}

        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}

      {closePosition === 'end' ? closeButton : null}
    </div>
  );
}
