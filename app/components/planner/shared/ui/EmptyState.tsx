import type { ReactNode } from 'react';
import { cn } from '@/app/lib/cn';

export type EmptyStateProps = {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  className?: string;
  headingAs?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
};

export default function EmptyState({
  action,
  className,
  description,
  headingAs = 'h2',
  title,
}: EmptyStateProps) {
  const HeadingTag = headingAs;

  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--surface)]/70 px-6 py-8 text-center shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <HeadingTag className="text-lg font-semibold text-[var(--ink)]">
        {title}
      </HeadingTag>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
