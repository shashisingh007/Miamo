import { describe, it, expect } from 'vitest';
import { berlekampMassey } from '../berlekampMassey';

describe('berlekampMassey', () => {
  it('all zeros => L=0', () => {
    const r = berlekampMassey([0, 0, 0, 0, 0, 0]);
    expect(r.L).toBe(0);
    expect(r.c).toEqual([1]);
  });

  it('single 1 sets L=1', () => {
    const r = berlekampMassey([1]);
    expect(r.L).toBe(1);
  });

  it('alternating 1,0,1,0,1,0 => L<=2', () => {
    const r = berlekampMassey([1, 0, 1, 0, 1, 0]);
    expect(r.L).toBeLessThanOrEqual(2);
    expect(r.L).toBeGreaterThanOrEqual(1);
  });

  it('1,1,1,1,1 => L=1', () => {
    const r = berlekampMassey([1, 1, 1, 1, 1]);
    expect(r.L).toBe(1);
  });

  it('Fibonacci-like LFSR L=2: 0,1,1,0,1,1,0,1,1', () => {
    // s_n = s_{n-1} XOR s_{n-2}, with s0=0,s1=1 → period 3: 0,1,1,0,1,1,...
    const seq = [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1];
    const r = berlekampMassey(seq);
    expect(r.L).toBeLessThanOrEqual(2);
  });

  it('throws on non-binary', () => {
    expect(() => berlekampMassey([0, 1, 2])).toThrow();
  });

  it('throws on non-array', () => {
    expect(() => berlekampMassey('1010' as any)).toThrow();
  });

  it('empty seq => L=0', () => {
    const r = berlekampMassey([]);
    expect(r.L).toBe(0);
    expect(r.c).toEqual([1]);
  });

  it('c[0] is always 1', () => {
    const r = berlekampMassey([1, 0, 0, 1, 1, 0, 1]);
    expect(r.c[0]).toBe(1);
  });

  it('connection polynomial length is L+1', () => {
    const r = berlekampMassey([1, 0, 1, 1, 0, 1, 0, 0, 1]);
    expect(r.c).toHaveLength(r.L + 1);
  });

  it('coefficients are 0 or 1', () => {
    const r = berlekampMassey([1, 1, 0, 0, 1, 0, 1, 1, 0, 1]);
    for (const v of r.c) expect(v === 0 || v === 1).toBe(true);
  });

  it('long period-7 LFSR L<=3', () => {
    // x^3 + x + 1 LFSR period 7: 1,0,0,1,0,1,1,1,0,0,1,0,1,1,...
    const seq = [1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1];
    const r = berlekampMassey(seq);
    expect(r.L).toBeLessThanOrEqual(3);
  });

  it('random complexity bounded by n', () => {
    const seq = Array.from({ length: 20 }, (_, i) => (i * 13 + 7) % 2);
    const r = berlekampMassey(seq);
    expect(r.L).toBeLessThanOrEqual(seq.length);
  });

  it('all ones except last zero', () => {
    const r = berlekampMassey([1, 1, 1, 1, 0]);
    expect(r.L).toBeGreaterThan(0);
  });
});
