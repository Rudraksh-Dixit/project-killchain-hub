import { Link } from 'react-router-dom';
import { Crosshair } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Logo({
  to = '/',
  compact = false,
  className,
}: {
  to?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="KillChain Hub — dashboard"
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/12 text-accent transition-colors group-hover:border-accent/60">
        <Crosshair className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
            KillChain
          </span>
          <span className="rounded-sm bg-surface2 px-1 py-px font-mono text-[9px] font-medium uppercase tracking-wider text-ink-3 transition-colors group-hover:text-ink-2">
            hub
          </span>
        </span>
      )}
    </Link>
  );
}
