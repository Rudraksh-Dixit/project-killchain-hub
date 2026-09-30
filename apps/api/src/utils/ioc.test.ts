import { describe, expect, it } from 'vitest';
import { coerceIocRecord, hashAlgorithm, isValidIocValue, toStixPattern } from './ioc';

describe('isValidIocValue', () => {
  it('accepts documentation-range IPv4 addresses', () => {
    expect(isValidIocValue('ip', '192.0.2.1')).toBe(true);
    expect(isValidIocValue('ip', '198.51.100.255')).toBe(true);
    expect(isValidIocValue('ip', '203.0.113.77')).toBe(true);
  });

  it('rejects malformed IPs', () => {
    expect(isValidIocValue('ip', '999.1.1.1')).toBe(false);
    expect(isValidIocValue('ip', 'not-an-ip')).toBe(false);
  });

  it('accepts example domains and rejects junk', () => {
    expect(isValidIocValue('domain', 'login.example.com')).toBe(true);
    expect(isValidIocValue('domain', 'no-tld')).toBe(false);
    expect(isValidIocValue('domain', 'has space.com')).toBe(false);
  });

  it('accepts http(s) URLs only', () => {
    expect(isValidIocValue('url', 'https://example.org/path')).toBe(true);
    expect(isValidIocValue('url', 'ftp://example.org')).toBe(false);
  });

  it('accepts md5/sha1/sha256/sha512 hex digests', () => {
    expect(isValidIocValue('hash', 'd41d8cd98f00b204e9800998ecf8427e')).toBe(true);
    expect(isValidIocValue('hash', 'a'.repeat(40))).toBe(true);
    expect(isValidIocValue('hash', 'b'.repeat(64))).toBe(true);
    expect(isValidIocValue('hash', 'c'.repeat(128))).toBe(true);
    expect(isValidIocValue('hash', 'zzzz')).toBe(false);
  });
});

describe('hashAlgorithm', () => {
  it('maps digest lengths to algorithm names', () => {
    expect(hashAlgorithm('a'.repeat(32))).toBe('MD5');
    expect(hashAlgorithm('a'.repeat(40))).toBe('SHA-1');
    expect(hashAlgorithm('a'.repeat(64))).toBe('SHA-256');
    expect(hashAlgorithm('a'.repeat(128))).toBe('SHA-512');
    expect(hashAlgorithm('a'.repeat(5))).toBe('UNKNOWN');
  });
});

describe('toStixPattern', () => {
  it('builds type-aware STIX patterns', () => {
    expect(toStixPattern('ip', '192.0.2.1')).toBe("[ipv4-addr:value = '192.0.2.1']");
    expect(toStixPattern('domain', 'a.example.com')).toBe("[domain-name:value = 'a.example.com']");
    expect(toStixPattern('url', 'https://example.org/')).toBe("[url:value = 'https://example.org/']");
    expect(toStixPattern('hash', 'd'.repeat(64))).toBe(
      `[file:hashes.'SHA-256' = '${'d'.repeat(64)}']`,
    );
  });
});

describe('coerceIocRecord', () => {
  it('normalises snake_case and camelCase keys', () => {
    const record = coerceIocRecord({
      Type: 'IP',
      Value: '192.0.2.9',
      'Malware Family': 'Amadey',
      Severity: 'HIGH',
      first_seen: '2026-01-01',
      tags: 'c2|loader',
    });
    expect(record.type).toBe('ip');
    expect(record.value).toBe('192.0.2.9');
    expect(record.malwareFamily).toBe('Amadey');
    expect(record.severity).toBe('high');
    expect(record.tags).toEqual(['c2', 'loader']);
  });

  it('applies sensible defaults', () => {
    const record = coerceIocRecord({ type: 'domain', value: 'x.example.com' });
    expect(record.malwareFamily).toBe('Unknown');
    expect(record.category).toBe('network');
    expect(record.confidence).toBe('medium');
  });
});
