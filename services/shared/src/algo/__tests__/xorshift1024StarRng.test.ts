import { describe, it, expect } from 'vitest';
import { xorshift1024StarRng, Xorshift1024Star } from '../xorshift1024StarRng';

describe('xorshift1024StarRng', () => {
  it('factory + class', () => {
    expect(xorshift1024StarRng() instanceof Xorshift1024Star).toBe(true);
  });

  it('deterministic for same seed', () => {
    const a = xorshift1024StarRng(42n);
    const b = xorshift1024StarRng(42n);
    for (let i = 0; i < 50; i += 1) expect(a.nextUint64()).toBe(b.nextUint64());
  });

  it('different seeds diverge', () => {
    const a = xorshift1024StarRng(1n);
    const b = xorshift1024StarRng(2n);
    let diff = 0;
    for (let i = 0; i < 20; i += 1) if (a.nextUint64() !== b.nextUint64()) diff += 1;
    expect(diff).toBeGreaterThan(15);
  });

  it('uint64 within range', () => {
    const r = xorshift1024StarRng(7n);
    const max = (1n << 64n) - 1n;
    for (let i = 0; i < 100; i += 1) {
      const v = r.nextUint64();
      expect(v >= 0n).toBe(true);
      expect(v <= max).toBe(true);
    }
  });

  it('nextFloat in [0, 1)', () => {
    const r = xorshift1024StarRng(99n);
    for (let i = 0; i < 1000; i += 1) {
      const v = r.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('seed(0) normalized to 1', () => {
    const r = xorshift1024StarRng(0n);
    expect(typeof r.nextUint64()).toBe('bigint');
  });

  it('reseed restarts stream', () => {
    const r = xorshift1024StarRng(5n);
    const first = r.nextUint64();
    r.nextUint64();
    r.seed(5n);
    expect(r.nextUint64()).toBe(first);
  });

  it('accepts number seed', () => {
    const a = xorshift1024StarRng(123);
    const b = xorshift1024StarRng(123n);
    expect(a.nextUint64()).toBe(b.nextUint64());
  });

  it('non-degenerate over 500 draws', () => {
    const r = xorshift1024StarRng(1234n);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) seen.add(r.nextUint64().toString());
    expect(seen.size).toBeGreaterThan(495);
  });

  it('mean of nextFloat near 0.5 on 5000 draws', () => {
    const r = xorshift1024StarRng(2025n);
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i += 1) sum += r.nextFloat();
    const mean = sum / n;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});
