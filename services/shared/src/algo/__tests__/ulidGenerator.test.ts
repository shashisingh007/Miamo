import { describe, it, expect } from 'vitest';
import {
  generateUlid,
  createUlidState,
  isUlid,
  decodeUlidTimestamp,
} from '../ulidGenerator';

const FIXED_RAND = (): Buffer => Buffer.alloc(10, 0);

describe('ulidGenerator', () => {
  it('produces a 26-char string', () => {
    const u = generateUlid();
    expect(u).toHaveLength(26);
    expect(isUlid(u)).toBe(true);
  });

  it('uses Crockford alphabet only', () => {
    const u = generateUlid();
    expect(u).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/);
  });

  it('encodes the given timestamp', () => {
    const u = generateUlid({ nowMs: 0, randomBytesFn: FIXED_RAND });
    expect(u.startsWith('0000000000')).toBe(true);
  });

  it('decodeUlidTimestamp recovers the millis', () => {
    const u = generateUlid({ nowMs: 1_700_000_000_000, randomBytesFn: FIXED_RAND });
    expect(decodeUlidTimestamp(u)).toBe(1_700_000_000_000);
  });

  it('rejects timestamps out of range', () => {
    expect(() => generateUlid({ nowMs: -1 })).toThrow(RangeError);
    expect(() => generateUlid({ nowMs: Number.NaN })).toThrow(RangeError);
    expect(() => generateUlid({ nowMs: 2 ** 49 })).toThrow(RangeError);
  });

  it('rejects rng returning wrong byte count', () => {
    expect(() =>
      generateUlid({ nowMs: 0, randomBytesFn: () => Buffer.alloc(8, 0) })
    ).toThrow(RangeError);
  });

  it('monotonic mode increments random on same millisecond', () => {
    const st = createUlidState();
    const a = generateUlid({ nowMs: 1000, randomBytesFn: FIXED_RAND, state: st });
    const b = generateUlid({ nowMs: 1000, randomBytesFn: FIXED_RAND, state: st });
    expect(a < b).toBe(true);
  });

  it('monotonic mode preserves lexicographic order across many calls', () => {
    const st = createUlidState();
    const ids: string[] = [];
    for (let i = 0; i < 100; i++) {
      ids.push(generateUlid({ nowMs: 5000, randomBytesFn: FIXED_RAND, state: st }));
    }
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('monotonic overflow throws RangeError', () => {
    const st = createUlidState();
    // start at all-FF so a single bump overflows
    st.lastMs = 1000;
    st.lastRand = Buffer.alloc(10, 0xff);
    expect(() =>
      generateUlid({ nowMs: 1000, randomBytesFn: FIXED_RAND, state: st })
    ).toThrow(RangeError);
  });

  it('different timestamps produce strictly increasing prefixes', () => {
    const a = generateUlid({ nowMs: 1000, randomBytesFn: FIXED_RAND });
    const b = generateUlid({ nowMs: 2000, randomBytesFn: FIXED_RAND });
    expect(a.slice(0, 10) < b.slice(0, 10)).toBe(true);
  });

  it('isUlid rejects bad shapes', () => {
    expect(isUlid('short')).toBe(false);
    expect(isUlid('!'.repeat(26))).toBe(false);
    expect(isUlid('o'.repeat(26))).toBe(false); // lowercase o not in Crockford
    expect(isUlid(123 as unknown as string)).toBe(false);
  });

  it('decodeUlidTimestamp returns null on invalid input', () => {
    expect(decodeUlidTimestamp('not-a-ulid')).toBeNull();
  });

  it('two unseeded calls do not collide', () => {
    const a = generateUlid();
    const b = generateUlid();
    expect(a).not.toBe(b);
  });
});
