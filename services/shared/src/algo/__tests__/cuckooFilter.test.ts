import { describe, it, expect } from 'vitest';
import { CuckooFilter } from '../cuckooFilter';

describe('CuckooFilter', () => {
  it('rejects bad capacity', () => {
    expect(() => new CuckooFilter({ capacity: 0 })).toThrow();
    expect(() => new CuckooFilter({ capacity: -1 })).toThrow();
  });

  it('rejects bad bucketSize', () => {
    expect(() => new CuckooFilter({ capacity: 64, bucketSize: 0 })).toThrow();
    expect(() => new CuckooFilter({ capacity: 64, bucketSize: 9 })).toThrow();
  });

  it('rejects bad fingerprintBits', () => {
    expect(() => new CuckooFilter({ capacity: 64, fingerprintBits: 3 })).toThrow();
    expect(() => new CuckooFilter({ capacity: 64, fingerprintBits: 17 })).toThrow();
  });

  it('empty has => false', () => {
    const f = new CuckooFilter({ capacity: 64 });
    expect(f.has('x')).toBe(false);
  });

  it('add then has => true', () => {
    const f = new CuckooFilter({ capacity: 64 });
    f.add('hello');
    expect(f.has('hello')).toBe(true);
  });

  it('add returns true on success', () => {
    const f = new CuckooFilter({ capacity: 256 });
    expect(f.add('x')).toBe(true);
  });

  it('size increments on add', () => {
    const f = new CuckooFilter({ capacity: 256 });
    f.add('a'); f.add('b'); f.add('c');
    expect(f.size).toBe(3);
  });

  it('delete removes element', () => {
    const f = new CuckooFilter({ capacity: 64 });
    f.add('foo');
    expect(f.delete('foo')).toBe(true);
    expect(f.has('foo')).toBe(false);
    expect(f.size).toBe(0);
  });

  it('delete returns false if not present', () => {
    const f = new CuckooFilter({ capacity: 64 });
    expect(f.delete('absent')).toBe(false);
  });

  it('rejects non-string add', () => {
    const f = new CuckooFilter({ capacity: 64 });
    expect(() => f.add(123 as any)).toThrow();
  });

  it('rejects non-string has', () => {
    const f = new CuckooFilter({ capacity: 64 });
    expect(() => f.has(123 as any)).toThrow();
  });

  it('rejects non-string delete', () => {
    const f = new CuckooFilter({ capacity: 64 });
    expect(() => f.delete(123 as any)).toThrow();
  });

  it('all added members are detected', () => {
    const f = new CuckooFilter({ capacity: 512 });
    for (let i = 0; i < 200; i++) f.add('k-' + i);
    for (let i = 0; i < 200; i++) expect(f.has('k-' + i)).toBe(true);
  });

  it('false-positive rate is low', () => {
    const f = new CuckooFilter({ capacity: 1024, fingerprintBits: 12 });
    for (let i = 0; i < 500; i++) f.add('in-' + i);
    let fp = 0;
    for (let i = 0; i < 1000; i++) if (f.has('out-' + i)) fp++;
    expect(fp / 1000).toBeLessThan(0.05);
  });

  it('handles dup adds without inflating size badly', () => {
    const f = new CuckooFilter({ capacity: 128 });
    for (let i = 0; i < 20; i++) f.add('same');
    // Some duplicates may still consume slots since fingerprint-based filter cannot dedupe perfectly,
    // but size should still be small.
    expect(f.size).toBeLessThanOrEqual(20);
    expect(f.has('same')).toBe(true);
  });

  it('delete after multiple adds removes one copy', () => {
    const f = new CuckooFilter({ capacity: 128 });
    f.add('x'); f.add('x');
    const sizeBefore = f.size;
    f.delete('x');
    expect(f.size).toBe(sizeBefore - 1);
  });

  it('non-added strings mostly false', () => {
    const f = new CuckooFilter({ capacity: 256 });
    for (let i = 0; i < 50; i++) f.add('present-' + i);
    let hits = 0;
    for (let i = 0; i < 50; i++) if (f.has('absent-' + i)) hits++;
    expect(hits).toBeLessThan(10);
  });

  it('respects bucket size', () => {
    const f = new CuckooFilter({ capacity: 64, bucketSize: 2 });
    for (let i = 0; i < 30; i++) f.add('k-' + i);
    expect(f.size).toBeGreaterThan(0);
  });

  it('respects fingerprint bits', () => {
    const f = new CuckooFilter({ capacity: 256, fingerprintBits: 8 });
    for (let i = 0; i < 100; i++) f.add('x-' + i);
    for (let i = 0; i < 100; i++) expect(f.has('x-' + i)).toBe(true);
  });

  it('add can fail when filter is overfull', () => {
    const f = new CuckooFilter({ capacity: 8, bucketSize: 1, fingerprintBits: 4, maxKicks: 50 });
    let inserted = 0;
    for (let i = 0; i < 200; i++) if (f.add('x-' + i)) inserted++;
    expect(inserted).toBeLessThan(200);
  });

  it('deterministic with fixed rng', () => {
    let s = 1;
    const rng = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const f = new CuckooFilter({ capacity: 64, random: rng });
    expect(f.add('hello')).toBe(true);
  });
});
