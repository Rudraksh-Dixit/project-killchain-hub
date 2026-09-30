import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full',
        'bg-accent/12 font-medium text-accent ring-1 ring-inset ring-accent/25',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
