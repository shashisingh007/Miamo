import { describe, it, expect } from 'vitest';
import { normalizeScore, normalizeScores, fitRobust } from '../scoreNormalizer';

describe('normalizeScore — minMax', () => {
  const s = { kind: 'minMax', min: 0, max: 100 } as const;
  it('maps endpoints to 0 and 1', () => {
    expect(normalizeScore(0, s)).toBe(0);
    expect(normalizeScore(100, s)).toBe(1);
  });
  it('maps midpoint to 0.5', () => {
    expect(normalizeScore(50, s)).toBeCloseTo(0.5, 6);
  });
  it('clamps below min and above max', () => {
    expect(normalizeScore(-10, s)).toBe(0);
    expect(normalizeScore(200, s)).toBe(1);
  });
  it('returns 0 for malformed range', () => {
    expect(normalizeScore(50, { kind: 'minMax', min: 100, max: 100 })).toBe(0);
  });
});

describe('normalizeScore — robust', () => {
  const s = { kind: 'robust', p25: 10, p95: 90 } as const;
  it('maps p25 to 0 and p95 to 1', () => {
    expect(normalizeScore(10, s)).toBe(0);
    expect(normalizeScore(90, s)).toBe(1);
  });
  it('clamps outside the band', () => {
    expect(normalizeScore(0, s)).toBe(0);
    expect(normalizeScore(200, s)).toBe(1);
  });
});

describe('normalizeScore — logistic', () => {
  const s = { kind: 'logistic', k: 1, x0: 0 } as const;
  it('returns 0.5 at x = x0', () => {
    expect(normalizeScore(0, s)).toBeCloseTo(0.5, 6);
  });
  it('approaches 1 as x → ∞', () => {
    expect(normalizeScore(100, s)).toBeCloseTo(1, 6);
  });
  it('approaches 0 as x → -∞', () => {
    expect(normalizeScore(-100, s)).toBeCloseTo(0, 6);
  });
});

describe('normalizeScore — NaN safety', () => {
  it('returns 0 for NaN input', () => {
    expect(normalizeScore(NaN, { kind: 'minMax', min: 0, max: 1 })).toBe(0);
  });
});

describe('normalizeScores', () => {
  it('maps an array elementwise', () => {
    const out = normalizeScores([0, 50, 100], { kind: 'minMax', min: 0, max: 100 });
    expect(out).toEqual([0, 0.5, 1]);
  });
});

describe('fitRobust', () => {
  it('returns robust strategy for spread data', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const s = fitRobust(xs);
    expect(s.kind).toBe('robust');
  });
  it('falls back to minMax when p95 <= p25', () => {
    const s = fitRobust([5, 5, 5, 5, 5]);
    expect(s.kind).toBe('minMax');
  });
  it('handles empty input safely', () => {
    expect(fitRobust([])).toEqual({ kind: 'minMax', min: 0, max: 1 });
  });
  it('ignores non-finite values', () => {
    const s = fitRobust([NaN, Infinity, 1, 2, 3, 4, 5]);
    expect(s.kind).toBe('robust');
  });
});
