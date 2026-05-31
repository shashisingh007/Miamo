import { describe, it, expect } from 'vitest';
import { fftRadix2, ifftRadix2 } from '../fftRadix2';

function approxEq(a: number[], b: number[], tol = 1e-8): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (Math.abs(a[i] - b[i]) > tol) return false;
  return true;
}

describe('fftRadix2', () => {
  it('rejects non-array', () => {
    expect(() => fftRadix2(42 as any)).toThrow(TypeError);
  });

  it('rejects non-power-of-two length', () => {
    expect(() => fftRadix2([1, 2, 3])).toThrow(RangeError);
    expect(() => fftRadix2([])).toThrow(RangeError);
  });

  it('rejects mismatched imag length', () => {
    expect(() => fftRadix2([1, 2], [1])).toThrow(RangeError);
  });

  it('rejects non-finite', () => {
    expect(() => fftRadix2([1, NaN])).toThrow(RangeError);
  });

  it('length 1 (NOTE: not power-of-two so disallowed)', () => {
    expect(() => fftRadix2([5])).not.toThrow();
  });

  it('FFT of constant signal: DC bin nonzero, rest zero', () => {
    const { real, imag } = fftRadix2([1, 1, 1, 1]);
    expect(real[0]).toBeCloseTo(4, 9);
    for (let i = 1; i < 4; i += 1) {
      expect(real[i]).toBeCloseTo(0, 9);
      expect(imag[i]).toBeCloseTo(0, 9);
    }
  });

  it('FFT/IFFT round trip on small signal', () => {
    const x = [1, 2, 3, 4];
    const { real, imag } = fftRadix2(x);
    const back = ifftRadix2(real, imag);
    expect(approxEq(back.real, x, 1e-8)).toBe(true);
    expect(approxEq(back.imag, [0, 0, 0, 0], 1e-8)).toBe(true);
  });

  it('FFT/IFFT round trip on length 8', () => {
    const x = [1, -2, 3, 4, 5, -6, 7, 8];
    const { real, imag } = fftRadix2(x);
    const back = ifftRadix2(real, imag);
    expect(approxEq(back.real, x, 1e-8)).toBe(true);
  });

  it('FFT/IFFT round trip on length 16 random complex', () => {
    const re = Array.from({ length: 16 }, () => Math.random() * 100 - 50);
    const im = Array.from({ length: 16 }, () => Math.random() * 100 - 50);
    const fwd = fftRadix2(re, im);
    const back = ifftRadix2(fwd.real, fwd.imag);
    expect(approxEq(back.real, re, 1e-6)).toBe(true);
    expect(approxEq(back.imag, im, 1e-6)).toBe(true);
  });

  it('FFT of single cosine concentrates at one bin pair', () => {
    const n = 8;
    const k = 2;
    const x = Array.from({ length: n }, (_, i) => Math.cos(2 * Math.PI * k * i / n));
    const { real, imag } = fftRadix2(x);
    // Energy at bins k and n-k
    let energyKs = real[k] * real[k] + imag[k] * imag[k];
    energyKs += real[n - k] * real[n - k] + imag[n - k] * imag[n - k];
    let energyTotal = 0;
    for (let i = 0; i < n; i += 1) energyTotal += real[i] * real[i] + imag[i] * imag[i];
    expect(energyKs / energyTotal).toBeGreaterThan(0.99);
  });

  it('Parseval theorem', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const { real, imag } = fftRadix2(x);
    const e1 = x.reduce((s, v) => s + v * v, 0);
    let e2 = 0;
    for (let i = 0; i < real.length; i += 1) e2 += real[i] * real[i] + imag[i] * imag[i];
    expect(e2 / real.length).toBeCloseTo(e1, 6);
  });

  it('linearity', () => {
    const a = [1, 2, 3, 4];
    const b = [5, 6, 7, 8];
    const fA = fftRadix2(a);
    const fB = fftRadix2(b);
    const fSum = fftRadix2([6, 8, 10, 12]);
    for (let i = 0; i < 4; i += 1) {
      expect(fSum.real[i]).toBeCloseTo(fA.real[i] + fB.real[i], 9);
      expect(fSum.imag[i]).toBeCloseTo(fA.imag[i] + fB.imag[i], 9);
    }
  });

  it('handles length 32 round trip', () => {
    const x = Array.from({ length: 32 }, (_, i) => Math.sin(i));
    const { real, imag } = fftRadix2(x);
    const back = ifftRadix2(real, imag);
    expect(approxEq(back.real, x, 1e-9)).toBe(true);
  });

  it('zero input => zero output', () => {
    const z = new Array(8).fill(0);
    const { real, imag } = fftRadix2(z);
    expect(real.every((v) => Math.abs(v) < 1e-12)).toBe(true);
    expect(imag.every((v) => Math.abs(v) < 1e-12)).toBe(true);
  });

  it('ifftRadix2 rejects mismatched', () => {
    expect(() => ifftRadix2([1, 2], [1])).toThrow(RangeError);
  });

  it('ifftRadix2 rejects non-power-of-two', () => {
    expect(() => ifftRadix2([1, 2, 3], [0, 0, 0])).toThrow(RangeError);
  });

  it('ifftRadix2 rejects non-array', () => {
    expect(() => ifftRadix2(42 as any, [1])).toThrow(TypeError);
  });
});
