import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface2 text-ink-2 border-line',
  accent: 'bg-accent/12 text-accent border-accent/30',
  success: 'bg-success/12 text-success border-success/30',
  warning: 'bg-warning/12 text-warning border-warning/30',
  danger: 'bg-danger/12 text-danger border-danger/30',
  critical: 'bg-critical/12 text-critical border-critical/30',
  high: 'bg-high/12 text-high border-high/30',
  medium: 'bg-medium/12 text-medium border-medium/30',
  low: 'bg-low/12 text-low border-low/30',
  info: 'bg-info/12 text-info border-info/30',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
  dot?: boolean;
}

export function Badge({ tone = 'neutral', icon, dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5',
        'text-[11px] font-medium leading-5 tracking-[0.02em] whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon && <span className="[&>svg]:h-3 [&>svg]:w-3">{icon}</span>}
      {children}
    </span>
  );
}

export function Tag({ children, className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm bg-surface2 px-1.5 py-0.5',
        'font-mono text-[11px] leading-4 text-ink-2 border border-transparent',
        'transition-colors hover:border-line-strong hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
