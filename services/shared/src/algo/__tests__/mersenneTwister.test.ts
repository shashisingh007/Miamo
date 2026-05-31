import { describe, it, expect } from 'vitest';
import { mersenneTwister, MersenneTwister } from '../mersenneTwister';

describe('mersenneTwister', () => {
  it('produces uint32 in range', () => {
    const r = mersenneTwister(42);
    for (let i = 0; i < 100; i += 1) {
      const v = r.nextUint32();
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('deterministic from same seed', () => {
    const a = mersenneTwister(123);
    const b = mersenneTwister(123);
    for (let i = 0; i < 50; i += 1) {
      expect(a.nextUint32()).toBe(b.nextUint32());
    }
  });

  it('different seeds diverge', () => {
    const a = mersenneTwister(1);
    const b = mersenneTwister(2);
    const seqA = Array.from({ length: 5 }, () => a.nextUint32());
    const seqB = Array.from({ length: 5 }, () => b.nextUint32());
    expect(seqA).not.toEqual(seqB);
  });

  it('nextFloat in [0,1)', () => {
    const r = mersenneTwister(7);
    for (let i = 0; i < 200; i += 1) {
      const f = r.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('reseeding resets sequence', () => {
    const r = mersenneTwister(99);
    const first = r.nextUint32();
    r.seed(99);
    expect(r.nextUint32()).toBe(first);
  });

  it('default seed works', () => {
    const r = mersenneTwister();
    expect(typeof r.nextUint32()).toBe('number');
  });

  it('throws on non-finite seed', () => {
    expect(() => mersenneTwister(NaN)).toThrow();
  });

  it('mean of many floats near 0.5', () => {
    const r = mersenneTwister(2024);
    let sum = 0;
    const N_SAMPLES = 5000;
    for (let i = 0; i < N_SAMPLES; i += 1) sum += r.nextFloat();
    const mean = sum / N_SAMPLES;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('class constructor and factory equivalent', () => {
    const a = new MersenneTwister(11);
    const b = mersenneTwister(11);
    for (let i = 0; i < 5; i += 1) expect(a.nextUint32()).toBe(b.nextUint32());
  });

  it('crosses the regeneration boundary correctly', () => {
    const r = mersenneTwister(1);
    const seq: number[] = [];
    for (let i = 0; i < 1300; i += 1) seq.push(r.nextUint32());
    // Same seed regenerated should reproduce
    const r2 = mersenneTwister(1);
    for (let i = 0; i < 1300; i += 1) expect(r2.nextUint32()).toBe(seq[i]);
  });
});
