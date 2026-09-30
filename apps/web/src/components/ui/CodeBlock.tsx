import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { highlightCode } from '../../lib/highlight';
import { CopyButton } from './CopyButton';

export interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  label?: ReactNode;
  showLineNumbers?: boolean;
  copyable?: boolean;
  maxLines?: number;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'text',
  filename,
  label,
  showLineNumbers = false,
  copyable = true,
  maxLines = 14,
  className,
}: CodeBlockProps) {
  const normalized = code.replace(/\n$/, '');
  const lines = normalized.split('\n');
  const collapsible = lines.length > maxLines;
  const [expanded, setExpanded] = useState(false);
  const visible = collapsible && !expanded ? lines.slice(0, maxLines) : lines;

  return (
    <div className={cn('group/code relative overflow-hidden rounded-lg border border-line bg-surface2', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface/60 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-sm bg-accent/12 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
            {label ?? language}
          </span>
          {filename && <span className="truncate font-mono text-[11px] text-ink-3">{filename}</span>}
        </div>
        {copyable && (
          <CopyButton
            value={normalized}
            className="opacity-60 transition-opacity focus-visible:opacity-100 group-hover/code:opacity-100"
          />
        )}
        {!copyable && <span />}
      </div>
      <pre
        className={cn(
          'overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-6',
          collapsible && !expanded && 'max-h-72 overflow-y-hidden',
        )}
      >
        <code>
          {visible.map((line, index) => (
            <div key={index} className="flex">
              {showLineNumbers && (
                <span className="mr-4 w-7 shrink-0 select-none text-right text-ink-3/50">
                  {index + 1}
                </span>
              )}
              <span className="whitespace-pre">{highlightCode(line, language)}</span>
            </div>
          ))}
        </code>
      </pre>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-line bg-surface/70 py-1.5 text-xs text-ink-3 transition-colors hover:bg-surface2 hover:text-ink"
        >
          {expanded ? 'Collapse' : `Show all ${lines.length} lines`}
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}
