import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface TooltipProps {
  label: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
  className?: string;
}

const SIDE = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({ label, side = 'top', children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);

  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{ className?: string }>, {
        className: cn('tooltip-trigger', (children as ReactElement<{ className?: string }>).props.className),
      })
    : children;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {trigger}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-line',
          'bg-surface3 px-2 py-1 text-[11px] font-medium text-ink shadow-pop',
          'transition-all duration-150 ease-smooth',
          SIDE[side],
          open ? 'scale-100 opacity-100 delay-300' : 'scale-95 opacity-0 delay-0',
          className,
        )}
      >
        {label}
      </span>
    </span>
  );
}
