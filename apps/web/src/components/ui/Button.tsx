import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-contrast border border-transparent hover:bg-accent-hover shadow-card',
  secondary:
    'bg-surface2 text-ink border border-line hover:bg-surface3 hover:border-line-strong',
  ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-surface2 hover:text-ink',
  danger: 'bg-danger text-white border border-transparent hover:opacity-90 shadow-card',
  link: 'bg-transparent text-accent border border-transparent hover:underline underline-offset-2 px-0',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9 p-0 justify-center',
  'icon-sm': 'h-8 w-8 p-0 justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, icon, iconRight, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center rounded-md font-medium',
        'transition-all duration-150 ease-smooth',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:translate-y-px',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      )}
      {children}
      {iconRight && !loading && (
        <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{iconRight}</span>
      )}
    </button>
  );
});
