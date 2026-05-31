import { describe, it, expect } from 'vitest';
import {
  createWelfordCov,
  updateWelfordCov,
  welfordCovariance,
  welfordVarianceX,
  welfordVarianceY,
  welfordCorrelation,
} from '../welfordCovariance';

function feed(xs: number[], ys: number[]) {
  let s = createWelfordCov();
  for (let i = 0; i < xs.length; i++) s = updateWelfordCov(s, xs[i], ys[i]);
  return s;
}

describe('welfordCovariance', () => {
  it('initial state', () => {
    const s = createWelfordCov();
    expect(s.n).toBe(0);
  });

  it('throws on non-finite update', () => {
    expect(() => updateWelfordCov(createWelfordCov(), NaN, 0)).toThrow();
    expect(() => updateWelfordCov(createWelfordCov(), 0, Infinity)).toThrow();
  });

  it('throws when <2 samples', () => {
    const s = updateWelfordCov(createWelfordCov(), 1, 2);
    expect(() => welfordCovariance(s)).toThrow();
    expect(() => welfordVarianceX(s)).toThrow();
    expect(() => welfordVarianceY(s)).toThrow();
    expect(() => welfordCorrelation(s)).toThrow();
  });

  it('cov of identical = var(x)', () => {
    const xs = [1, 2, 3, 4, 5];
    const s = feed(xs, xs);
    const cov = welfordCovariance(s);
    const vx = welfordVarianceX(s);
    expect(cov).toBeCloseTo(vx, 10);
  });

  it('cov(x,y) sample matches formula', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 3, 4, 6, 5];
    const s = feed(xs, ys);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let exp = 0;
    for (let i = 0; i < xs.length; i++) exp += (xs[i] - mx) * (ys[i] - my);
    exp /= xs.length - 1;
    expect(welfordCovariance(s)).toBeCloseTo(exp, 10);
  });

  it('variance x matches formula', () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9];
    const ys = xs.slice();
    const s = feed(xs, ys);
    expect(welfordVarianceX(s, false)).toBeCloseTo(4, 8);
  });

  it('variance y matches formula', () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9];
    const ys = xs.slice();
    const s = feed(xs, ys);
    expect(welfordVarianceY(s, false)).toBeCloseTo(4, 8);
  });

  it('correlation y=2x is 1', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = xs.map((v) => 2 * v + 3);
    const s = feed(xs, ys);
    expect(welfordCorrelation(s)).toBeCloseTo(1, 10);
  });

  it('correlation y=-x is -1', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = xs.map((v) => -v);
    const s = feed(xs, ys);
    expect(welfordCorrelation(s)).toBeCloseTo(-1, 10);
  });

  it('zero variance throws on correlation', () => {
    const xs = [1, 1, 1];
    const ys = [2, 3, 4];
    const s = feed(xs, ys);
    expect(() => welfordCorrelation(s)).toThrow();
  });

  it('population vs sample differ', () => {
    const xs = [1, 2, 3, 4];
    const ys = [2, 4, 6, 8];
    const s = feed(xs, ys);
    const sCov = welfordCovariance(s, true);
    const pCov = welfordCovariance(s, false);
    expect(sCov).not.toBe(pCov);
    expect(sCov * (xs.length - 1)).toBeCloseTo(pCov * xs.length, 10);
  });

  it('mean preserved', () => {
    const xs = [10, 20, 30];
    const s = feed(xs, xs);
    expect(s.meanX).toBeCloseTo(20, 10);
  });

  it('streaming equals batch', () => {
    const xs = Array.from({ length: 50 }, (_, i) => Math.sin(i));
    const ys = Array.from({ length: 50 }, (_, i) => Math.cos(i));
    const s = feed(xs, ys);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let exp = 0;
    for (let i = 0; i < xs.length; i++) exp += (xs[i] - mx) * (ys[i] - my);
    exp /= xs.length - 1;
    expect(welfordCovariance(s)).toBeCloseTo(exp, 8);
  });

  it('handles big numbers without overflow', () => {
    const xs = [1e8, 1e8 + 1, 1e8 + 2];
    const ys = [1e8 + 5, 1e8 + 6, 1e8 + 7];
    const s = feed(xs, ys);
    expect(welfordCovariance(s)).toBeCloseTo(1, 6);
  });

  it('count tracks updates', () => {
    let s = createWelfordCov();
    for (let i = 0; i < 7; i++) s = updateWelfordCov(s, i, i * 2);
    expect(s.n).toBe(7);
  });

  it('uncorrelated near zero', () => {
    const xs = [-2, -1, 0, 1, 2];
    const ys = [4, 1, 0, 1, 4];
    const s = feed(xs, ys);
    expect(Math.abs(welfordCovariance(s))).toBeLessThan(1e-10);
  });
});
