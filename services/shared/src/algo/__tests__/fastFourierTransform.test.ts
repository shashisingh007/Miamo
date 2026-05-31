import { describe, it, expect } from 'vitest';
import { fastFourierTransform, inverseFastFourierTransform } from '../fastFourierTransform';

const c = (re: number, im: number = 0) => ({ re, im });

function approxEqual(a: { re: number; im: number }, b: { re: number; im: number }, eps = 1e-9): boolean {
  return Math.abs(a.re - b.re) < eps && Math.abs(a.im - b.im) < eps;
}

describe('fastFourierTransform', () => {
  it('empty => empty', () => {
    expect(fastFourierTransform([])).toEqual([]);
  });

  it('throws on non-power-of-2', () => {
    expect(() => fastFourierTransform([c(1), c(2), c(3)])).toThrow(RangeError);
  });

  it('size 1 returns same value', () => {
    expect(fastFourierTransform([c(5)])).toEqual([c(5)]);
  });

  it('size 2 transform', () => {
    const r = fastFourierTransform([c(1), c(2)]);
    expect(approxEqual(r[0], c(3))).toBe(true);
    expect(approxEqual(r[1], c(-1))).toBe(true);
  });

  it('size 4 of [1,0,0,0] => all ones', () => {
    const r = fastFourierTransform([c(1), c(0), c(0), c(0)]);
    for (const x of r) expect(approxEqual(x, c(1))).toBe(true);
  });

  it('size 4 of all ones => [4, 0, 0, 0]', () => {
    const r = fastFourierTransform([c(1), c(1), c(1), c(1)]);
    expect(approxEqual(r[0], c(4))).toBe(true);
    expect(approxEqual(r[1], c(0))).toBe(true);
    expect(approxEqual(r[2], c(0))).toBe(true);
    expect(approxEqual(r[3], c(0))).toBe(true);
  });

  it('linearity', () => {
    const a = [c(1), c(2), c(3), c(4)];
    const b = [c(4), c(3), c(2), c(1)];
    const fa = fastFourierTransform(a);
    const fb = fastFourierTransform(b);
    const sum = a.map((_, i) => ({ re: a[i].re + b[i].re, im: a[i].im + b[i].im }));
    const fsum = fastFourierTransform(sum);
    for (let i = 0; i < 4; i++) {
      expect(approxEqual(fsum[i], { re: fa[i].re + fb[i].re, im: fa[i].im + fb[i].im })).toBe(true);
    }
  });
});

describe('inverseFastFourierTransform', () => {
  it('empty => empty', () => {
    expect(inverseFastFourierTransform([])).toEqual([]);
  });

  it('inverse undoes forward (size 4)', () => {
    const orig = [c(1), c(2), c(3), c(4)];
    const back = inverseFastFourierTransform(fastFourierTransform(orig));
    for (let i = 0; i < 4; i++) expect(approxEqual(back[i], orig[i])).toBe(true);
  });

  it('inverse undoes forward (size 8 with imaginary parts)', () => {
    const orig = [c(1, 1), c(2, -1), c(3, 0), c(4, 2), c(-1, 0), c(0, 1), c(5, -3), c(2, 0)];
    const back = inverseFastFourierTransform(fastFourierTransform(orig));
    for (let i = 0; i < 8; i++) expect(approxEqual(back[i], orig[i], 1e-8)).toBe(true);
  });

  it('size 1 inverse', () => {
    expect(inverseFastFourierTransform([c(7)])).toEqual([c(7)]);
  });

  it('size 2 inverse', () => {
    const r = inverseFastFourierTransform([c(3), c(-1)]);
    expect(approxEqual(r[0], c(1))).toBe(true);
    expect(approxEqual(r[1], c(2))).toBe(true);
  });
});
