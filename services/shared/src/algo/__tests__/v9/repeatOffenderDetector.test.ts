import { describe, it, expect } from 'vitest';
import {
  detectOffenderPatterns,
  featureDampener,
  computeFeatureDampeners,
  DEFAULT_MIN_SAMPLE_THRESHOLD,
  DAMPENER_FLOOR,
  type MatchHistoryEntry,
} from '../../v9/repeatOffenderDetector';

const mk = (feature: string, wasUnmatched: boolean): MatchHistoryEntry => ({ feature, wasUnmatched });

describe('v9/repeatOffenderDetector — detectOffenderPatterns', () => {
  it('returns [] for empty history', () => {
    expect(detectOffenderPatterns([])).toEqual([]);
  });

  it('respects the sample threshold (5 by default)', () => {
    // 4 wordsmith matches, all unmatched — below threshold, no pattern emitted.
    const hist = Array(4).fill(0).map(() => mk('archetype:wordsmith', true));
    expect(detectOffenderPatterns(hist)).toEqual([]);
  });

  it('emits a pattern once the threshold is met', () => {
    const hist: MatchHistoryEntry[] = [
      mk('archetype:wordsmith', true), mk('archetype:wordsmith', true),
      mk('archetype:wordsmith', true), mk('archetype:wordsmith', true),
      mk('archetype:wordsmith', true),
    ];
    const patterns = detectOffenderPatterns(hist);
    expect(patterns.length).toBe(1);
    expect(patterns[0].feature).toBe('archetype:wordsmith');
    expect(patterns[0].matchCount).toBe(5);
    expect(patterns[0].unmatchCount).toBe(5);
    expect(patterns[0].regretRate).toBe(1);
  });

  it('Priya case: 5 unmatches / 6 wordsmith matches → 0.833 regret rate', () => {
    const hist: MatchHistoryEntry[] = [
      mk('archetype:wordsmith', true), mk('archetype:wordsmith', true),
      mk('archetype:wordsmith', true), mk('archetype:wordsmith', true),
      mk('archetype:wordsmith', true), mk('archetype:wordsmith', false),
    ];
    const p = detectOffenderPatterns(hist);
    expect(p).toHaveLength(1);
    expect(p[0].regretRate).toBeCloseTo(5 / 6, 6);
    // confidence = 1 - 1/(6+1) = 6/7
    expect(p[0].confidence).toBeCloseTo(6 / 7, 6);
  });

  it('multiple features are bucketed independently', () => {
    const hist: MatchHistoryEntry[] = [
      ...Array(5).fill(0).map(() => mk('attribute:smoker', true)),
      ...Array(5).fill(0).map(() => mk('height_bucket:tall', false)),
      ...Array(3).fill(0).map(() => mk('archetype:wordsmith', true)), // below threshold
    ];
    const p = detectOffenderPatterns(hist);
    expect(p).toHaveLength(2);
    const smoker = p.find((x) => x.feature === 'attribute:smoker')!;
    const tall = p.find((x) => x.feature === 'height_bucket:tall')!;
    expect(smoker.regretRate).toBe(1);
    expect(tall.regretRate).toBe(0);
  });

  it('custom minSampleThreshold=3 emits below the default threshold', () => {
    const hist = Array(3).fill(0).map(() => mk('archetype:wordsmith', true));
    expect(detectOffenderPatterns(hist)).toEqual([]);
    expect(detectOffenderPatterns(hist, 3)).toHaveLength(1);
  });

  it('minSampleThreshold=0 is coerced up to 1', () => {
    const hist = [mk('x', true)];
    expect(detectOffenderPatterns(hist, 0)).toHaveLength(1);
  });

  it('regretRate never exceeds 1 even if input is malformed', () => {
    // no path today produces >1 but the clip is defensive.
    const hist = Array(10).fill(0).map(() => mk('x', true));
    const p = detectOffenderPatterns(hist);
    expect(p[0].regretRate).toBe(1);
  });

  it('DEFAULT_MIN_SAMPLE_THRESHOLD constant is 5', () => {
    expect(DEFAULT_MIN_SAMPLE_THRESHOLD).toBe(5);
  });
});

