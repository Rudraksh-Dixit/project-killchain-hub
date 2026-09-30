export type CsvCell = string | number | null | undefined;

/**
 * RFC 4180-ish CSV parser. Handles quoted fields, escaped quotes and
 * newlines inside quoted values. Returns an array of rows.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const input = text.replace(/^\uFEFF/, '');

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** Serialises rows to CSV with CRLF line endings and quote escaping. */
export function toCsv(rows: CsvCell[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? '' : String(cell);
          return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\r\n');
}

/** Converts the first CSV row into headers and returns objects for the rest. */
export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = (row[index] ?? '').trim();
    });
    return obj;
  });
}

/** Serialises objects to CSV using the given header order. */
export function objectsToCsv(items: Record<string, unknown>[], headers: string[]): string {
  const rows: CsvCell[][] = [headers];
  for (const item of items) {
    rows.push(
      headers.map((header) => {
        const value = item[header];
        if (Array.isArray(value)) return value.join('|');
        if (value === null || value === undefined) return '';
        return String(value);
      }),
    );
  }
  return toCsv(rows);
}
