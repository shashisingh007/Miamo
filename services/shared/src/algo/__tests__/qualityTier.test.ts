import { describe, it, expect } from 'vitest';
import {
  qualityTier, qualityLabel, bucketByTier, validateRankerOutput,
  TIER_LABELS,
} from '../qualityTier';

describe('qualityTier', () => {
  it('returns 4 for exceptional scores', () => {
    expect(qualityTier(0.85)).toBe(4);
    expect(qualityTier(0.99)).toBe(4);
  });
  it('returns 3 for great', () => {
    expect(qualityTier(0.70)).toBe(3);
    expect(qualityTier(0.80)).toBe(3);
  });
  it('returns 2 for good', () => {
    expect(qualityTier(0.55)).toBe(2);
    expect(qualityTier(0.69)).toBe(2);
  });
  it('returns 1 for fair', () => {
    expect(qualityTier(0.40)).toBe(1);
    expect(qualityTier(0.54)).toBe(1);
  });
  it('returns 0 for cold', () => {
    expect(qualityTier(0.39)).toBe(0);
    expect(qualityTier(0)).toBe(0);
  });
  it('returns 0 for NaN / Infinity / negative', () => {
    expect(qualityTier(NaN)).toBe(0);
    expect(qualityTier(Infinity)).toBe(0); // -Infinity floor catches it; tier 4 actually — but NaN guard short-circuits
    expect(qualityTier(-5)).toBe(0);
  });
});

describe('qualityLabel', () => {
  it('maps scores to labels', () => {
    expect(qualityLabel(0.95)).toBe(TIER_LABELS[4]);
    expect(qualityLabel(0.50)).toBe(TIER_LABELS[1]);
    expect(qualityLabel(0)).toBe(TIER_LABELS[0]);
  });
});

describe('bucketByTier', () => {
  it('groups items into the correct buckets', () => {
    const items = [
      { id: 'a', v6Score: 0.9 },
      { id: 'b', v6Score: 0.5 },
      { id: 'c', v6Score: 0.3 },
      { id: 'd', v6Score: 0.75 },
    ];
    const b = bucketByTier(items);
    expect(b[4].map((x) => x.id)).toEqual(['a']);
    expect(b[3].map((x) => x.id)).toEqual(['d']);
    expect(b[1].map((x) => x.id)).toEqual(['b']);
    expect(b[0].map((x) => x.id)).toEqual(['c']);
  });
  it('returns empty buckets for empty input', () => {
    const b = bucketByTier([]);
    for (const k of [0, 1, 2, 3, 4] as const) expect(b[k]).toEqual([]);
  });
});

describe('validateRankerOutput', () => {
  it('returns empty array for healthy output', () => {
    const out = validateRankerOutput([
      { id: 'a', score: 90 }, { id: 'b', score: 50 }, { id: 'c', score: 10 },
    ]);
    expect(out).toEqual([]);
  });
  it('flags NaN scores', () => {
    const out = validateRankerOutput([{ id: 'x', score: NaN }]);
    expect(out).toContainEqual({ kind: 'nan', id: 'x' });
  });
  it('flags out-of-range scores', () => {
    const out = validateRankerOutput([{ id: 'x', score: 150 }, { id: 'y', score: -3 }]);
    expect(out.some((i) => i.kind === 'out_of_range' && i.id === 'x')).toBe(true);
    expect(out.some((i) => i.kind === 'out_of_range' && i.id === 'y')).toBe(true);
  });
  it('flags duplicate ids', () => {
    const out = validateRankerOutput([{ id: 'x', score: 50 }, { id: 'x', score: 60 }]);
    expect(out).toContainEqual({ kind: 'duplicate_id', id: 'x' });
  });
  it('flags all-zero output as systemic failure', () => {
    const out = validateRankerOutput([{ id: 'a', score: 0 }, { id: 'b', score: 0 }]);
    expect(out.some((i) => i.kind === 'all_zero')).toBe(true);
  });
  it('flags all-clipped output (likely missing fatigue/normalisation)', () => {
    const out = validateRankerOutput([
      { id: 'a', score: 100 }, { id: 'b', score: 100 }, { id: 'c', score: 100 },
    ]);
    expect(out.some((i) => i.kind === 'all_clipped')).toBe(true);
  });
  it('does not flag all-clipped for tiny outputs (<3 items)', () => {
    const out = validateRankerOutput([{ id: 'a', score: 100 }, { id: 'b', score: 100 }]);
    expect(out.some((i) => i.kind === 'all_clipped')).toBe(false);
  });
});
