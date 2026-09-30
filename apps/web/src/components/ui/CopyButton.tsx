import { Check, Copy } from 'lucide-react';
import { useCopy } from '../../hooks/useCopy';
import { Button } from './Button';
import { cn } from '../../lib/cn';

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  showText = false,
  id,
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  showText?: boolean;
  id?: string;
  className?: string;
}) {
  const { copied, copy } = useCopy();
  const done = copied === (id ?? value);

  if (showText) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => copy(value, id)}
        className={className}
        aria-label={done ? copiedLabel : label}
        icon={done ? <Check className="text-success" /> : <Copy />}
      >
        {done ? copiedLabel : label}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => copy(value, id)}
      className={cn(className)}
      aria-label={done ? copiedLabel : label}
      title={done ? copiedLabel : label}
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-ink-3" />}
    </Button>
  );
}
