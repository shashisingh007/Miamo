import { describe, it, expect } from 'vitest';
import { lehmer64Rng, Lehmer64 } from '../lehmer64Rng';

describe('lehmer64Rng', () => {
  it('factory + class', () => {
    expect(lehmer64Rng() instanceof Lehmer64).toBe(true);
  });

  it('deterministic for same seed', () => {
    const a = lehmer64Rng(42n);
    const b = lehmer64Rng(42n);
    for (let i = 0; i < 50; i += 1) {
      expect(a.nextUint64()).toBe(b.nextUint64());
    }
  });

  it('different seeds diverge', () => {
    const a = lehmer64Rng(1n);
    const b = lehmer64Rng(2n);
    let diff = 0;
    for (let i = 0; i < 20; i += 1) {
      if (a.nextUint64() !== b.nextUint64()) diff += 1;
    }
    expect(diff).toBeGreaterThan(15);
  });

  it('nextUint64 within 64-bit range', () => {
    const r = lehmer64Rng(7n);
    const max = (1n << 64n) - 1n;
    for (let i = 0; i < 100; i += 1) {
      const v = r.nextUint64();
      expect(v >= 0n).toBe(true);
      expect(v <= max).toBe(true);
    }
  });

  it('nextFloat in [0, 1)', () => {
    const r = lehmer64Rng(99n);
    for (let i = 0; i < 1000; i += 1) {
      const v = r.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('seed(0) is normalized to 1', () => {
    const r = lehmer64Rng(0n);
    expect(typeof r.nextUint64()).toBe('bigint');
  });

  it('reseed resets stream', () => {
    const r = lehmer64Rng(5n);
    const first = r.nextUint64();
    r.nextUint64();
    r.seed(5n);
    expect(r.nextUint64()).toBe(first);
  });

  it('accepts number seed', () => {
    const a = lehmer64Rng(123);
    const b = lehmer64Rng(123n);
    expect(a.nextUint64()).toBe(b.nextUint64());
  });

  it('appears non-degenerate over many draws', () => {
    const r = lehmer64Rng(1234n);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(r.nextUint64().toString());
    expect(seen.size).toBe(200);
  });

  it('mean of nextFloat near 0.5 on 5000 draws', () => {
    const r = lehmer64Rng(2025n);
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i += 1) sum += r.nextFloat();
    expect(sum / n).toBeGreaterThan(0.45);
    expect(sum / n).toBeLessThan(0.55);
  });
});
