export function parseJsonArray(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(String);
  if (typeof input !== 'string' || input.trim() === '') return [];
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* fall through to pipe/comma split */
  }
  return input
    .split(/[|,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function toJsonArray(value: unknown): string {
  return JSON.stringify(parseJsonArray(value));
}

export function parseJsonObject<T>(input: unknown, fallback: T): T {
  if (input && typeof input === 'object') return input as T;
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Normalises indicator values so duplicate detection is deterministic. */
export function normalizeIocValue(type: string, value: string): string {
  const trimmed = value.trim();
  if (type === 'domain' || type === 'hash' || type === 'url') return trimmed.toLowerCase();
  return trimmed;
}

/** Parses flexible date input (YYYY-MM-DD or ISO) into an ISO string. */
export function toIsoDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

export function monthKey(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
