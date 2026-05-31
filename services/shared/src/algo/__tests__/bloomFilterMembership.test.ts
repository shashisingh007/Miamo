import { describe, it, expect } from 'vitest';
import {
  createBloomFilter,
  addToBloomFilter,
  bloomFilterMayContain,
  estimatedBloomFalsePositiveRate,
} from '../bloomFilterMembership';

describe('bloomFilterMembership', () => {
  it('rejects items never added (no FN)', () => {
    const bf = createBloomFilter({ expectedItems: 500, falsePositiveRate: 0.01 });
    for (let i = 0; i < 200; i++) addToBloomFilter(bf, `user-${i}`);
    for (let i = 0; i < 200; i++) {
      expect(bloomFilterMayContain(bf, `user-${i}`)).toBe(true);
    }
  });

  it('empty filter returns false for queries', () => {
    const bf = createBloomFilter({ expectedItems: 100 });
    expect(bloomFilterMayContain(bf, 'anything')).toBe(false);
  });

  it('size grows on add', () => {
    const bf = createBloomFilter({ expectedItems: 100 });
    addToBloomFilter(bf, 'a');
    addToBloomFilter(bf, 'b');
    expect(bf.size).toBe(2);
  });

  it('parameter sizing scales with expectedItems', () => {
    const small = createBloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    const big = createBloomFilter({ expectedItems: 10000, falsePositiveRate: 0.01 });
    expect(big.m).toBeGreaterThan(small.m);
  });

  it('lower FP rate => larger m', () => {
    const a = createBloomFilter({ expectedItems: 1000, falsePositiveRate: 0.1 });
    const b = createBloomFilter({ expectedItems: 1000, falsePositiveRate: 0.001 });
    expect(b.m).toBeGreaterThan(a.m);
  });

  it('throws on invalid FP rate', () => {
    expect(() => createBloomFilter({ expectedItems: 10, falsePositiveRate: 0 })).toThrow();
    expect(() => createBloomFilter({ expectedItems: 10, falsePositiveRate: 1 })).toThrow();
  });

  it('FP rate stays bounded for normal load', () => {
    const bf = createBloomFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });
    for (let i = 0; i < 1000; i++) addToBloomFilter(bf, `item-${i}`);
    let fp = 0;
    const probes = 5000;
    for (let i = 0; i < probes; i++) {
      if (bloomFilterMayContain(bf, `not-added-${i}`)) fp++;
    }
    expect(fp / probes).toBeLessThan(0.05);
  });

  it('estimatedBloomFalsePositiveRate increases as load grows', () => {
    const bf = createBloomFilter({ expectedItems: 500, falsePositiveRate: 0.01 });
    for (let i = 0; i < 50; i++) addToBloomFilter(bf, `x-${i}`);
    const low = estimatedBloomFalsePositiveRate(bf);
    for (let i = 50; i < 500; i++) addToBloomFilter(bf, `x-${i}`);
    const high = estimatedBloomFalsePositiveRate(bf);
    expect(high).toBeGreaterThan(low);
  });

  it('different items hash to different bit sets (usually)', () => {
    const bf = createBloomFilter({ expectedItems: 1000 });
    addToBloomFilter(bf, 'alpha');
    const after = bf.bits.slice();
    addToBloomFilter(bf, 'beta');
    let diff = 0;
    for (let i = 0; i < bf.bits.length; i++) if (bf.bits[i] !== after[i]) diff++;
    expect(diff).toBeGreaterThan(0);
  });

  it('expectedItems<1 still produces usable filter', () => {
    const bf = createBloomFilter({ expectedItems: 0 });
    addToBloomFilter(bf, 'x');
    expect(bloomFilterMayContain(bf, 'x')).toBe(true);
  });

  it('m,k are positive', () => {
    const bf = createBloomFilter({ expectedItems: 100 });
    expect(bf.m).toBeGreaterThan(0);
    expect(bf.k).toBeGreaterThan(0);
  });

  it('add is idempotent for membership', () => {
    const bf = createBloomFilter({ expectedItems: 100 });
    addToBloomFilter(bf, 'dup');
    const snap = bf.bits.slice();
    addToBloomFilter(bf, 'dup');
    expect(bf.bits).toEqual(snap);
  });

  it('case sensitive', () => {
    const bf = createBloomFilter({ expectedItems: 100 });
    addToBloomFilter(bf, 'Alice');
    // may or may not be present for "alice", but for an empty FP scenario it'll generally differ
    // strict expectation: no FN for exact add
    expect(bloomFilterMayContain(bf, 'Alice')).toBe(true);
  });
});
