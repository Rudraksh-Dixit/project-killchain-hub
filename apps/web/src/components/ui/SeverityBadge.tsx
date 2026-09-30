import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Minus, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge, type BadgeTone } from './Badge';
import type { Severity } from '../../lib/types';

const TONE: Record<Severity, BadgeTone> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info',
};

function severityIcon(severity: Severity) {
  switch (severity) {
    case 'critical':
      return AlertTriangle;
    case 'high':
      return ArrowUp;
    case 'medium':
      return Minus;
    case 'low':
      return ArrowDown;
    default:
      return ShieldCheck;
  }
}

export function SeverityBadge({
  severity,
  className,
  withIcon = true,
}: {
  severity: Severity;
  className?: string;
  withIcon?: boolean;
}) {
  const Icon = severityIcon(severity);
  return (
    <Badge tone={TONE[severity]} icon={withIcon ? <Icon /> : undefined} className={cn('uppercase', className)}>
      {severity}
    </Badge>
  );
}

export function StatusDot({ tone }: { tone: 'online' | 'warn' | 'offline' }) {
  const color = tone === 'online' ? 'bg-success' : tone === 'warn' ? 'bg-warning' : 'bg-danger';
  return <span className={cn('inline-block h-2 w-2 rounded-full', color)} />;
}

export function ConfidenceBar({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const level = confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1" title={`Confidence: ${confidence}`}>
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={cn(
            'h-3 w-1 rounded-full',
            step <= level ? 'bg-accent' : 'bg-line-strong',
          )}
        />
      ))}
      <span className="ml-1 text-[11px] capitalize text-ink-3">{confidence}</span>
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const tone =
    difficulty === 'advanced' ? 'critical' : difficulty === 'intermediate' ? 'medium' : 'low';
  return (
    <Badge tone={tone as BadgeTone} icon={<ChevronDown className="rotate-[-90deg]" />}>
      {difficulty}
    </Badge>
  );
}
