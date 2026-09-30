import { describe, expect, it } from 'vitest';
import { parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('parses headings with capped levels', () => {
    const blocks = parseMarkdown('# One\n###### Six');
    expect(blocks).toEqual([
      { type: 'heading', level: 1, text: 'One' },
      { type: 'heading', level: 4, text: 'Six' },
    ]);
  });

  it('parses a fenced code block with language', () => {
    const blocks = parseMarkdown('```sigma\ndetection:\n  condition: selection\n```');
    expect(blocks).toEqual([
      { type: 'code', language: 'sigma', code: 'detection:\n  condition: selection' },
    ]);
  });

  it('defaults fence language to text', () => {
    expect(parseMarkdown('```\nhello\n```')).toEqual([
      { type: 'code', language: 'text', code: 'hello' },
    ]);
  });

  it('parses unordered and ordered lists', () => {
    const blocks = parseMarkdown('- alpha\n- beta\n\n1. one\n2. two');
    expect(blocks).toEqual([
      { type: 'list', ordered: false, items: ['alpha', 'beta'] },
      { type: 'list', ordered: true, items: ['one', 'two'] },
    ]);
  });

  it('parses quotes, rules and tables', () => {
    const blocks = parseMarkdown('> quoted line\n\n---\n\n| a | b |\n| --- | --- |\n| 1 | 2 |');
    expect(blocks).toEqual([
      { type: 'quote', text: 'quoted line' },
      { type: 'hr' },
      { type: 'table', headers: ['a', 'b'], rows: [['1', '2']] },
    ]);
  });

  it('joins consecutive lines into one paragraph', () => {
    const blocks = parseMarkdown('line one\nline two');
    expect(blocks).toEqual([{ type: 'paragraph', text: 'line one line two' }]);
  });

  it('handles CRLF input', () => {
    const blocks = parseMarkdown('# Title\r\n\r\nbody');
    expect(blocks[0]).toEqual({ type: 'heading', level: 1, text: 'Title' });
    expect(blocks[1]).toEqual({ type: 'paragraph', text: 'body' });
  });
});
