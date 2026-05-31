import { describe, it, expect } from 'vitest';
import { pcg32Rng, Pcg32 } from '../pcg32Rng';

describe('pcg32Rng', () => {
  it('factory + class', () => {
    expect(pcg32Rng() instanceof Pcg32).toBe(true);
  });

  it('deterministic for same seed and stream', () => {
    const a = pcg32Rng(42n, 1n);
    const b = pcg32Rng(42n, 1n);
    for (let i = 0; i < 50; i += 1) expect(a.nextUint32()).toBe(b.nextUint32());
  });

  it('different streams diverge', () => {
    const a = pcg32Rng(42n, 1n);
    const b = pcg32Rng(42n, 2n);
    let diff = 0;
    for (let i = 0; i < 20; i += 1) {
      if (a.nextUint32() !== b.nextUint32()) diff += 1;
    }
    expect(diff).toBeGreaterThan(15);
  });

  it('uint32 within range', () => {
    const r = pcg32Rng(7n);
    for (let i = 0; i < 100; i += 1) {
      const v = r.nextUint32();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextFloat in [0, 1)', () => {
    const r = pcg32Rng(99n);
    for (let i = 0; i < 1000; i += 1) {
      const v = r.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('reseed restarts stream', () => {
    const r = pcg32Rng(5n);
    const first = r.nextUint32();
    r.nextUint32();
    r.seed(5n);
    expect(r.nextUint32()).toBe(first);
  });

  it('mean of nextFloat near 0.5 on 5000 draws', () => {
    const r = pcg32Rng(2025n);
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i += 1) sum += r.nextFloat();
    const mean = sum / n;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('non-degenerate over many draws', () => {
    const r = pcg32Rng(1234n);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) seen.add(r.nextUint32());
    expect(seen.size).toBeGreaterThan(495);
  });

  it('accepts number seed', () => {
    const a = pcg32Rng(123);
    const b = pcg32Rng(123n);
    expect(a.nextUint32()).toBe(b.nextUint32());
  });

  it('different seeds diverge', () => {
    const a = pcg32Rng(1n);
    const b = pcg32Rng(2n);
    let diff = 0;
    for (let i = 0; i < 20; i += 1) if (a.nextUint32() !== b.nextUint32()) diff += 1;
    expect(diff).toBeGreaterThan(15);
  });
});
