import { describe, it, expect } from 'vitest';
import { discreteSineTransform, discreteSineTransformInverse } from '../discreteSineTransform';

describe('discreteSineTransform', () => {
  it('throws on empty', () => {
    expect(() => discreteSineTransform([])).toThrow();
  });

  it('inverse throws on empty', () => {
    expect(() => discreteSineTransformInverse([])).toThrow();
  });

  it('1-point', () => {
    // sin(pi/1 * 0.5 * 1) = sin(pi/2) = 1
    const X = discreteSineTransform([5]);
    expect(X[0]).toBeCloseTo(5, 10);
  });

  it('zero input => zero output', () => {
    const X = discreteSineTransform([0, 0, 0, 0]);
    for (const v of X) expect(Math.abs(v)).toBeLessThan(1e-12);
  });

  it('output length equals input', () => {
    expect(discreteSineTransform([1, 2, 3, 4])).toHaveLength(4);
  });

  it('linearity', () => {
    const a = discreteSineTransform([1, 2, 3, 4]);
    const b = discreteSineTransform([2, 4, 6, 8]);
    for (let i = 0; i < 4; i++) expect(b[i]).toBeCloseTo(2 * a[i], 8);
  });

  it('does not mutate input', () => {
    const x = [1, 2, 3, 4];
    const ref = x.slice();
    discreteSineTransform(x);
    expect(x).toEqual(ref);
  });

  it('inverse recovers input (N=2)', () => {
    const x = [3, 7];
    const back = discreteSineTransformInverse(discreteSineTransform(x));
    for (let i = 0; i < x.length; i++) expect(back[i]).toBeCloseTo(x[i], 8);
  });

  it('inverse recovers input (N=4)', () => {
    const x = [1, 2, -3, 4];
    const back = discreteSineTransformInverse(discreteSineTransform(x));
    for (let i = 0; i < x.length; i++) expect(back[i]).toBeCloseTo(x[i], 8);
  });

  it('inverse recovers input (N=8)', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const back = discreteSineTransformInverse(discreteSineTransform(x));
    for (let i = 0; i < 8; i++) expect(back[i]).toBeCloseTo(x[i], 6);
  });

  it('handles negative values', () => {
    const x = [-1, -2, -3];
    const back = discreteSineTransformInverse(discreteSineTransform(x));
    for (let i = 0; i < 3; i++) expect(back[i]).toBeCloseTo(x[i], 8);
  });

  it('linearity (sum)', () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    const Xa = discreteSineTransform(a);
    const Xb = discreteSineTransform(b);
    const Xab = discreteSineTransform([1, 1, 0, 0]);
    for (let i = 0; i < 4; i++) expect(Xab[i]).toBeCloseTo(Xa[i] + Xb[i], 8);
  });

  it('Parseval-like preservation through inverse', () => {
    const x = [2, -1, 4, 3];
    const back = discreteSineTransformInverse(discreteSineTransform(x));
    let sumX = 0, sumBack = 0;
    for (let i = 0; i < 4; i++) {
      sumX += x[i] * x[i];
      sumBack += back[i] * back[i];
    }
    expect(sumBack).toBeCloseTo(sumX, 6);
  });

  it('basis vector e_0 has known transform', () => {
    // x = [1, 0, 0, 0]; X[k] = sin(pi/4 * 0.5 * (k+1))
    const X = discreteSineTransform([1, 0, 0, 0]);
    for (let k = 0; k < 4; k++) {
      expect(X[k]).toBeCloseTo(Math.sin((Math.PI / 4) * 0.5 * (k + 1)), 10);
    }
  });

  it('inverse output length matches', () => {
    expect(discreteSineTransformInverse([1, 2, 3])).toHaveLength(3);
  });
});
