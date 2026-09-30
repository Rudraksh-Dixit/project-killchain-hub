import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  layoutId = 'tabs',
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId?: string;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex items-center gap-0.5 border-b border-line', className)}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative px-3.5 py-2.5 text-[13px] font-medium transition-colors duration-150',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'rounded-sm px-1 py-px font-mono text-[10px]',
                    active ? 'bg-accent/15 text-accent' : 'bg-surface2 text-ink-3',
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
            {active && (
              <motion.span
                layoutId={`${layoutId}-indicator`}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
