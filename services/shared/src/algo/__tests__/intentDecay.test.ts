import { describe, it, expect } from 'vitest';
import { expDecayMs, linearDecayMs, steppedDecayMs } from '../intentDecay';

const H = 3_600_000;

describe('expDecayMs', () => {
  it('halves at one half-life', () => {
    expect(expDecayMs(24 * H, 24 * H)).toBeCloseTo(0.5, 6);
  });
  it('returns 1 at age = 0', () => {
    expect(expDecayMs(0, 24 * H)).toBe(1);
  });
  it('returns 1 for negative age', () => {
    expect(expDecayMs(-10, 24 * H)).toBe(1);
  });
  it('returns 0 when halfLife <= 0', () => {
    expect(expDecayMs(100, 0)).toBe(0);
  });
});

describe('linearDecayMs', () => {
  it('returns 1 at age 0', () => {
    expect(linearDecayMs(0, 60_000)).toBe(1);
  });
  it('returns 0.5 at half window', () => {
    expect(linearDecayMs(30_000, 60_000)).toBeCloseTo(0.5, 6);
  });
  it('returns 0 at and beyond window', () => {
    expect(linearDecayMs(60_000, 60_000)).toBe(0);
    expect(linearDecayMs(120_000, 60_000)).toBe(0);
  });
  it('returns 0 when window <= 0', () => {
    expect(linearDecayMs(10, 0)).toBe(0);
  });
});

describe('steppedDecayMs', () => {
  const buckets = [
    { upToMs: 60_000, weight: 1.0 },
    { upToMs: 5 * 60_000, weight: 0.5 },
    { upToMs: 30 * 60_000, weight: 0.2 },
  ];
  it('picks first matching bucket', () => {
    expect(steppedDecayMs(30_000, buckets)).toBe(1.0);
    expect(steppedDecayMs(120_000, buckets)).toBe(0.5);
    expect(steppedDecayMs(10 * 60_000, buckets)).toBe(0.2);
  });
  it('returns 0 beyond all buckets', () => {
    expect(steppedDecayMs(60 * 60_000, buckets)).toBe(0);
  });
  it('coerces negative or NaN age to 0', () => {
    expect(steppedDecayMs(-10, buckets)).toBe(1.0);
    expect(steppedDecayMs(NaN, buckets)).toBe(1.0);
  });
});
