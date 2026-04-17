import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/app/lib/cn';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  children: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--ink)] text-[var(--bg)] hover:brightness-110 active:brightness-95',
  accent:
    'bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110 active:brightness-95',
  secondary:
    'bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:border-[var(--ink)]/15 hover:bg-[var(--surface)]/95 active:bg-[var(--surface)]/90',
  ghost:
    'bg-transparent text-[var(--ink)] hover:bg-[var(--surface)] active:bg-[var(--surface)]/90',
  danger:
    'bg-[var(--danger)] text-white hover:brightness-105 active:brightness-95',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-10 rounded-2xl px-4 text-[14px]',
  md: 'min-h-11 rounded-[20px] px-5 text-[15px]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled = false,
      isLoading = false,
      loadingText = 'Сохранение…',
      size = 'md',
      type = 'button',
      variant = 'primary',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex w-fit touch-manipulation items-center justify-center gap-2 font-semibold shadow-[var(--shadow-card)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        disabled={isDisabled}
        data-loading={isLoading ? 'true' : undefined}
        {...props}
      >
        {isLoading ? (
          <span role="status" aria-live="polite">
            {loadingText}
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
