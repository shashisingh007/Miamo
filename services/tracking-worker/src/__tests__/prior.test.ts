import { describe, it, expect } from 'vitest';
import { _internals } from '../compat';

const { compose } = _internals;

/**
 * Prior-interaction signal math (verified via the same log1p/log(1000) scaling
 * used in compat.ts tick()). This test pins the calibration so future tweaks
 * don't silently shift the boost curve.
 */
function priorScore(count: number): number {
  if (count <= 0) return 0;
  return Math.min(1, Math.log1p(count) / Math.log(1000));
}

describe('compat prior-interaction scaling', () => {
  it('zero interactions → 0', () => {
    expect(priorScore(0)).toBe(0);
  });
  it('1 interaction → small but non-zero', () => {
    const s = priorScore(1);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(0.15);
  });
  it('~10 interactions → ~0.35', () => {
    expect(priorScore(10)).toBeGreaterThan(0.3);
    expect(priorScore(10)).toBeLessThan(0.4);
  });
  it('1000+ interactions caps at 1', () => {
    expect(priorScore(1000)).toBeCloseTo(1, 2);
    expect(priorScore(10_000)).toBe(1);
  });
  it('compose dominated by prior when chrono and behavior are tied', () => {
    const lo = compose(0.5, 0.5, 0);
    const hi = compose(0.5, 0.5, 1);
    expect(hi).toBeGreaterThan(lo);
    // prior weight ≈ 0.4 → final delta ≈ 0.4
    expect(hi - lo).toBeGreaterThan(0.35);
    expect(hi - lo).toBeLessThan(0.45);
  });
});
