import { describe, it, expect } from 'vitest';
import { kahanFloatSum, KahanAccumulator } from '../kahanFloatSum';

describe('kahanFloatSum', () => {
  it('rejects non-array', () => {
    expect(() => kahanFloatSum('hi' as any)).toThrow();
  });

  it('rejects non-number', () => {
    expect(() => kahanFloatSum(['1' as any])).toThrow();
  });

  it('empty => 0', () => {
    expect(kahanFloatSum([])).toBe(0);
  });

  it('single value', () => {
    expect(kahanFloatSum([42])).toBe(42);
  });

  it('two integers', () => {
    expect(kahanFloatSum([1, 2])).toBe(3);
  });

  it('matches naive for well-conditioned input', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(kahanFloatSum(arr)).toBe(15);
  });

  it('handles classic 0.1 repeated more accurately than naive', () => {
    const arr = new Array(1000).fill(0.1);
    const k = kahanFloatSum(arr);
    expect(Math.abs(k - 100)).toBeLessThan(1e-10);
  });

  it('handles big + many smalls', () => {
    const arr = [1e16, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1e16];
    expect(kahanFloatSum(arr)).toBe(10);
  });

  it('propagates NaN', () => {
    expect(Number.isNaN(kahanFloatSum([1, NaN, 2]))).toBe(true);
  });

  it('propagates Infinity', () => {
    expect(kahanFloatSum([1, Infinity])).toBe(Infinity);
  });

  it('negative values', () => {
    expect(kahanFloatSum([-1, -2, -3])).toBe(-6);
  });

  it('cancellation result', () => {
    expect(kahanFloatSum([1, -1, 1, -1])).toBe(0);
  });

  it('handles 10k random doubles to within tolerance of Math sum', () => {
    const arr: number[] = [];
    let truth = 0;
    for (let i = 0; i < 10000; i++) {
      const v = (Math.random() - 0.5) * 1000;
      arr.push(v);
      truth += v;
    }
    expect(Math.abs(kahanFloatSum(arr) - truth)).toBeLessThan(1e-6);
  });
});

describe('KahanAccumulator', () => {
  it('starts at 0', () => {
    expect(new KahanAccumulator().value).toBe(0);
  });

  it('add updates value', () => {
    const k = new KahanAccumulator();
    k.add(1).add(2);
    expect(k.value).toBe(3);
  });

  it('count tracks adds', () => {
    const k = new KahanAccumulator();
    k.add(1).add(2);
    expect(k.count).toBe(2);
  });

  it('rejects non-number', () => {
    const k = new KahanAccumulator();
    expect(() => k.add('1' as any)).toThrow();
  });

  it('reset', () => {
    const k = new KahanAccumulator();
    k.add(1).add(2);
    k.reset();
    expect(k.value).toBe(0);
    expect(k.count).toBe(0);
  });

  it('compensates 0.1 repeated', () => {
    const k = new KahanAccumulator();
    for (let i = 0; i < 1000; i++) k.add(0.1);
    expect(Math.abs(k.value - 100)).toBeLessThan(1e-10);
  });

  it('NaN propagates', () => {
    const k = new KahanAccumulator();
    k.add(NaN);
    expect(Number.isNaN(k.value)).toBe(true);
  });

  it('chainable', () => {
    const k = new KahanAccumulator();
    expect(k.add(1).add(2).add(3).value).toBe(6);
  });
});
