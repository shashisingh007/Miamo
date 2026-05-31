import { describe, it, expect } from 'vitest';
import { rombergIntegration } from '../rombergIntegration';

describe('rombergIntegration', () => {
  it('integrates constant', () => {
    const r = rombergIntegration(() => 4, 0, 3);
    expect(r.value).toBeCloseTo(12, 12);
    expect(r.converged).toBe(true);
  });

  it('integrates linear', () => {
    const r = rombergIntegration((x) => 3 * x + 1, 0, 2);
    expect(r.value).toBeCloseTo(8, 10);
  });

  it('integrates x^2 exactly enough', () => {
    const r = rombergIntegration((x) => x * x, 0, 1);
    expect(r.value).toBeCloseTo(1 / 3, 10);
    expect(r.converged).toBe(true);
  });

  it('integrates sin', () => {
    const r = rombergIntegration(Math.sin, 0, Math.PI);
    expect(r.value).toBeCloseTo(2, 10);
  });

  it('integrates e^x', () => {
    const r = rombergIntegration(Math.exp, 0, 1);
    expect(r.value).toBeCloseTo(Math.E - 1, 10);
  });

  it('a==b returns 0', () => {
    expect(rombergIntegration((x) => x * x, 4, 4).value).toBe(0);
  });

  it('reports level count', () => {
    const r = rombergIntegration((x) => x * x, 0, 1);
    expect(r.levels).toBeGreaterThan(0);
    expect(r.levels).toBeLessThanOrEqual(10);
  });

  it('honours custom tol with non-convergence', () => {
    const r = rombergIntegration((x) => Math.sin(50 * x), 0, 1, { maxLevels: 2, tol: 1e-15 });
    expect(r.levels).toBe(2);
  });

  it('throws on bad maxLevels', () => {
    expect(() => rombergIntegration((x) => x, 0, 1, { maxLevels: 0 })).toThrow();
  });
});
