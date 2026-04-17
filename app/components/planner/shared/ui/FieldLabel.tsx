import { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/app/lib/cn';

export type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  hint?: string;
};

const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ children, className, hint, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'mb-2 flex items-center justify-between gap-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]',
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {hint ? <span className="text-[11px] tracking-[0.08em]">{hint}</span> : null}
      </label>
    );
  },
);

FieldLabel.displayName = 'FieldLabel';

export default FieldLabel;
