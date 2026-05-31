import { describe, it, expect } from 'vitest';
import { simpsonsRule, adaptiveSimpson } from '../simpsonsRule';

describe('simpsonsRule', () => {
  it('integrates x^2 on [0,1]', () => {
    const r = simpsonsRule((x) => x * x, 0, 1);
    expect(Math.abs(r - 1 / 3)).toBeLessThan(1e-9);
  });

  it('integrates constant', () => {
    const r = simpsonsRule(() => 5, 0, 4);
    expect(Math.abs(r - 20)).toBeLessThan(1e-12);
  });

  it('integrates x', () => {
    const r = simpsonsRule((x) => x, 0, 10);
    expect(Math.abs(r - 50)).toBeLessThan(1e-9);
  });

  it('integrates sin on [0, pi] => 2', () => {
    const r = simpsonsRule(Math.sin, 0, Math.PI, { n: 200 });
    expect(Math.abs(r - 2)).toBeLessThan(1e-6);
  });

  it('integrates cos on [0, pi/2] => 1', () => {
    const r = simpsonsRule(Math.cos, 0, Math.PI / 2, { n: 200 });
    expect(Math.abs(r - 1)).toBeLessThan(1e-6);
  });

  it('a == b returns 0', () => {
    expect(simpsonsRule(Math.sin, 3, 3)).toBe(0);
  });

  it('reversed interval is negative', () => {
    const fwd = simpsonsRule((x) => x * x, 0, 2);
    const rev = simpsonsRule((x) => x * x, 2, 0);
    expect(rev).toBeCloseTo(-fwd, 9);
  });

  it('odd n is rounded up to even', () => {
    const r = simpsonsRule((x) => x * x, 0, 1, { n: 3 });
    expect(Math.abs(r - 1 / 3)).toBeLessThan(0.05);
  });

  it('throws on non-finite a', () => {
    expect(() => simpsonsRule(Math.sin, Infinity, 1)).toThrow();
  });

  it('throws on non-finite b', () => {
    expect(() => simpsonsRule(Math.sin, 0, NaN)).toThrow();
  });

  it('throws on invalid n', () => {
    expect(() => simpsonsRule(Math.sin, 0, 1, { n: 0 })).toThrow();
    expect(() => simpsonsRule(Math.sin, 0, 1, { n: -2 })).toThrow();
    expect(() => simpsonsRule(Math.sin, 0, 1, { n: 2.5 })).toThrow();
  });

  it('throws on f returning non-finite', () => {
    expect(() => simpsonsRule(() => Infinity, 0, 1)).toThrow();
  });

  it('larger n converges (x^4)', () => {
    const exact = 1 / 5;
    const r = simpsonsRule((x) => x * x * x * x, 0, 1, { n: 1000 });
    expect(Math.abs(r - exact)).toBeLessThan(1e-10);
  });
});

describe('adaptiveSimpson', () => {
  it('integrates exp on [0,1]', () => {
    const r = adaptiveSimpson(Math.exp, 0, 1, 1e-10);
    expect(Math.abs(r - (Math.E - 1))).toBeLessThan(1e-9);
  });

  it('integrates 1/(1+x^2) on [0,1] => pi/4', () => {
    const r = adaptiveSimpson((x) => 1 / (1 + x * x), 0, 1, 1e-10);
    expect(Math.abs(r - Math.PI / 4)).toBeLessThan(1e-9);
  });

  it('integrates polynomial exactly', () => {
    const r = adaptiveSimpson((x) => 3 * x * x + 2 * x + 1, 0, 2, 1e-10);
    expect(Math.abs(r - 14)).toBeLessThan(1e-9);
  });
});
