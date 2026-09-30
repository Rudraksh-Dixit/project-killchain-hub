import { describe, expect, it } from 'vitest';
import {
  cvssSeverity,
  formatDate,
  formatDateTime,
  initials,
  monthLabel,
  relativeTime,
  severityRank,
  titleCase,
  truncate,
} from './format';

describe('formatDate', () => {
  it('handles null, undefined and invalid input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('formats ISO timestamps', () => {
    expect(formatDate('2026-03-09T12:00:00Z')).toContain('Mar');
    expect(formatDate('2026-03-09T12:00:00Z')).toContain('2026');
  });
});

describe('formatDateTime', () => {
  it('appends a 24h clock time', () => {
    expect(formatDateTime('2026-01-02T09:05:00Z')).toMatch(/Jan 2, 2026 · \d{2}:\d{2}/);
    expect(formatDateTime('bad')).toBe('—');
  });
});

describe('relativeTime', () => {
  it('returns "just now" under a minute', () => {
    expect(relativeTime(new Date(Date.now() - 5_000).toISOString())).toBe('just now');
  });

  it('returns human buckets into the past and future', () => {
    expect(relativeTime(new Date(Date.now() - 2 * 3_600_000).toISOString())).toBe('2h ago');
    expect(relativeTime(new Date(Date.now() + 90 * 60_000).toISOString())).toBe('2h from now');
    expect(relativeTime(null)).toBe('—');
  });
});

describe('monthLabel', () => {
  it('renders short labels', () => {
    expect(monthLabel('2026-07')).toBe("Jul '26");
    expect(monthLabel('bogus')).toBe('bogus');
  });
});

describe('titleCase', () => {
  it('splits on dashes, underscores and spaces', () => {
    expect(titleCase('command_and-control')).toBe('Command And Control');
    expect(titleCase('first-seen')).toBe('First Seen');
  });
});

describe('truncate', () => {
  it('keeps short strings and elides long ones', () => {
    expect(truncate('abc', 10)).toBe('abc');
    expect(truncate('abcdef', 4)).toBe('abc…');
  });
});

describe('severityRank / cvssSeverity', () => {
  it('orders severities critical → info', () => {
    expect(severityRank('critical')).toBeLessThan(severityRank('high'));
    expect(severityRank('medium')).toBeLessThan(severityRank('low'));
    expect(severityRank('unknown')).toBe(4);
  });

  it('maps CVSS scores to severities', () => {
    expect(cvssSeverity(9.8)).toBe('critical');
    expect(cvssSeverity(7.5)).toBe('high');
    expect(cvssSeverity(5.0)).toBe('medium');
    expect(cvssSeverity(2.1)).toBe('low');
    expect(cvssSeverity(0)).toBe('info');
  });
});

describe('initials', () => {
  it('takes up to two words', () => {
    expect(initials('Avery Chen')).toBe('AC');
    expect(initials('  sam   okafor  ')).toBe('SO');
  });
});
