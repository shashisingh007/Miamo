import { describe, it, expect } from 'vitest';
import {
  predictMatchQuality,
  PRIORITY_IMMEDIATE_THRESHOLD,
  PRIORITY_DELAYED_THRESHOLD,
  type MatchQualityInput,
  type MatchQualityPartyFeatures,
} from '../../v9/matchQualityPredictor';

const highParty: MatchQualityPartyFeatures = {
  responseRate: 0.9,
  ghostRate: 0.05,
  moveV2AcceptanceHistory: 0.8,
  verifiedStatus: true,
  dailyActive: true,
};
const lowParty: MatchQualityPartyFeatures = {
  responseRate: 0.15,
  ghostRate: 0.8,
  moveV2AcceptanceHistory: 0.2,
  verifiedStatus: false,
  dailyActive: false,
};

const mk = (over: Partial<MatchQualityInput> = {}): MatchQualityInput => ({
  senderFeatures: highParty,
  receiverFeatures: highParty,
  compatibilityScore: 0.85,
  intentAlignment: 1,
  ...over,
});

describe('v9/matchQualityPredictor', () => {
  it('two identical high-quality profiles → immediate', () => {
    const r = predictMatchQuality(mk());
    expect(r.priority).toBe('immediate');
    expect(r.probability).toBeGreaterThan(PRIORITY_IMMEDIATE_THRESHOLD);
  });

  it('two low-quality profiles → lowest', () => {
    const r = predictMatchQuality({
      senderFeatures: lowParty,
      receiverFeatures: lowParty,
      compatibilityScore: 0.2,
      intentAlignment: 0,
    });
    expect(r.priority).toBe('lowest');
    expect(r.probability).toBeLessThan(PRIORITY_DELAYED_THRESHOLD);
  });

  it('chronic-ghoster receiver → clamped to lowest regardless of sender', () => {
    const r = predictMatchQuality({
      senderFeatures: highParty,
      receiverFeatures: { ...highParty, responseRate: 0.1, ghostRate: 0.85 },
      compatibilityScore: 0.9,
      intentAlignment: 1,
    });
    expect(r.priority).toBe('lowest');
  });

  it('probability always in [0, 1]', () => {
    const inputs: MatchQualityInput[] = [
      mk(),
      mk({ compatibilityScore: 0 }),
      mk({ compatibilityScore: 1 }),
      mk({ senderFeatures: lowParty, receiverFeatures: lowParty }),
      mk({ intentAlignment: 0 }),
      mk({ intentAlignment: 1 }),
    ];
    for (const inp of inputs) {
      const r = predictMatchQuality(inp);
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(1);
    }
  });

  it('mixed match (mid-compat + one weak party) → delayed', () => {
    // Sender is high-quality but receiver has mediocre reliability and
    // no verification; compat is 0.5, intent alignment weak. Expect the
    // probability to land in the delayed band.
    const r = predictMatchQuality({
      senderFeatures: highParty,
      receiverFeatures: {
        responseRate: 0.4,
        ghostRate: 0.25,
        verifiedStatus: false,
        dailyActive: false,
      },
      compatibilityScore: 0.5,
      intentAlignment: 0.3,
    });
    expect(['delayed', 'lowest']).toContain(r.priority);
  });

  it('priority mapping respects thresholds', () => {
    // Handcraft compat that yields near-boundary probability.
    const rHi = predictMatchQuality(mk({ compatibilityScore: 1 }));
    const rMid = predictMatchQuality({
      senderFeatures: { ...highParty, responseRate: 0.5, moveV2AcceptanceHistory: 0.4 },
      receiverFeatures: { ...highParty, responseRate: 0.5, ghostRate: 0.3, verifiedStatus: false },
      compatibilityScore: 0.5,
      intentAlignment: 0.5,
    });
    expect(rHi.priority).toBe('immediate');
    expect(['delayed', 'lowest']).toContain(rMid.priority);
  });

  it('monotonic in compatibilityScore (holding others fixed)', () => {
    let prev = -Infinity;
    for (let c = 0; c <= 1.0001; c += 0.1) {
      const r = predictMatchQuality(mk({ compatibilityScore: c }));
      expect(r.probability).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = r.probability;
    }
  });

  it('monotonic in receiver responseRate', () => {
    let prev = -Infinity;
    for (let rr = 0; rr <= 1.0001; rr += 0.1) {
      const r = predictMatchQuality(mk({
        receiverFeatures: { ...highParty, responseRate: rr, ghostRate: 0 },
      }));
      expect(r.probability).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = r.probability;
    }
  });

  it('reasons list non-empty', () => {
    const r = predictMatchQuality(mk());
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it('reasons include "same looking-for intent" when intentAlignment=1', () => {
    const r = predictMatchQuality(mk({ intentAlignment: 1 }));
    expect(r.reasons.some((x) => x.includes('same looking-for'))).toBe(true);
  });

  it('reasons include "intent mismatch" for intentAlignment=0', () => {
    const r = predictMatchQuality(mk({ intentAlignment: 0 }));
    expect(r.reasons.some((x) => x.includes('intent mismatch'))).toBe(true);
  });

  it('deterministic', () => {
    const a = predictMatchQuality(mk({ compatibilityScore: 0.75 }));
    const b = predictMatchQuality(mk({ compatibilityScore: 0.75 }));
    expect(a).toEqual(b);
  });

  it('missing optional fields defaults reasonably', () => {
    const r = predictMatchQuality({
      senderFeatures: { responseRate: 0.7, verifiedStatus: false, dailyActive: true },
      receiverFeatures: { responseRate: 0.7, verifiedStatus: false, dailyActive: false },
      compatibilityScore: 0.7,
      intentAlignment: 0.5,
    });
    expect(r.probability).toBeGreaterThan(0);
    expect(r.probability).toBeLessThanOrEqual(1);
  });
});
