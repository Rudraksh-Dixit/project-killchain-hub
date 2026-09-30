import { useMemo, type ReactNode } from 'react';
import { cn } from './cn';
import { highlightCode } from './highlight';

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'hr' }
  | { type: 'table'; headers: string[]; rows: string[][] };

function splitRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

const LIST_START = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^```+\s*(\w*)\s*$/;
const HR = /^(-{3,}|\*{3,}|_{3,})\s*$/;

export function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const isBlockStart = (line: string): boolean =>
    HEADING.test(line) || FENCE.test(line) || HR.test(line) ||
    LIST_START.test(line) || /^\s*>/.test(line) || line.trim().startsWith('|');

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const fence = line.match(FENCE);
    if (fence) {
      const language = (fence[1] || 'text').toLowerCase();
      const buffer: string[] = [];
      i += 1;
      while (i < lines.length && !/^```+\s*$/.test(lines[i])) {
        buffer.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', language, code: buffer.join('\n') });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: Math.min(heading[1].length, 4),
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buffer: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buffer.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', text: buffer.join(' ').trim() });
      continue;
    }

    const listMatch = line.match(LIST_START);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[2]);
      const items: string[] = [];
      while (i < lines.length) {
        const match = lines[i].match(LIST_START);
        if (!match) break;
        items.push(match[3]);
        i += 1;
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !LIST_START.test(lines[i]) &&
          !lines[i].trim().startsWith('|')
        ) {
          items[items.length - 1] = `${items[items.length - 1]} ${lines[i].trim()}`;
          i += 1;
        }
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const buffer: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      buffer.push(lines[i].trim());
      i += 1;
    }
    if (buffer.length > 0) {
      blocks.push({ type: 'paragraph', text: buffer.join(' ') });
    } else {
      i += 1;
    }
  }

  return blocks;
}

const INLINE = /(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)/g;

function safeHref(href: string): string | null {
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(href)) return href;
  return null;
}

export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const [full, , code, , linkText, linkHref, , bold, , italic, , italicUnderscore] = match;

    if (code) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[13px] text-ink"
        >
          {code}
        </code>,
      );
    } else if (linkText && linkHref) {
      const href = safeHref(linkHref);
      nodes.push(
        href ? (
          <a
            key={key++}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
          >
            {renderInline(linkText)}
          </a>
        ) : (
          <span key={key++}>{linkText}</span>
        ),
      );
    } else if (bold) {
      nodes.push(<strong key={key++}>{renderInline(bold)}</strong>);
    } else if (italic ?? italicUnderscore) {
      nodes.push(<em key={key++}>{renderInline(italic ?? italicUnderscore)}</em>);
    } else {
      nodes.push(full);
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function renderBlock(block: Block, index: number): ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = (`h${block.level}` as unknown) as 'h2';
      return (
        <Tag key={index} id={headingId(block.text)}>
          {renderInline(block.text)}
        </Tag>
      );
    }
    case 'paragraph':
      return <p key={index}>{renderInline(block.text)}</p>;
    case 'code':
      return (
        <pre key={index}>
          <code>{highlightCode(block.code, block.language)}</code>
        </pre>
      );
    case 'list': {
      const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>);
      return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
    }
    case 'quote':
      return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
    case 'hr':
      return <hr key={index} />;
    case 'table':
      return (
        <table key={index}>
          <thead>
            <tr>
              {block.headers.map((header, headerIndex) => (
                <th key={headerIndex}>{renderInline(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    default:
      return null;
  }
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);
  return <div className={cn('pkc-prose', className)}>{blocks.map(renderBlock)}</div>;
}
