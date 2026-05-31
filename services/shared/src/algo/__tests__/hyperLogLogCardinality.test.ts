import { describe, it, expect } from 'vitest';
import { HyperLogLog } from '../hyperLogLogCardinality';

describe('HyperLogLog', () => {
  it('constructs with valid precision', () => {
    const hll = new HyperLogLog({ precision: 10 });
    expect(hll.precision).toBe(10);
    expect(hll.m).toBe(1024);
  });

  it('rejects precision < 4', () => {
    expect(() => new HyperLogLog({ precision: 3 })).toThrow();
  });

  it('rejects precision > 16', () => {
    expect(() => new HyperLogLog({ precision: 17 })).toThrow();
  });

  it('rejects non-integer precision', () => {
    expect(() => new HyperLogLog({ precision: 4.5 })).toThrow();
  });

  it('rejects non-string value', () => {
    const hll = new HyperLogLog({ precision: 8 });
    expect(() => hll.add(123 as any)).toThrow();
  });

  it('empty => 0', () => {
    expect(new HyperLogLog({ precision: 10 }).estimate()).toBe(0);
  });

  it('single item => approx 1', () => {
    const hll = new HyperLogLog({ precision: 12 });
    hll.add('one');
    expect(hll.estimate()).toBeGreaterThanOrEqual(1);
    expect(hll.estimate()).toBeLessThanOrEqual(3);
  });

  it('duplicates do not inflate', () => {
    const hll = new HyperLogLog({ precision: 12 });
    for (let i = 0; i < 1000; i++) hll.add('same');
    expect(hll.estimate()).toBeLessThanOrEqual(5);
  });

  it('estimates 1000 distinct within ~15% error', () => {
    const hll = new HyperLogLog({ precision: 14 });
    for (let i = 0; i < 1000; i++) hll.add('item-' + i);
    const est = hll.estimate();
    expect(est).toBeGreaterThan(850);
    expect(est).toBeLessThan(1150);
  });

  it('estimates 10000 distinct within ~15% error', () => {
    const hll = new HyperLogLog({ precision: 14 });
    for (let i = 0; i < 10000; i++) hll.add('x-' + i);
    const est = hll.estimate();
    expect(est).toBeGreaterThan(8500);
    expect(est).toBeLessThan(11500);
  });

  it('small range correction handles tiny cardinality', () => {
    const hll = new HyperLogLog({ precision: 12 });
    for (let i = 0; i < 10; i++) hll.add('z-' + i);
    const est = hll.estimate();
    expect(est).toBeGreaterThanOrEqual(7);
    expect(est).toBeLessThanOrEqual(13);
  });

  it('merge combines two sketches', () => {
    const a = new HyperLogLog({ precision: 12, seed: 1 });
    const b = new HyperLogLog({ precision: 12, seed: 1 });
    for (let i = 0; i < 500; i++) a.add('a-' + i);
    for (let i = 0; i < 500; i++) b.add('b-' + i);
    a.merge(b);
    const est = a.estimate();
    expect(est).toBeGreaterThan(600);
    expect(est).toBeLessThan(1200);
  });

  it('merge of overlapping sets is union not sum', () => {
    const a = new HyperLogLog({ precision: 12, seed: 7 });
    const b = new HyperLogLog({ precision: 12, seed: 7 });
    for (let i = 0; i < 500; i++) a.add('k-' + i);
    for (let i = 0; i < 500; i++) b.add('k-' + i);
    a.merge(b);
    const est = a.estimate();
    expect(est).toBeLessThan(600);
  });

  it('merge rejects mismatched precision', () => {
    const a = new HyperLogLog({ precision: 10 });
    const b = new HyperLogLog({ precision: 12 });
    expect(() => a.merge(b)).toThrow();
  });

  it('merge rejects mismatched seed', () => {
    const a = new HyperLogLog({ precision: 10, seed: 1 });
    const b = new HyperLogLog({ precision: 10, seed: 2 });
    expect(() => a.merge(b)).toThrow();
  });

  it('reset clears estimate', () => {
    const hll = new HyperLogLog({ precision: 8 });
    for (let i = 0; i < 100; i++) hll.add('x' + i);
    hll.reset();
    expect(hll.estimate()).toBe(0);
  });

  it('m = 2^precision', () => {
    expect(new HyperLogLog({ precision: 4 }).m).toBe(16);
    expect(new HyperLogLog({ precision: 16 }).m).toBe(65536);
  });

  it('different seeds yield independent estimators', () => {
    const a = new HyperLogLog({ precision: 12, seed: 1 });
    const b = new HyperLogLog({ precision: 12, seed: 2 });
    for (let i = 0; i < 1000; i++) {
      a.add('x-' + i);
      b.add('x-' + i);
    }
    const ea = a.estimate();
    const eb = b.estimate();
    expect(ea).toBeGreaterThan(700);
    expect(eb).toBeGreaterThan(700);
  });

  it('deterministic given same insertions', () => {
    const a = new HyperLogLog({ precision: 10, seed: 42 });
    const b = new HyperLogLog({ precision: 10, seed: 42 });
    for (let i = 0; i < 200; i++) {
      a.add('q-' + i);
      b.add('q-' + i);
    }
    expect(a.estimate()).toBe(b.estimate());
  });
});
