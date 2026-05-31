import { describe, it, expect } from 'vitest';
import { xoshiro256, Xoshiro256 } from '../xoshiro256';

const MASK64 = (1n << 64n) - 1n;

describe('xoshiro256', () => {
  it('nextUint64 in [0, 2^64)', () => {
    const r = xoshiro256(123n);
    for (let i = 0; i < 100; i += 1) {
      const v = r.nextUint64();
      expect(v >= 0n).toBe(true);
      expect(v <= MASK64).toBe(true);
    }
  });

  it('deterministic from same seed', () => {
    const a = xoshiro256(42n);
    const b = xoshiro256(42n);
    for (let i = 0; i < 50; i += 1) {
      expect(a.nextUint64()).toBe(b.nextUint64());
    }
  });

  it('different seeds diverge', () => {
    const a = xoshiro256(1n);
    const b = xoshiro256(2n);
    const seqA = Array.from({ length: 5 }, () => a.nextUint64());
    const seqB = Array.from({ length: 5 }, () => b.nextUint64());
    expect(seqA).not.toEqual(seqB);
  });

  it('accepts number seed', () => {
    const r = xoshiro256(7);
    expect(typeof r.nextUint64()).toBe('bigint');
  });

  it('default seed works', () => {
    const r = xoshiro256();
    const v = r.nextUint64();
    expect(typeof v).toBe('bigint');
  });

  it('nextFloat in [0,1)', () => {
    const r = xoshiro256(2024n);
    for (let i = 0; i < 200; i += 1) {
      const f = r.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('mean of many floats near 0.5', () => {
    const r = xoshiro256(99n);
    let sum = 0;
    const N_SAMPLES = 5000;
    for (let i = 0; i < N_SAMPLES; i += 1) sum += r.nextFloat();
    expect(sum / N_SAMPLES).toBeGreaterThan(0.45);
    expect(sum / N_SAMPLES).toBeLessThan(0.55);
  });

  it('reseed reproduces sequence', () => {
    const r = xoshiro256(11n);
    const first = r.nextUint64();
    r.seed(11n);
    expect(r.nextUint64()).toBe(first);
  });

  it('class and factory equivalent', () => {
    const a = new Xoshiro256(33n);
    const b = xoshiro256(33n);
    for (let i = 0; i < 5; i += 1) expect(a.nextUint64()).toBe(b.nextUint64());
  });

  it('seed zero does not produce all zeros', () => {
    const r = xoshiro256(0);
    let nonZero = 0;
    for (let i = 0; i < 20; i += 1) if (r.nextUint64() !== 0n) nonZero += 1;
    expect(nonZero).toBeGreaterThan(15);
  });
});
