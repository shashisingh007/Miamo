import { describe, it, expect } from 'vitest';
import { sigmoidStable, logit, sigmoidStableLogit } from '../sigmoidStableLogit';

describe('sigmoidStable', () => {
  it('sigmoid(0) = 0.5', () => {
    expect(sigmoidStable(0)).toBeCloseTo(0.5, 12);
  });

  it('large positive => ~1', () => {
    expect(sigmoidStable(1000)).toBeCloseTo(1, 12);
  });

  it('large negative => ~0 without overflow', () => {
    expect(sigmoidStable(-1000)).toBeCloseTo(0, 12);
  });

  it('symmetry s(-x) = 1 - s(x)', () => {
    for (const x of [0.5, 1, 2, 3, 5]) {
      expect(sigmoidStable(-x) + sigmoidStable(x)).toBeCloseTo(1, 12);
    }
  });

  it('Infinity handled', () => {
    expect(sigmoidStable(Infinity)).toBe(1);
    expect(sigmoidStable(-Infinity)).toBe(0);
  });

  it('throws on NaN', () => {
    expect(() => sigmoidStable(NaN)).toThrow();
  });

  it('monotone increasing', () => {
    expect(sigmoidStable(1)).toBeGreaterThan(sigmoidStable(0));
    expect(sigmoidStable(2)).toBeGreaterThan(sigmoidStable(1));
  });

  it('output in (0,1)', () => {
    for (const x of [-50, -1, 0, 1, 50]) {
      const v = sigmoidStable(x);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('sigmoidStableLogit alias', () => {
    expect(sigmoidStableLogit(0)).toBeCloseTo(0.5, 12);
  });
});

describe('logit', () => {
  it('logit(0.5) = 0', () => {
    expect(logit(0.5)).toBeCloseTo(0, 12);
  });

  it('inverse of sigmoid', () => {
    for (const x of [-2, -0.5, 0, 0.5, 2]) {
      const p = sigmoidStable(x);
      expect(logit(p)).toBeCloseTo(x, 8);
    }
  });

  it('throws on p<=0 with eps=0', () => {
    expect(() => logit(0)).toThrow();
    expect(() => logit(-0.1)).toThrow();
  });

  it('throws on p>=1 with eps=0', () => {
    expect(() => logit(1)).toThrow();
  });

  it('eps clamps p', () => {
    const v = logit(0, 1e-6);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeLessThan(0);
  });

  it('eps clamps p=1', () => {
    const v = logit(1, 1e-6);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
  });

  it('throws on invalid eps', () => {
    expect(() => logit(0.5, -0.1)).toThrow();
    expect(() => logit(0.5, 0.6)).toThrow();
  });

  it('throws on non-finite p', () => {
    expect(() => logit(NaN)).toThrow();
  });
});
