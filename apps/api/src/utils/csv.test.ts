import { describe, expect, it } from 'vitest';
import { csvToObjects, objectsToCsv, parseCsv, toCsv } from './csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b\n1,2\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('handles quoted fields with commas and newlines', () => {
    const input = 'name,notes\r\n"Smith, Jane","line1\nline2"\r\n';
    expect(parseCsv(input)).toEqual([
      ['name', 'notes'],
      ['Smith, Jane', 'line1\nline2'],
    ]);
  });

  it('handles escaped quotes', () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([['a'], ['say "hi"']]);
  });

  it('drops fully empty rows', () => {
    expect(parseCsv('a,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('toCsv / objectsToCsv', () => {
  it('quotes values containing commas', () => {
    expect(toCsv([['a', 'b,c']])).toBe('a,"b,c"');
  });

  it('escapes double quotes', () => {
    expect(toCsv([['say "hi"']])).toBe('"say ""hi"""');
  });

  it('serialises arrays as pipe-joined values', () => {
    const csv = objectsToCsv([{ id: '1', tags: ['a', 'b'] }], ['id', 'tags']);
    expect(csv).toBe('id,tags\r\n1,a|b');
  });
});

describe('csvToObjects', () => {
  it('maps headers to values', () => {
    const rows = csvToObjects('Type,Value,First Seen\nip,192.0.2.1,2026-01-01');
    expect(rows).toEqual([{ type: 'ip', value: '192.0.2.1', first_seen: '2026-01-01' }]);
  });

  it('returns an empty array when only headers exist', () => {
    expect(csvToObjects('a,b')).toEqual([]);
  });
});
