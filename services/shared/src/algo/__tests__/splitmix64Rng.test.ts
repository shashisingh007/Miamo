import { describe, it, expect } from 'vitest';
import { splitmix64Rng, Splitmix64 } from '../splitmix64Rng';

const MASK64 = (1n << 64n) - 1n;

describe('splitmix64Rng', () => {
  it('values in [0, 2^64)', () => {
    const r = splitmix64Rng(123n);
    for (let i = 0; i < 100; i += 1) {
      const v = r.nextUint64();
      expect(v >= 0n && v <= MASK64).toBe(true);
    }
  });

  it('deterministic', () => {
    const a = splitmix64Rng(7n);
    const b = splitmix64Rng(7n);
    for (let i = 0; i < 50; i += 1) {
      expect(a.nextUint64()).toBe(b.nextUint64());
    }
  });

  it('seed 0 reproduces known first output', () => {
    const r = splitmix64Rng(0n);
    // First three known SplitMix64 outputs for seed 0
    expect(r.nextUint64()).toBe(0xe220a8397b1dcdafn);
    expect(r.nextUint64()).toBe(0x6e789e6aa1b965f4n);
    expect(r.nextUint64()).toBe(0x06c45d188009454fn);
  });

  it('different seeds diverge', () => {
    const a = splitmix64Rng(1n);
    const b = splitmix64Rng(2n);
    expect(a.nextUint64()).not.toBe(b.nextUint64());
  });

  it('nextFloat in [0,1)', () => {
    const r = splitmix64Rng(42n);
    for (let i = 0; i < 200; i += 1) {
      const f = r.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('mean ~ 0.5', () => {
    const r = splitmix64Rng(2025n);
    let s = 0;
    const N_SAMPLES = 5000;
    for (let i = 0; i < N_SAMPLES; i += 1) s += r.nextFloat();
    expect(s / N_SAMPLES).toBeGreaterThan(0.45);
    expect(s / N_SAMPLES).toBeLessThan(0.55);
  });

  it('reseed resets', () => {
    const r = splitmix64Rng(13n);
    const first = r.nextUint64();
    r.seed(13n);
    expect(r.nextUint64()).toBe(first);
  });

  it('factory and class equivalent', () => {
    const a = new Splitmix64(5n);
    const b = splitmix64Rng(5n);
    for (let i = 0; i < 5; i += 1) expect(a.nextUint64()).toBe(b.nextUint64());
  });

  it('accepts number seed', () => {
    const r = splitmix64Rng(8);
    expect(typeof r.nextUint64()).toBe('bigint');
  });

  it('default seed works', () => {
    const r = splitmix64Rng();
    expect(typeof r.nextUint64()).toBe('bigint');
  });
});
