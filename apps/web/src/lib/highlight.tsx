import type { ReactNode } from 'react';

const KEYWORDS: Record<string, string[]> = {
  kql: [
    'where', 'project', 'project-away', 'extend', 'summarize', 'by', 'sort', 'order', 'join',
    'let', 'union', 'distinct', 'take', 'top', 'count', 'bin', 'ago', 'make_set', 'make_list',
    'between', 'in', 'has', 'has_any', 'contains', 'startswith', 'endswith', 'matches', 'and',
    'or', 'not', 'on', 'kind', 'leftouter', 'leftanti', 'leftsemi', 'inner', 'materialize',
    'parse', 'extract', 'arg_max', 'arg_min', 'dcount', 'strcat', 'iff', 'if', 'tostring',
    'toint', 'datatable', 'between', 'asc', 'desc', 'true', 'false',
  ],
  spl: [
    'stats', 'eval', 'table', 'fields', 'where', 'rex', 'sort', 'by', 'join', 'dedup',
    'transaction', 'search', 'foreach', 'convert', 'mvexpand', 'lookup', 'format',
    'makeresults', 'append', 'union', 'top', 'head', 'tail', 'timechart', 'bin', 'dc',
    'values', 'count', 'avg', 'sum', 'max', 'min', 'substr', 'replace', 'match', 'split',
    'not', 'and', 'or', 'in', 'as', 'with', 'where', 'if', 'coalesce', 'null',
  ],
  sigma: [
    'title', 'id', 'description', 'status', 'references', 'author', 'date', 'logsource',
    'detection', 'condition', 'falsepositives', 'level', 'tags', 'selection', 'filter',
    'and', 'or', 'not', 'all', 'of', 'them', 'product', 'category', 'service',
  ],
  yara: [
    'rule', 'meta', 'strings', 'condition', 'ascii', 'wide', 'nocase', 'fullword', 'xor',
    'any', 'all', 'of', 'them', 'entrypoint', 'filesize', 'contains', 'startswith',
    'endswith', 'at', 'in', 'true', 'false',
  ],
  powershell: [
    'param', 'function', 'foreach', 'if', 'else', 'elseif', 'return', 'begin', 'process',
    'end', 'filter', 'class', 'new-object', 'get-winevent', 'where-object', 'select-object',
    'sort-object', 'format-table', 'foreach-object', 'write-output', 'try', 'catch', 'finally',
    'throw', '$true', '$false', '$null',
  ],
  python: [
    'def', 'class', 'return', 'import', 'from', 'for', 'in', 'if', 'elif', 'else', 'while',
    'with', 'as', 'try', 'except', 'finally', 'raise', 'lambda', 'print', 'self', 'None',
    'True', 'False', 'and', 'or', 'not', 'pass', 'yield', 'async', 'await',
  ],
  text: [],
  generic: [],
};

KEYWORDS.generic = KEYWORDS.kql;

const TOKEN_PATTERN =
  /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$-]*)/g;

/**
 * Lightweight, dependency-free syntax highlighting for KQL, SPL, Sigma,
 * YARA, PowerShell, Python and plain text.
 */
export function highlightCode(code: string, language: string): ReactNode[] {
  const keywords = new Set((KEYWORDS[language] ?? KEYWORDS.generic).map((k) => k.toLowerCase()));
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(code)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(code.slice(lastIndex, match.index));
    }

    const [full, comment, str, num, word] = match;

    if (comment) {
      nodes.push(
        <span key={key++} className="tok-comment">
          {full}
        </span>,
      );
    } else if (str) {
      nodes.push(
        <span key={key++} className="tok-string">
          {full}
        </span>,
      );
    } else if (num) {
      nodes.push(
        <span key={key++} className="tok-number">
          {full}
        </span>,
      );
    } else if (word) {
      const after = code.slice(match.index + full.length);
      if (keywords.has(word.toLowerCase())) {
        nodes.push(
          <span key={key++} className="tok-keyword">
            {full}
          </span>,
        );
      } else if (/^\s*\(/.test(after)) {
        nodes.push(
          <span key={key++} className="tok-func">
            {full}
          </span>,
        );
      } else {
        nodes.push(full);
      }
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < code.length) nodes.push(code.slice(lastIndex));
  return nodes;
}
