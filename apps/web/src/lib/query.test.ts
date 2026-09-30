import { describe, expect, it } from 'vitest';
import { qs } from './query';

describe('qs', () => {
  it('returns an empty string when every value is empty', () => {
    expect(qs({ a: undefined, b: null, c: '' })).toBe('');
    expect(qs({})).toBe('');
  });

  it('skips undefined, null and empty strings but keeps falsy numbers/booleans', () => {
    expect(qs({ q: 'cobalt', page: 0, active: false })).toBe('?q=cobalt&page=0&active=false');
  });

  it('encodes values', () => {
    expect(qs({ q: 'a b&c' })).toBe('?q=a+b%26c');
  });
});
