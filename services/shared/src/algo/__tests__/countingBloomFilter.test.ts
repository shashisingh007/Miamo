import { describe, it, expect } from 'vitest';
import { CountingBloomFilter } from '../countingBloomFilter';

describe('CountingBloomFilter', () => {
  it('rejects bad capacity', () => {
    expect(() => new CountingBloomFilter({ capacity: 0, falsePositiveRate: 0.01 })).toThrow();
    expect(() => new CountingBloomFilter({ capacity: -5, falsePositiveRate: 0.01 })).toThrow();
    expect(() => new CountingBloomFilter({ capacity: 1.5, falsePositiveRate: 0.01 })).toThrow();
  });

  it('rejects bad FPR', () => {
    expect(() => new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0 })).toThrow();
    expect(() => new CountingBloomFilter({ capacity: 100, falsePositiveRate: 1 })).toThrow();
    expect(() => new CountingBloomFilter({ capacity: 100, falsePositiveRate: NaN })).toThrow();
  });

  it('rejects bad counterBits', () => {
    expect(() => new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01, counterBits: 3 })).toThrow();
    expect(() => new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01, counterBits: 9 })).toThrow();
  });

  it('empty has => false', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    expect(f.has('x')).toBe(false);
  });

  it('add then has => true', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    f.add('hello');
    expect(f.has('hello')).toBe(true);
  });

  it('size increments on add', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    f.add('a'); f.add('b'); f.add('c');
    expect(f.size).toBe(3);
  });

  it('rejects non-string add', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    expect(() => f.add(123 as any)).toThrow();
  });

  it('rejects non-string has', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    expect(() => f.has(123 as any)).toThrow();
  });

  it('rejects non-string delete', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    expect(() => f.delete(123 as any)).toThrow();
  });

  it('delete returns true if present', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    f.add('x');
    expect(f.delete('x')).toBe(true);
    expect(f.has('x')).toBe(false);
  });

  it('delete returns false if absent', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    expect(f.delete('absent')).toBe(false);
  });

  it('all 100 added members detected', () => {
    const f = new CountingBloomFilter({ capacity: 200, falsePositiveRate: 0.01 });
    for (let i = 0; i < 100; i++) f.add('k-' + i);
    for (let i = 0; i < 100; i++) expect(f.has('k-' + i)).toBe(true);
  });

  it('observed FPR below ~2x target', () => {
    const target = 0.01;
    const f = new CountingBloomFilter({ capacity: 1000, falsePositiveRate: target });
    for (let i = 0; i < 1000; i++) f.add('in-' + i);
    let fp = 0;
    for (let i = 0; i < 2000; i++) if (f.has('out-' + i)) fp++;
    expect(fp / 2000).toBeLessThan(target * 4);
  });

  it('double add then delete still present', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    f.add('x'); f.add('x');
    f.delete('x');
    expect(f.has('x')).toBe(true);
  });

  it('reset clears state', () => {
    const f = new CountingBloomFilter({ capacity: 50, falsePositiveRate: 0.01 });
    for (let i = 0; i < 50; i++) f.add('x-' + i);
    f.reset();
    expect(f.size).toBe(0);
    expect(f.has('x-0')).toBe(false);
  });

  it('hashCount and bitCount sized for capacity', () => {
    const f = new CountingBloomFilter({ capacity: 1000, falsePositiveRate: 0.001 });
    expect(f.bitCount).toBeGreaterThan(1000);
    expect(f.hashCount).toBeGreaterThan(1);
  });

  it('counterBits=8 has counterMax=255', () => {
    const f = new CountingBloomFilter({ capacity: 50, falsePositiveRate: 0.01, counterBits: 8 });
    expect(f.counterMax).toBe(255);
  });

  it('counterBits=4 has counterMax=15', () => {
    const f = new CountingBloomFilter({ capacity: 50, falsePositiveRate: 0.01, counterBits: 4 });
    expect(f.counterMax).toBe(15);
  });

  it('size decrements on successful delete', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    f.add('x');
    f.delete('x');
    expect(f.size).toBe(0);
  });

  it('size unaffected by failed delete', () => {
    const f = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01 });
    f.add('x');
    f.delete('absent');
    expect(f.size).toBe(1);
  });

  it('different seeds yield independent filters', () => {
    const a = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01, seed: 1 });
    const b = new CountingBloomFilter({ capacity: 100, falsePositiveRate: 0.01, seed: 2 });
    a.add('hello');
    b.add('hello');
    expect(a.has('hello')).toBe(true);
    expect(b.has('hello')).toBe(true);
  });
});
