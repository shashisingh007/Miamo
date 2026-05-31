import { describe, it, expect } from 'vitest';
import { pcg64Rng, Pcg64 } from '../pcg64Rng';

describe('pcg64Rng', () => {
  it('factory + class', () => {
    expect(pcg64Rng() instanceof Pcg64).toBe(true);
  });

  it('deterministic same seed', () => {
    const a = pcg64Rng(42n);
    const b = pcg64Rng(42n);
    for (let i = 0; i < 50; i += 1) expect(a.nextUint64()).toBe(b.nextUint64());
  });

  it('different seeds diverge', () => {
    const a = pcg64Rng(1n);
    const b = pcg64Rng(2n);
    let diff = 0;
    for (let i = 0; i < 20; i += 1) if (a.nextUint64() !== b.nextUint64()) diff += 1;
    expect(diff).toBeGreaterThan(15);
  });

  it('uint64 within range', () => {
    const r = pcg64Rng(7n);
    const max = (1n << 64n) - 1n;
    for (let i = 0; i < 100; i += 1) {
      const v = r.nextUint64();
      expect(v >= 0n).toBe(true);
      expect(v <= max).toBe(true);
    }
  });

  it('nextFloat in [0, 1)', () => {
    const r = pcg64Rng(99n);
    for (let i = 0; i < 1000; i += 1) {
      const v = r.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('reseed restarts stream', () => {
    const r = pcg64Rng(5n);
    const first = r.nextUint64();
    r.nextUint64();
    r.seed(5n);
    expect(r.nextUint64()).toBe(first);
  });

  it('accepts number seed', () => {
    const a = pcg64Rng(123);
    const b = pcg64Rng(123n);
    expect(a.nextUint64()).toBe(b.nextUint64());
  });

  it('non-degenerate over 500 draws', () => {
    const r = pcg64Rng(1234n);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) seen.add(r.nextUint64().toString());
    expect(seen.size).toBeGreaterThan(495);
  });

  it('mean near 0.5 on 5000 draws', () => {
    const r = pcg64Rng(2025n);
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i += 1) sum += r.nextFloat();
    expect(sum / n).toBeGreaterThan(0.45);
    expect(sum / n).toBeLessThan(0.55);
  });

  it('custom increment', () => {
    const a = pcg64Rng(1n, 99n);
    const b = pcg64Rng(1n, 100n);
    expect(a.nextUint64()).not.toBe(b.nextUint64());
  });
});
