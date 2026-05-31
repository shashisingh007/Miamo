import { describe, it, expect } from 'vitest';
import { detectDrift } from '../drift';
import { defaultProfile } from '../learner';
import type { UserWeightProfile, WeightKey } from '../learner';

function profileWith(overrides: Partial<Record<WeightKey, number>> = {}): UserWeightProfile {
  const p = defaultProfile();
  for (const [k, v] of Object.entries(overrides)) {
    p.weights[k as WeightKey] = v as number;
  }
  return p;
}

describe('detectDrift', () => {
  it('reports no drift when profiles are identical', () => {
    const p = defaultProfile();
    const r = detectDrift(p, p);
    expect(r.drifted).toBe(false);
    expect(r.l1).toBe(0);
    expect(r.maxPerKey).toBe(0);
    expect(r.topKey).toBeNull();
  });

  it('flags drift when a single ingredient moves past perKey', () => {
    const a = defaultProfile();
    const b = profileWith({ interestsOverlap: 0.30 }); // default 0.18 -> +0.12
    const r = detectDrift(a, b, { perKey: 0.08 });
    expect(r.drifted).toBe(true);
    expect(r.topKey).toBe('interestsOverlap');
    expect(r.maxPerKey).toBeCloseTo(0.12, 5);
  });

  it('flags drift on L1 even when no single key crosses perKey', () => {
    const a = defaultProfile();
    const b = profileWith({
      interestsOverlap: 0.21, vibeAlignment: 0.18, behaviouralTwinIndex: 0.18,
      reciprocalIntentScore: 0.13, attentionFit: 0.13, hesitationFit: 0.11,
    });
    const r = detectDrift(a, b, { l1Threshold: 0.15, perKey: 0.20 });
    expect(r.drifted).toBe(true);
    expect(r.l1).toBeGreaterThanOrEqual(0.15);
  });

  it('boosts exploration rate when drift detected, clamped to 0.30', () => {
    const a = defaultProfile();
    a.explorationRate = 0.10;
    const b = profileWith({ interestsOverlap: 0.40 });
    b.explorationRate = 0.10;
    const r = detectDrift(a, b);
    expect(r.newExplorationRate).toBeGreaterThan(0.10);
    expect(r.newExplorationRate).toBeLessThanOrEqual(0.30);
  });

  it('respects MAX_EXPLORATION cap of 0.30', () => {
    const a = defaultProfile();
    a.explorationRate = 0.25;
    const b = profileWith({ interestsOverlap: 0.50 });
    b.explorationRate = 0.25;
    const r = detectDrift(a, b, { explorationBoost: 10 });
    expect(r.newExplorationRate).toBe(0.30);
  });

  it('does not change exploration when no drift', () => {
    const p = defaultProfile();
    p.explorationRate = 0.10;
    const r = detectDrift(p, p);
    expect(r.newExplorationRate).toBe(0.10);
  });

  it('does not mutate either input', () => {
    const a = defaultProfile();
    const b = profileWith({ interestsOverlap: 0.40 });
    const snapA = JSON.stringify(a);
    const snapB = JSON.stringify(b);
    detectDrift(a, b);
    expect(JSON.stringify(a)).toBe(snapA);
    expect(JSON.stringify(b)).toBe(snapB);
  });
});
