import { describe, it, expect } from 'vitest';
import {
  updateSatiation,
  noveltyDemand,
  needsNoveltyInjection,
  halfLifeFor,
  initSatiation,
  CATEGORY_SATIATION_HALF_LIVES,
  SKIP_RESET_THRESHOLD,
  NOVELTY_INJECTION_THRESHOLD,
  type SatiationState,
} from '../../v9/satiation';

const NOW = new Date(1_000_000);
const DIM_SPICY = 'category:reels_spicy';

describe('v9/satiation', () => {
  it('halfLifeFor: known categories match the spec table', () => {
    expect(halfLifeFor('reels_spicy')).toBe(15);
    expect(halfLifeFor('photography')).toBe(40);
    expect(halfLifeFor('wholesome')).toBe(100);
    expect(halfLifeFor('meme')).toBe(20);
    expect(halfLifeFor('news')).toBe(30);
  });

  it('halfLifeFor: unknown category falls back to default (25)', () => {
    expect(halfLifeFor('does_not_exist')).toBe(CATEGORY_SATIATION_HALF_LIVES.default);
    expect(halfLifeFor('does_not_exist')).toBe(25);
  });

  it('halfLifeFor: strips namespace prefix "category:x" → "x"', () => {
    expect(halfLifeFor('category:reels_spicy')).toBe(15);
    expect(halfLifeFor('category:photography')).toBe(40);
  });

  it('noveltyDemand: zero impressions → 0 demand', () => {
    const s = initSatiation(DIM_SPICY);
    expect(noveltyDemand(s)).toBe(0);
  });

  it('noveltyDemand: at half-life impressions → ~0.5 demand', () => {
    const s: SatiationState = { ...initSatiation(DIM_SPICY), consecutiveImpressions: 15 };
    expect(noveltyDemand(s)).toBeCloseTo(0.5, 6);
  });

  it('noveltyDemand: monotonic in consecutiveImpressions', () => {
    let prev = 0;
    for (let n = 1; n <= 50; n++) {
      const s: SatiationState = { ...initSatiation(DIM_SPICY), consecutiveImpressions: n };
      const d = noveltyDemand(s);
      expect(d).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
      prev = d;
    }
  });

  it('noveltyDemand: photography vs spicy at same count — spicy is higher', () => {
    const spicy: SatiationState  = { ...initSatiation(DIM_SPICY), consecutiveImpressions: 20 };
    const photog: SatiationState = { ...initSatiation('category:photography'), consecutiveImpressions: 20 };
    expect(noveltyDemand(spicy)).toBeGreaterThan(noveltyDemand(photog));
  });

  it('noveltyDemand: wholesome half-life is ~100, so 50 impressions → 0.29', () => {
    const w: SatiationState = { ...initSatiation('category:wholesome'), consecutiveImpressions: 50 };
    // 1 - 2^(-50/100) = 1 - 2^(-0.5) ≈ 0.293
    expect(noveltyDemand(w)).toBeCloseTo(1 - Math.pow(2, -0.5), 6);
  });

  it('updateSatiation: impression increments counter and resets skips', () => {
    const s0: SatiationState = { ...initSatiation(DIM_SPICY), consecutiveImpressions: 3, consecutiveSkips: 2 };
    const s1 = updateSatiation(s0, false, NOW);
    expect(s1.consecutiveImpressions).toBe(4);
    expect(s1.consecutiveSkips).toBe(0);
    expect(s1.lastResetAt).toBe(s0.lastResetAt); // unchanged
    // Original untouched
    expect(s0.consecutiveImpressions).toBe(3);
    expect(s0.consecutiveSkips).toBe(2);
  });

  it('updateSatiation: skip increments skip counter but not impression counter', () => {
    const s0: SatiationState = { ...initSatiation(DIM_SPICY), consecutiveImpressions: 10, consecutiveSkips: 1 };
    const s1 = updateSatiation(s0, true, NOW);
    expect(s1.consecutiveImpressions).toBe(10);
    expect(s1.consecutiveSkips).toBe(2);
    expect(s1.lastResetAt).toBe(s0.lastResetAt);
  });

  it('updateSatiation: 5 consecutive skips reset the impression counter', () => {
    let s: SatiationState = { ...initSatiation(DIM_SPICY), consecutiveImpressions: 20, consecutiveSkips: 0 };
    for (let i = 0; i < SKIP_RESET_THRESHOLD - 1; i++) {
      s = updateSatiation(s, true, NOW);
      expect(s.consecutiveImpressions).toBe(20);
    }
    // The 5th skip fires the reset.
    s = updateSatiation(s, true, NOW);
    expect(s.consecutiveImpressions).toBe(0);
    expect(s.consecutiveSkips).toBe(0);
    expect(s.lastResetAt.getTime()).toBe(NOW.getTime());
  });

  it('updateSatiation: mixed pattern — impression breaks the skip streak', () => {
    let s: SatiationState = { ...initSatiation(DIM_SPICY), consecutiveImpressions: 8 };
    s = updateSatiation(s, true, NOW);  // skip
    s = updateSatiation(s, true, NOW);  // skip
    s = updateSatiation(s, true, NOW);  // skip
    expect(s.consecutiveSkips).toBe(3);
    s = updateSatiation(s, false, NOW); // impression
    expect(s.consecutiveSkips).toBe(0);
    expect(s.consecutiveImpressions).toBe(9);
  });

  it('needsNoveltyInjection: false when all states below threshold', () => {
    const a = { ...initSatiation('category:wholesome'), consecutiveImpressions: 30 };
    const b = { ...initSatiation('category:news'), consecutiveImpressions: 5 };
    expect(needsNoveltyInjection([a, b])).toBe(false);
  });

  it('needsNoveltyInjection: true when any state exceeds threshold', () => {
    const hot: SatiationState = { ...initSatiation(DIM_SPICY), consecutiveImpressions: 40 };
    // 1 - 2^(-40/15) ≈ 0.842 >> 0.7
    expect(needsNoveltyInjection([hot])).toBe(true);
  });

  it('needsNoveltyInjection: threshold is configurable', () => {
    const mid: SatiationState = { ...initSatiation('category:news'), consecutiveImpressions: 20 };
    // 1 - 2^(-20/30) ≈ 0.371
    expect(needsNoveltyInjection([mid], 0.9)).toBe(false);
    expect(needsNoveltyInjection([mid], 0.3)).toBe(true);
  });

  it('NOVELTY_INJECTION_THRESHOLD is 0.7 per D.3 spec', () => {
    expect(NOVELTY_INJECTION_THRESHOLD).toBe(0.7);
  });

  it('SKIP_RESET_THRESHOLD is 5 per D.3 spec', () => {
    expect(SKIP_RESET_THRESHOLD).toBe(5);
  });

  it('CATEGORY_SATIATION_HALF_LIVES: covers the five spec categories + default', () => {
    for (const k of ['reels_spicy', 'photography', 'wholesome', 'meme', 'news', 'default']) {
      expect(CATEGORY_SATIATION_HALF_LIVES[k]).toBeGreaterThan(0);
    }
  });
});
