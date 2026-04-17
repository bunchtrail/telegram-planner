import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/app/lib/cn';

type IconButtonVariant = 'solid' | 'soft' | 'ghost';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  variant?: IconButtonVariant;
};

const variantClasses: Record<IconButtonVariant, string> = {
  solid:
    'bg-[var(--ink)] text-[var(--bg)] hover:brightness-110 active:brightness-95',
  soft:
    'bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:border-[var(--ink)]/15 hover:bg-[var(--surface)]/95',
  ghost:
    'bg-transparent text-[var(--ink)] hover:bg-[var(--surface)] active:bg-[var(--surface)]/90',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, icon, label, type = 'button', variant = 'ghost', ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={cn(
          'inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        <span aria-hidden="true" className="flex items-center justify-center">
          {icon}
        </span>
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

export default IconButton;
