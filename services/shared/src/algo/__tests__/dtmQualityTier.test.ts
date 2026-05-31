import { describe, it, expect } from 'vitest';
import {
  dtmQualityTier,
  dtmQualityTierFromReport,
  dtmQualityLabel,
  bucketDtmByTier,
  DTM_TIER_LABELS,
} from '../dtmQualityTier';
import type { DtmAffinityV6Report } from '../dtmV6';

describe('dtmQualityTier', () => {
  it('maps thresholds correctly', () => {
    expect(dtmQualityTier(0.90)).toBe(4);
    expect(dtmQualityTier(0.85)).toBe(4);
    expect(dtmQualityTier(0.84)).toBe(3);
    expect(dtmQualityTier(0.70)).toBe(3);
    expect(dtmQualityTier(0.60)).toBe(2);
    expect(dtmQualityTier(0.40)).toBe(1);
    expect(dtmQualityTier(0.10)).toBe(0);
  });

  it('treats non-finite scores as tier 0', () => {
    expect(dtmQualityTier(NaN)).toBe(0);
    expect(dtmQualityTier(Infinity)).toBe(0);
    expect(dtmQualityTier(-Infinity)).toBe(0);
  });

  it('dtmQualityLabel mirrors the tier table', () => {
    expect(dtmQualityLabel(0.90)).toBe(DTM_TIER_LABELS[4]);
    expect(dtmQualityLabel(0.10)).toBe(DTM_TIER_LABELS[0]);
  });
});

describe('dtmQualityTierFromReport', () => {
  function rep(score: number, meStage: DtmAffinityV6Report['meStage'], candStage: DtmAffinityV6Report['candStage']): DtmAffinityV6Report {
    return {
      score, rawCosine: score, coverageWeight: 1, sharedMassBonus: 0,
      meStage, candStage,
    };
  }

  it('returns 0 for null', () => {
    expect(dtmQualityTierFromReport(null)).toBe(0);
  });

  it('uses raw tier when both sides sufficient', () => {
    expect(dtmQualityTierFromReport(rep(0.90, 'sufficient', 'full'))).toBe(4);
  });

  it('downgrades by one when one side is sparse', () => {
    expect(dtmQualityTierFromReport(rep(0.90, 'sparse', 'full'))).toBe(3);
    expect(dtmQualityTierFromReport(rep(0.60, 'full', 'sparse'))).toBe(1);
  });

  it('does not downgrade below 0', () => {
    expect(dtmQualityTierFromReport(rep(0.10, 'sparse', 'full'))).toBe(0);
  });
});

describe('bucketDtmByTier', () => {
  it('groups items by their tier', () => {
    const items = [
      { dtmScore: 0.9 }, { dtmScore: 0.75 }, { dtmScore: 0.6 }, { dtmScore: 0.45 }, { dtmScore: 0.1 },
    ];
    const b = bucketDtmByTier(items);
    expect(b[4]).toHaveLength(1);
    expect(b[3]).toHaveLength(1);
    expect(b[2]).toHaveLength(1);
    expect(b[1]).toHaveLength(1);
    expect(b[0]).toHaveLength(1);
  });
});
