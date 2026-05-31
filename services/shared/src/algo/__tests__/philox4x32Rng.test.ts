import { describe, it, expect } from 'vitest';
import { philox4x32Rng, Philox4x32 } from '../philox4x32Rng';

describe('philox4x32Rng', () => {
  it('factory + class', () => {
    expect(philox4x32Rng() instanceof Philox4x32).toBe(true);
  });

  it('deterministic for same seed and key', () => {
    const a = philox4x32Rng(42);
    const b = philox4x32Rng(42);
    for (let i = 0; i < 50; i += 1) {
      expect(a.nextUint32()).toBe(b.nextUint32());
    }
  });

  it('different seeds diverge', () => {
    const a = philox4x32Rng(1);
    const b = philox4x32Rng(2);
    let diff = 0;
    for (let i = 0; i < 20; i += 1) {
      if (a.nextUint32() !== b.nextUint32()) diff += 1;
    }
    expect(diff).toBeGreaterThan(15);
  });

  it('uint32 within range', () => {
    const r = philox4x32Rng(7);
    for (let i = 0; i < 100; i += 1) {
      const v = r.nextUint32();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextFloat in [0, 1)', () => {
    const r = philox4x32Rng(99);
    for (let i = 0; i < 1000; i += 1) {
      const v = r.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('reseed restarts stream', () => {
    const r = philox4x32Rng(5);
    const first = r.nextUint32();
    r.nextUint32();
    r.seed(5);
    expect(r.nextUint32()).toBe(first);
  });

  it('different keys diverge', () => {
    const a = philox4x32Rng(0, [1, 2]);
    const b = philox4x32Rng(0, [3, 4]);
    expect(a.nextUint32()).not.toBe(b.nextUint32());
  });

  it('non-degenerate over many draws', () => {
    const r = philox4x32Rng(1234);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) seen.add(r.nextUint32());
    expect(seen.size).toBeGreaterThan(495);
  });

  it('mean of nextFloat near 0.5 on 5000 draws', () => {
    const r = philox4x32Rng(2025);
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i += 1) sum += r.nextFloat();
    const mean = sum / n;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('bigint seed accepted', () => {
    const a = philox4x32Rng(7n);
    const b = philox4x32Rng(7);
    expect(a.nextUint32()).toBe(b.nextUint32());
  });
});
