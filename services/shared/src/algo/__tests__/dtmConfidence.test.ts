import { describe, it, expect } from 'vitest';
import { dtmConfidence, dtmConfidenceTier } from '../dtmConfidence';

describe('dtmConfidence', () => {
  it('is 0 when coverage is 0', () => {
    expect(dtmConfidence({ coveredCount: 0, ageDays: 0, driftScore: 0 })).toBe(0);
  });
  it('is 1 with full coverage, zero age, zero drift', () => {
    expect(dtmConfidence({ coveredCount: 16, ageDays: 0, driftScore: 0 })).toBeCloseTo(1, 6);
  });
  it('half coverage gives sqrt(0.5) ≈ 0.707 at zero age/drift', () => {
    expect(dtmConfidence({ coveredCount: 8, ageDays: 0, driftScore: 0 })).toBeCloseTo(Math.sqrt(0.5), 6);
  });
  it('halves freshness at the 14d halflife (well, e^-1 ≈ 0.368)', () => {
    const c = dtmConfidence({ coveredCount: 16, ageDays: 14, driftScore: 0 });
    expect(c).toBeCloseTo(Math.exp(-1), 4);
  });
  it('drift directly subtracts from stability', () => {
    const c = dtmConfidence({ coveredCount: 16, ageDays: 0, driftScore: 0.4 });
    expect(c).toBeCloseTo(0.6, 6);
  });
  it('clamps drift > 1 to zero stability (so confidence → 0)', () => {
    expect(dtmConfidence({ coveredCount: 16, ageDays: 0, driftScore: 5 })).toBe(0);
  });
  it('coverage > 16 does not exceed 1 (sqrt of clamped 1)', () => {
    expect(dtmConfidence({ coveredCount: 50, ageDays: 0, driftScore: 0 })).toBeCloseTo(1, 6);
  });
  it('negative ageDays is treated as zero', () => {
    expect(dtmConfidence({ coveredCount: 16, ageDays: -10, driftScore: 0 })).toBeCloseTo(1, 6);
  });
});

describe('dtmConfidenceTier', () => {
  it('high at 0.70', () => { expect(dtmConfidenceTier(0.70)).toBe('high'); });
  it('high at 1.0',  () => { expect(dtmConfidenceTier(1.0)).toBe('high'); });
  it('medium at 0.40',() => { expect(dtmConfidenceTier(0.40)).toBe('medium'); });
  it('medium at 0.69',() => { expect(dtmConfidenceTier(0.69)).toBe('medium'); });
  it('low at 0.39',   () => { expect(dtmConfidenceTier(0.39)).toBe('low'); });
  it('low at 0',      () => { expect(dtmConfidenceTier(0)).toBe('low'); });
});
