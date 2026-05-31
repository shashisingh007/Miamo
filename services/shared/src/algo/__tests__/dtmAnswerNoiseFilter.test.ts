import { describe, it, expect } from 'vitest';
import { filterAnswerNoise } from '../dtmAnswerNoiseFilter';
import type { DtmAnswerEntry } from '../dtmAnswerHistory';

function mk(value: number, atMs: number): DtmAnswerEntry {
  return { topicKey: 'values', value, atMs };
}

describe('dtmAnswerNoiseFilter', () => {
  it('keeps well-spaced varied answers', () => {
    const r = filterAnswerNoise([mk(0.1, 0), mk(-0.4, 1000), mk(0.7, 2000)]);
    expect(r.clean).toHaveLength(3);
    expect(r.dropped).toBe(0);
  });

  it('drops rapid-fire submissions', () => {
    const r = filterAnswerNoise([mk(0.1, 0), mk(0.2, 50), mk(0.3, 100)], { minIntervalMs: 500 });
    expect(r.reasons.too_fast).toBeGreaterThan(0);
    expect(r.clean.length).toBeLessThan(3);
  });

  it('drops all-same streaks beyond threshold', () => {
    const arr = Array.from({ length: 10 }, (_, i) => mk(0.5, i * 1000));
    const r = filterAnswerNoise(arr, { allSameThreshold: 4 });
    expect(r.reasons.all_same).toBeGreaterThan(0);
  });

  it('drops alternating sign pattern beyond threshold', () => {
    const arr = Array.from({ length: 20 }, (_, i) => mk(i % 2 === 0 ? 1 : -1, i * 1000));
    const r = filterAnswerNoise(arr, { alternationThreshold: 5 });
    expect(r.reasons.alternating).toBeGreaterThan(0);
  });

  it('sorts unordered input chronologically', () => {
    const r = filterAnswerNoise([mk(0.1, 2000), mk(0.2, 1000), mk(0.3, 0)]);
    expect(r.clean.map((a) => a.atMs)).toEqual([0, 1000, 2000]);
  });

  it('respects custom minIntervalMs=0 (no rate cap)', () => {
    const r = filterAnswerNoise([mk(0.1, 0), mk(0.2, 1)], { minIntervalMs: 0 });
    expect(r.clean).toHaveLength(2);
  });

  it('empty input returns empty', () => {
    const r = filterAnswerNoise([]);
    expect(r).toEqual({ clean: [], dropped: 0, reasons: { too_fast: 0, all_same: 0, alternating: 0 } });
  });

  it('reasons sum equals dropped count', () => {
    const arr = Array.from({ length: 10 }, (_, i) => mk(0.5, i * 100));
    const r = filterAnswerNoise(arr);
    const total = r.reasons.too_fast + r.reasons.all_same + r.reasons.alternating;
    expect(total).toBe(r.dropped);
  });

  it('mixed scenario: keeps good entries even after drops', () => {
    const arr: DtmAnswerEntry[] = [
      mk(0.5, 0),
      mk(0.5, 50),    // too fast
      mk(-0.4, 2000), // ok
      mk(0.8, 3000),  // ok
    ];
    const r = filterAnswerNoise(arr, { minIntervalMs: 500 });
    expect(r.clean.length).toBeGreaterThanOrEqual(2);
  });

  it('floor thresholds: allSameThreshold<2 raises to 2', () => {
    const arr = [mk(0.5, 0), mk(0.5, 1000)];
    const r = filterAnswerNoise(arr, { allSameThreshold: 1 });
    expect(r.reasons.all_same).toBeGreaterThanOrEqual(1);
  });
});
