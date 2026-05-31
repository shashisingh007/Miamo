import { describe, it, expect } from 'vitest';
import { kullbackLeiblerDivergence } from '../kullbackLeiblerDivergence';

describe('kullbackLeiblerDivergence', () => {
  it('zero for identical', () => {
    expect(kullbackLeiblerDivergence([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 12);
  });

  it('non-negative', () => {
    expect(kullbackLeiblerDivergence([0.7, 0.3], [0.5, 0.5])).toBeGreaterThan(0);
  });

  it('asymmetric', () => {
    const a = kullbackLeiblerDivergence([0.7, 0.3], [0.5, 0.5]);
    const b = kullbackLeiblerDivergence([0.5, 0.5], [0.7, 0.3]);
    expect(a).not.toBeCloseTo(b, 6);
  });

  it('infinity when q has zero where p has mass', () => {
    expect(kullbackLeiblerDivergence([0.5, 0.5], [1, 0])).toBe(Infinity);
  });

  it('zero p contribution skipped', () => {
    expect(kullbackLeiblerDivergence([0, 1], [0.5, 0.5])).toBeCloseTo(Math.log(2), 12);
  });

  it('throws on length mismatch', () => {
    expect(() => kullbackLeiblerDivergence([0.5, 0.5], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => kullbackLeiblerDivergence([], [])).toThrow();
  });

  it('throws on negative', () => {
    expect(() => kullbackLeiblerDivergence([-0.1, 1.1], [0.5, 0.5])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => kullbackLeiblerDivergence([NaN, 1], [0.5, 0.5])).toThrow();
  });

  it('throws on zero total mass', () => {
    expect(() => kullbackLeiblerDivergence([0, 0], [0.5, 0.5])).toThrow();
  });

  it('normalizes inputs', () => {
    const a = kullbackLeiblerDivergence([7, 3], [5, 5]);
    const b = kullbackLeiblerDivergence([0.7, 0.3], [0.5, 0.5]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('uniform vs uniform = 0', () => {
    expect(kullbackLeiblerDivergence([1, 1, 1, 1], [1, 1, 1, 1])).toBeCloseTo(0, 12);
  });

  it('known value: KL([1,0],[.5,.5]) = log 2', () => {
    expect(kullbackLeiblerDivergence([1, 0], [0.5, 0.5])).toBeCloseTo(Math.log(2), 12);
  });

  it('larger distribution', () => {
    const p = [0.1, 0.2, 0.3, 0.4];
    const q = [0.25, 0.25, 0.25, 0.25];
    expect(kullbackLeiblerDivergence(p, q)).toBeGreaterThan(0);
  });
});
