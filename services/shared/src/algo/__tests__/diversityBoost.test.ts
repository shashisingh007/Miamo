import { describe, it, expect } from 'vitest';
import { diversityBoost } from '../diversityBoost';
import type { MoveArchetype } from '../moveProfile';

const W: MoveArchetype = 'wordsmith';
const V: MoveArchetype = 'visual';
const F: MoveArchetype = 'fast_replier';
const VC: MoveArchetype = 'voice_first';

describe('diversityBoost', () => {
  it('returns neutral for insufficient data (<5)', () => {
    const r = diversityBoost({ recentArchetypes: [W, W, W, W] });
    expect(r.multiplier).toBe(1.0);
    expect(r.reason).toBe('insufficient_data');
    expect(r.dominantArchetype).toBeNull();
  });

  it('returns all_same boost when every swipe is one archetype', () => {
    const r = diversityBoost({ recentArchetypes: [W, W, W, W, W] });
    expect(r.reason).toBe('all_same');
    expect(r.multiplier).toBe(1.3);
    expect(r.dominantArchetype).toBe(W);
  });

  it('returns dominant boost when one archetype >=80%', () => {
    const r = diversityBoost({ recentArchetypes: [W, W, W, W, V] }); // 4/5 = 0.8
    expect(r.reason).toBe('dominant');
    expect(r.multiplier).toBe(1.15);
    expect(r.dominantArchetype).toBe(W);
  });

  it('returns balanced for healthy mix', () => {
    const r = diversityBoost({ recentArchetypes: [W, V, F, VC, W] });
    expect(r.reason).toBe('balanced');
    expect(r.multiplier).toBe(1.0);
  });

  it('caps multiplier at 1.5 (defensive)', () => {
    const r = diversityBoost({ recentArchetypes: [W, W, W, W, W, W, W, W] });
    expect(r.multiplier).toBeLessThanOrEqual(1.5);
  });

  it('identifies the correct dominant archetype', () => {
    const r = diversityBoost({ recentArchetypes: [V, V, V, V, V, W, F] });
    expect(r.dominantArchetype).toBe(V);
  });

  it('does not mutate input array', () => {
    const arr: MoveArchetype[] = [W, W, W, W, W];
    const snap = JSON.stringify(arr);
    diversityBoost({ recentArchetypes: arr });
    expect(JSON.stringify(arr)).toBe(snap);
  });
});
