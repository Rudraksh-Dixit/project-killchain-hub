import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

export interface FacetOption {
  value: string;
  count: number;
}

export function FacetSection({
  title,
  options,
  active,
  onSelect,
  max = 8,
}: {
  title: string;
  options: FacetOption[];
  active: string | null;
  onSelect: (value: string | null) => void;
  max?: number;
}) {
  if (options.length === 0) return null;

  const visible = active && !options.slice(0, max).some((o) => o.value === active)
    ? [...options.filter((o) => o.value === active), ...options.filter((o) => o.value !== active)].slice(0, max)
    : options.slice(0, max);

  return (
    <div className="border-b border-line px-3 py-3 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</span>
        {active && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-label={`Clear ${title} filter`}
            className="rounded-sm p-0.5 text-ink-3 transition-colors hover:bg-surface2 hover:text-ink"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <ul className="space-y-0.5">
        {visible.map((option) => {
          const isActive = option.value === active;
          return (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => onSelect(isActive ? null : option.value)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
                  isActive
                    ? 'bg-accent/10 font-medium text-ink'
                    : 'text-ink-2 hover:bg-surface2 hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    isActive ? 'bg-accent' : 'bg-line-strong',
                  )}
                />
                <span className="min-w-0 flex-1 truncate capitalize">{option.value}</span>
                <span className="shrink-0 font-mono text-[11px] text-ink-3">{option.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FacetPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface', className)}>
      {children}
    </div>
  );
}
