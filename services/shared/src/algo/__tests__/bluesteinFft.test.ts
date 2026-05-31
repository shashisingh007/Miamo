import { describe, it, expect } from 'vitest';
import { bluesteinFft } from '../bluesteinFft';

function dft(re: number[], im: number[]): { re: number[]; im: number[] } {
  const n = re.length;
  const Re = new Array(n).fill(0);
  const Im = new Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < n; j++) {
      const ang = (-2 * Math.PI * k * j) / n;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      Re[k] += re[j] * c - im[j] * s;
      Im[k] += re[j] * s + im[j] * c;
    }
  }
  return { re: Re, im: Im };
}

describe('bluesteinFft', () => {
  it('throws on empty', () => {
    expect(() => bluesteinFft({ re: [], im: [] })).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => bluesteinFft({ re: [1, 2], im: [0] })).toThrow();
  });

  it('length 1 identity', () => {
    const r = bluesteinFft({ re: [3], im: [4] });
    expect(r.re[0]).toBeCloseTo(3, 10);
    expect(r.im[0]).toBeCloseTo(4, 10);
  });

  it('length 2', () => {
    const r = bluesteinFft({ re: [1, 2], im: [0, 0] });
    expect(r.re[0]).toBeCloseTo(3, 8);
    expect(r.re[1]).toBeCloseTo(-1, 8);
  });

  it('length 3 (non power of 2) matches DFT', () => {
    const re = [1, 2, 3];
    const im = [0, 0, 0];
    const r = bluesteinFft({ re, im });
    const ref = dft(re, im);
    for (let k = 0; k < 3; k++) {
      expect(r.re[k]).toBeCloseTo(ref.re[k], 8);
      expect(r.im[k]).toBeCloseTo(ref.im[k], 8);
    }
  });

  it('length 5 matches DFT', () => {
    const re = [3, 1, 4, 1, 5];
    const im = [0, 0, 0, 0, 0];
    const r = bluesteinFft({ re, im });
    const ref = dft(re, im);
    for (let k = 0; k < 5; k++) {
      expect(r.re[k]).toBeCloseTo(ref.re[k], 8);
      expect(r.im[k]).toBeCloseTo(ref.im[k], 8);
    }
  });

  it('length 7 matches DFT', () => {
    const re = [1, 0, -1, 0, 1, 0, -1];
    const im = new Array(7).fill(0);
    const r = bluesteinFft({ re, im });
    const ref = dft(re, im);
    for (let k = 0; k < 7; k++) {
      expect(r.re[k]).toBeCloseTo(ref.re[k], 7);
      expect(r.im[k]).toBeCloseTo(ref.im[k], 7);
    }
  });

  it('inverse', () => {
    const re = [3, 1, 4, 1, 5, 9];
    const im = new Array(6).fill(0);
    const F = bluesteinFft({ re, im });
    const back = bluesteinFft(F, true);
    for (let k = 0; k < 6; k++) {
      expect(back.re[k]).toBeCloseTo(re[k], 8);
      expect(back.im[k]).toBeCloseTo(im[k], 8);
    }
  });

  it('complex input', () => {
    const re = [1, 0, -1, 0];
    const im = [0, 1, 0, -1];
    const r = bluesteinFft({ re, im });
    const ref = dft(re, im);
    for (let k = 0; k < 4; k++) {
      expect(r.re[k]).toBeCloseTo(ref.re[k], 8);
      expect(r.im[k]).toBeCloseTo(ref.im[k], 8);
    }
  });

  it('zero input', () => {
    const r = bluesteinFft({ re: [0, 0, 0], im: [0, 0, 0] });
    for (let k = 0; k < 3; k++) {
      expect(r.re[k]).toBeCloseTo(0, 10);
      expect(r.im[k]).toBeCloseTo(0, 10);
    }
  });

  it('matches DFT for length 11', () => {
    const re = Array.from({ length: 11 }, (_, i) => Math.sin(i));
    const im = new Array(11).fill(0);
    const r = bluesteinFft({ re, im });
    const ref = dft(re, im);
    for (let k = 0; k < 11; k++) {
      expect(r.re[k]).toBeCloseTo(ref.re[k], 6);
      expect(r.im[k]).toBeCloseTo(ref.im[k], 6);
    }
  });

  it('Parseval', () => {
    const re = [1, 2, 3, 4, 5];
    const im = [0, 0, 0, 0, 0];
    const r = bluesteinFft({ re, im });
    const lhs = re.reduce((s, v, i) => s + v * v + im[i] * im[i], 0) * re.length;
    const rhs = r.re.reduce((s, v, i) => s + v * v + r.im[i] * r.im[i], 0);
    expect(lhs).toBeCloseTo(rhs, 6);
  });

  it('returns arrays of correct length', () => {
    const r = bluesteinFft({ re: [1, 2, 3, 4, 5, 6, 7], im: new Array(7).fill(0) });
    expect(r.re.length).toBe(7);
    expect(r.im.length).toBe(7);
  });
});