describe('v9/repeatOffenderDetector — featureDampener', () => {
  it('returns {} for []', () => {
    expect(featureDampener([])).toEqual({});
  });

  it('regretRate=0 → dampener=1 (no dampening)', () => {
    const hist = Array(10).fill(0).map(() => mk('x', false));
    const d = computeFeatureDampeners(hist);
    expect(d['x']).toBe(1);
  });

  it('regretRate=1 with high confidence → floor 0.5', () => {
    const hist = Array(20).fill(0).map(() => mk('x', true));
    const d = computeFeatureDampeners(hist);
    // damp = 1 - 0.5 * 1 * (20/21) ≈ 0.5238, floor is 0.5 so we're at ~0.524
    expect(d['x']).toBeGreaterThanOrEqual(DAMPENER_FLOOR);
    expect(d['x']).toBeLessThan(0.55);
  });

  it('dampener values always in [0.5, 1.0]', () => {
    const hists: MatchHistoryEntry[][] = [
      Array(5).fill(0).map(() => mk('a', true)),
      Array(20).fill(0).map(() => mk('b', false)),
      [
        ...Array(3).fill(0).map(() => mk('c', true)),
        ...Array(7).fill(0).map(() => mk('c', false)),
      ],
    ];
    for (const h of hists) {
      const d = computeFeatureDampeners(h);
      for (const v of Object.values(d)) {
        expect(v).toBeGreaterThanOrEqual(0.5);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('confidence is monotonic in sampleCount', () => {
    const h5 = Array(5).fill(0).map(() => mk('x', true));
    const h10 = Array(10).fill(0).map(() => mk('x', true));
    const h20 = Array(20).fill(0).map(() => mk('x', true));
    const p5 = detectOffenderPatterns(h5)[0];
    const p10 = detectOffenderPatterns(h10)[0];
    const p20 = detectOffenderPatterns(h20)[0];
    expect(p10.confidence).toBeGreaterThan(p5.confidence);
    expect(p20.confidence).toBeGreaterThan(p10.confidence);
  });

  it('dampener is monotonic non-increasing in regretRate at fixed sampleCount', () => {
    // 10 matches; sweep unmatch count 0..10.
    let prev = Infinity;
    for (let u = 0; u <= 10; u++) {
      const hist: MatchHistoryEntry[] = [];
      for (let i = 0; i < u; i++) hist.push(mk('x', true));
      for (let i = 0; i < 10 - u; i++) hist.push(mk('x', false));
      const d = computeFeatureDampeners(hist);
      expect(d['x']).toBeLessThanOrEqual(prev + 1e-9);
      prev = d['x'];
    }
  });

  it('property: dampener always in [0.5, 1.0] over 100 random inputs', () => {
    for (let seed = 0; seed < 100; seed++) {
      const n = 5 + (seed % 20);
      const u = seed % (n + 1);
      const hist: MatchHistoryEntry[] = [];
      for (let i = 0; i < u; i++) hist.push(mk('x', true));
      for (let i = 0; i < n - u; i++) hist.push(mk('x', false));
      const d = computeFeatureDampeners(hist);
      const v = d['x'] ?? 1;
      expect(v).toBeGreaterThanOrEqual(0.5);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('property: confidence strictly increasing in matchCount (fixed regret)', () => {
    let prev = -1;
    for (let n = 5; n <= 50; n++) {
      const hist = Array(n).fill(0).map(() => mk('x', true));
      const [p] = detectOffenderPatterns(hist);
      expect(p.confidence).toBeGreaterThan(prev);
      prev = p.confidence;
    }
  });

  it('deterministic: same input → same output', () => {
    const hist: MatchHistoryEntry[] = [
      mk('a', true), mk('a', false), mk('a', true),
      mk('b', false), mk('b', false), mk('b', true),
      mk('a', true), mk('b', true), mk('a', false), mk('a', true),
    ];
    const d1 = computeFeatureDampeners(hist);
    const d2 = computeFeatureDampeners(hist);
    expect(d1).toEqual(d2);
  });
});
