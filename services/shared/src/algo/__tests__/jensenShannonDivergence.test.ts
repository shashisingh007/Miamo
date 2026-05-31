import { describe, it, expect } from 'vitest';
import {
  jensenShannonDivergence,
  jensenShannonDistance,
} from '../jensenShannonDivergence';

describe('jensenShannonDivergence', () => {
  it('zero for identical', () => {
    expect(jensenShannonDivergence([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 12);
  });

  it('symmetric', () => {
    const a = jensenShannonDivergence([0.7, 0.3], [0.2, 0.8]);
    const b = jensenShannonDivergence([0.2, 0.8], [0.7, 0.3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('non-negative', () => {
    expect(jensenShannonDivergence([0.7, 0.3], [0.5, 0.5])).toBeGreaterThan(0);
  });

  it('bounded by ln 2', () => {
    const v = jensenShannonDivergence([1, 0], [0, 1]);
    expect(v).toBeCloseTo(Math.log(2), 6);
  });

  it('disjoint supports => log 2', () => {
    const v = jensenShannonDivergence([1, 0, 0], [0, 0, 1]);
    expect(v).toBeCloseTo(Math.log(2), 6);
  });

  it('throws on length mismatch', () => {
    expect(() => jensenShannonDivergence([0.5, 0.5], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => jensenShannonDivergence([], [])).toThrow();
  });

  it('throws on negative', () => {
    expect(() => jensenShannonDivergence([-0.1, 1.1], [0.5, 0.5])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => jensenShannonDivergence([Infinity, 1], [0.5, 0.5])).toThrow();
  });

  it('throws on zero mass', () => {
    expect(() => jensenShannonDivergence([0, 0], [0.5, 0.5])).toThrow();
  });

  it('normalizes inputs', () => {
    const a = jensenShannonDivergence([7, 3], [5, 5]);
    const b = jensenShannonDivergence([0.7, 0.3], [0.5, 0.5]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('distance is sqrt of divergence', () => {
    const p = [0.6, 0.4];
    const q = [0.3, 0.7];
    expect(jensenShannonDistance(p, q)).toBeCloseTo(
      Math.sqrt(jensenShannonDivergence(p, q)),
      12
    );
  });

  it('distance is metric: triangle-ish on simple case', () => {
    const a = jensenShannonDistance([1, 0], [0.5, 0.5]);
    const b = jensenShannonDistance([0.5, 0.5], [0, 1]);
    const c = jensenShannonDistance([1, 0], [0, 1]);
    expect(a + b).toBeGreaterThanOrEqual(c - 1e-12);
  });

  it('handles zeros gracefully', () => {
    const v = jensenShannonDivergence([0, 1], [1, 0]);
    expect(Number.isFinite(v)).toBe(true);
  });
});
