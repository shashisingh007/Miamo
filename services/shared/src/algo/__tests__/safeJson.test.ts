import { describe, it, expect } from 'vitest';
import { safeJsonParse } from '../safeJson';

describe('safeJsonParse — happy path', () => {
  it('parses a simple object', () => {
    const r = safeJsonParse('{"a":1,"b":"x"}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ a: 1, b: 'x' });
  });
  it('parses arrays', () => {
    const r = safeJsonParse('[1,2,3]');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([1, 2, 3]);
  });
  it('parses scalars', () => {
    const r = safeJsonParse('42');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });
});

describe('safeJsonParse — failures', () => {
  it('rejects invalid JSON', () => {
    const r = safeJsonParse('{bad');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_json');
  });
  it('rejects oversized input', () => {
    const big = '"' + 'a'.repeat(2_000_000) + '"';
    const r = safeJsonParse(big, { maxBytes: 1024 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too_large');
  });
  it('rejects too-deep nesting', () => {
    let s = '0';
    for (let i = 0; i < 20; i++) s = `[${s}]`;
    const r = safeJsonParse(s, { maxDepth: 5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too_deep');
  });
});

describe('safeJsonParse — prototype pollution', () => {
  it('strips __proto__ keys', () => {
    const r = safeJsonParse('{"__proto__":{"polluted":true},"a":1}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const v = r.value as Record<string, unknown>;
      expect(v.a).toBe(1);
      expect(v.__proto__).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();
    }
  });
  it('strips nested constructor / prototype keys', () => {
    const r = safeJsonParse('{"x":{"constructor":{"prototype":{"hack":1}},"ok":1}}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const v = r.value as any;
      expect(v.x.ok).toBe(1);
      expect(v.x.constructor).toBeUndefined();
    }
  });
});
