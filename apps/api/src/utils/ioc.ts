import { normalizeIocValue, parseJsonArray } from './serialize';

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6 = /^[0-9a-f:]{2,45}$/i;
const DOMAIN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
const URL = /^https?:\/\/[^\s"<>]+$/i;
const HASH = /^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$|^[a-f0-9]{128}$/i;

/** Format guard so obviously broken values never enter the database. */
export function isValidIocValue(type: string, value: string): boolean {
  switch (type) {
    case 'ip':
      return IPV4.test(value) || (value.includes(':') && IPV6.test(value));
    case 'domain':
      return DOMAIN.test(value) && !value.includes(' ');
    case 'url':
      return URL.test(value);
    case 'hash':
      return HASH.test(value);
    default:
      return false;
  }
}

export function hashAlgorithm(value: string): string {
  switch (value.length) {
    case 32:
      return 'MD5';
    case 40:
      return 'SHA-1';
    case 64:
      return 'SHA-256';
    case 128:
      return 'SHA-512';
    default:
      return 'UNKNOWN';
  }
}

/** STIX 2.1 indicator pattern for a given indicator type. */
export function toStixPattern(type: string, value: string): string {
  switch (type) {
    case 'ip':
      return value.includes(':')
        ? `[ipv6-addr:value = '${value}']`
        : `[ipv4-addr:value = '${value}']`;
    case 'domain':
      return `[domain-name:value = '${value}']`;
    case 'url':
      return `[url:value = '${value}']`;
    case 'hash':
      return `[file:hashes.'${hashAlgorithm(value)}' = '${value.toLowerCase()}']`;
    default:
      return `[artifact:payload_bin = '${value}']`;
  }
}

export interface IocInput {
  type: string;
  value: string;
  malwareFamily?: string;
  category?: string;
  severity?: string;
  confidence?: string;
  firstSeen?: string;
  lastSeen?: string;
  tags?: unknown;
  source?: string;
  description?: string;
}

/** Maps loose CSV/JSON keys onto the canonical IOC shape. */
export function coerceIocRecord(record: Record<string, unknown>): IocInput {
  const rec: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    rec[key.toLowerCase().replace(/[\s-]+/g, '_')] = value;
  }

  const str = (keys: string[], fallback = ''): string => {
    for (const key of keys) {
      const value = rec[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return fallback;
  };

  const type = str(['type']).toLowerCase();
  const value = str(['value', 'indicator', 'ioc']);

  return {
    type: type === 'ipv4' || type === 'ipv6' ? 'ip' : type,
    value: normalizeIocValue(type || 'domain', value),
    malwareFamily: str(['malware_family', 'family', 'malware'], 'Unknown'),
    category: str(['category'], 'network').toLowerCase(),
    severity: str(['severity'], 'medium').toLowerCase(),
    confidence: str(['confidence'], 'medium').toLowerCase(),
    firstSeen: str(['first_seen', 'firstseen', 'first_seen_date'], new Date().toISOString()),
    lastSeen: str(['last_seen', 'lastseen', 'last_seen_date'], new Date().toISOString()),
    tags: parseJsonArray(rec['tags'] ?? rec['tag'] ?? ''),
    source: str(['source', 'reference']),
    description: str(['description', 'notes']),
  };
}
