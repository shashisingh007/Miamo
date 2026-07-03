import { describe, it, expect } from 'vitest';
import {
  predictBoredom,
  BOREDOM_MIN_SAMPLES,
  BOREDOM_CONFIDENCE_CAP,
  type BoredomImpression,
} from '../../v9/boredomPredictor';

function synthetic(fn: (i: number) => number, n = 25, stepMs = 1000): BoredomImpression[] {
  const out: BoredomImpression[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ dwellMs: Math.max(0, fn(i)), timestamp: new Date(i * stepMs) });
  }
  return out;
}

describe('v9/boredomPredictor', () => {
  it('empty impressions → probability 0.5, slope 0, confidence 0', () => {
    const r = predictBoredom([]);
    expect(r.boredomProbability).toBe(0.5);
    expect(r.slope).toBe(0);
    expect(r.confidence).toBe(0);
  });

  it('single impression → uninformative', () => {
    const r = predictBoredom([{ dwellMs: 5000, timestamp: new Date(0) }]);
    expect(r.confidence).toBe(0);
    expect(r.slope).toBe(0);
  });

  it('below BOREDOM_MIN_SAMPLES → confidence 0 even with strong negative slope', () => {
    const r = predictBoredom(synthetic(i => 10_000 - 400 * i, BOREDOM_MIN_SAMPLES - 1));
    expect(r.confidence).toBe(0);
    // Slope still reported for observability.
    expect(r.slope).toBeLessThan(0);
  });

  it('flat dwell → probability ~0.5, confidence low (R²=0)', () => {
    const r = predictBoredom(synthetic(() => 3000, 30));
    expect(r.boredomProbability).toBeCloseTo(0.5, 5);
    // R² of a flat line is 0 because there's no variance to explain.
    expect(r.confidence).toBe(0);
  });

  it('strongly declining dwell → boredom probability ≥ 0.9, confidence high', () => {
    // 30 samples, dwell drops from 10000 to 100 with a bit of noise.
    const points: BoredomImpression[] = [];
    for (let i = 0; i < 30; i++) {
      const noise = ((i * 37) % 11) - 5; // deterministic small noise
      points.push({ dwellMs: 10_000 - 300 * i + noise, timestamp: new Date(i * 1000) });
    }
    const r = predictBoredom(points);
    expect(r.slope).toBeLessThan(0);
    expect(r.boredomProbability).toBeGreaterThanOrEqual(0.9);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('strongly rising dwell → boredom probability ≤ 0.1', () => {
    const points: BoredomImpression[] = [];
    for (let i = 0; i < 30; i++) {
      points.push({ dwellMs: 500 + 200 * i, timestamp: new Date(i * 1000) });
    }
    const r = predictBoredom(points);
    expect(r.slope).toBeGreaterThan(0);
    expect(r.boredomProbability).toBeLessThanOrEqual(0.1);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('noisy declining data at higher sample count → higher confidence', () => {
    // Same slope, different sample counts — 25 vs 40 samples.
    const build = (n: number): BoredomImpression[] => {
      const out: BoredomImpression[] = [];
      for (let i = 0; i < n; i++) {
        const noise = ((i * 53) % 17) - 8;
        out.push({ dwellMs: 8_000 - 100 * i + noise * 20, timestamp: new Date(i * 1000) });
      }
      return out;
    };
    const rSmall = predictBoredom(build(BOREDOM_MIN_SAMPLES));
    const rBig   = predictBoredom(build(BOREDOM_CONFIDENCE_CAP));
    expect(rBig.confidence).toBeGreaterThan(rSmall.confidence);
    // Both should still detect boredom.
    expect(rSmall.boredomProbability).toBeGreaterThan(0.5);
    expect(rBig.boredomProbability).toBeGreaterThan(0.5);
  });

  it('identical timestamps → confidence 0 (no time variance)', () => {
    const points: BoredomImpression[] = [];
    for (let i = 0; i < 30; i++) {
      points.push({ dwellMs: 5000 - i * 100, timestamp: new Date(1000) });
    }
    const r = predictBoredom(points);
    expect(r.confidence).toBe(0);
    expect(r.slope).toBe(0);
  });

  it('confidence in [0,1] always', () => {
    for (let seed = 0; seed < 30; seed++) {
      const points: BoredomImpression[] = [];
      const n = 5 + seed;
      for (let i = 0; i < n; i++) {
        points.push({ dwellMs: (seed * 17 + i * 91) % 8000, timestamp: new Date(i * 1000) });
      }
      const r = predictBoredom(points);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(r.boredomProbability).toBeGreaterThanOrEqual(0);
      expect(r.boredomProbability).toBeLessThanOrEqual(1);
      expect(Number.isFinite(r.slope)).toBe(true);
    }
  });

  it('NaN dwell values are treated as 0 (defensive)', () => {
    const points: BoredomImpression[] = [];
    for (let i = 0; i < 25; i++) {
      points.push({ dwellMs: i % 3 === 0 ? NaN : 3000, timestamp: new Date(i * 1000) });
    }
    const r = predictBoredom(points);
    expect(Number.isFinite(r.slope)).toBe(true);
    expect(r.boredomProbability).toBeGreaterThanOrEqual(0);
    expect(r.boredomProbability).toBeLessThanOrEqual(1);
  });

  it('perfect linear decline → probability ~1, high confidence, R²=1', () => {
    const points = synthetic(i => 10_000 - 200 * i, 25);
    const r = predictBoredom(points);
    expect(r.slope).toBeCloseTo(-200 / 1000, 3); // ms/ms → -0.2
    expect(r.boredomProbability).toBeGreaterThan(0.99);
    expect(r.confidence).toBeGreaterThan(0.15);
  });

  it('perfect linear rise → probability ~0, high confidence', () => {
    const points = synthetic(i => 500 + 200 * i, 25);
    const r = predictBoredom(points);
    expect(r.boredomProbability).toBeLessThan(0.01);
    expect(r.confidence).toBeGreaterThan(0.15);
  });

  it('BOREDOM_MIN_SAMPLES is 20 per D.4 spec', () => {
    expect(BOREDOM_MIN_SAMPLES).toBe(20);
  });
});
