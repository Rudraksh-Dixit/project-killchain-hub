import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Kbd({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-[20px] items-center justify-center rounded-sm',
        'border border-line bg-surface2 px-1.5 py-0.5',
        'font-mono text-[10px] font-medium leading-4 text-ink-3',
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
