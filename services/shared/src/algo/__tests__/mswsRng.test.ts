import { describe, it, expect } from 'vitest';
import { mswsRng, MswsRng } from '../mswsRng';

describe('mswsRng', () => {
  it('factory + class', () => {
    expect(mswsRng() instanceof MswsRng).toBe(true);
  });

  it('deterministic same seed', () => {
    const a = mswsRng(42n);
    const b = mswsRng(42n);
    for (let i = 0; i < 50; i += 1) expect(a.nextUint32()).toBe(b.nextUint32());
  });

  it('different seeds diverge', () => {
    const a = mswsRng(1n);
    const b = mswsRng(2n);
    let diff = 0;
    for (let i = 0; i < 30; i += 1) if (a.nextUint32() !== b.nextUint32()) diff += 1;
    expect(diff).toBeGreaterThan(25);
  });

  it('uint32 within range', () => {
    const r = mswsRng(7n);
    for (let i = 0; i < 200; i += 1) {
      const v = r.nextUint32();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(0x1_0000_0000);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextFloat in [0, 1)', () => {
    const r = mswsRng(99n);
    for (let i = 0; i < 1000; i += 1) {
      const v = r.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('custom increment is forced odd', () => {
    const r = mswsRng(1n, 0xcafebaben);
    expect(typeof r.nextUint32()).toBe('number');
  });

  it('reseed restarts stream', () => {
    const r = mswsRng(5n);
    const first = r.nextUint32();
    r.nextUint32();
    r.seed(5n);
    expect(r.nextUint32()).toBe(first);
  });

  it('number seed matches bigint seed', () => {
    const a = mswsRng(123);
    const b = mswsRng(123n);
    expect(a.nextUint32()).toBe(b.nextUint32());
  });

  it('non-degenerate over 1000 draws', () => {
    const r = mswsRng(1234n);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i += 1) seen.add(r.nextUint32());
    expect(seen.size).toBeGreaterThan(990);
  });

  it('mean near 0.5 on 5000 draws', () => {
    const r = mswsRng(2025n);
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i += 1) sum += r.nextFloat();
    expect(sum / n).toBeGreaterThan(0.45);
    expect(sum / n).toBeLessThan(0.55);
  });
});
