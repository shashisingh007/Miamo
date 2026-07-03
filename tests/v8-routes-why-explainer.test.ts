/**
 * v3.6.0 Why-am-I-seeing-this explainer — top-3 stars output. Pure logic.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MO_WEIGHTS } from '../services/shared/src/algo/v8/multiObjective';
import { expDecay } from '../services/shared/src/algo/math';

function handler(userId: string, targetId: string): { status: number; body: any } {
  if (process.env.FEATURE_WHY_EXPLAINER_ENABLED !== '1') return { status: 404, body: { error: { message: 'Not found', code: 'NOT_FOUND' } } };
  if (!userId) return { status: 401, body: { error: { message: 'Unauthorized' } } };
  if (!targetId || targetId.length > 64) return { status: 400, body: { error: { message: 'targetId required' } } };
  const relevance = 0.6;
  const earned = 0.1;
  const recency = expDecay(48, 168);
  const fairness = 0.5;
  const intentFit = 0.5;
  const ingredients = [
    { key: 'relevance', label: 'Profile match strength', contribution: relevance * (MO_WEIGHTS as any).relevance },
    { key: 'recencyFreshness', label: 'How recently they were active', contribution: recency * (MO_WEIGHTS as any).recencyFreshness },
    { key: 'earnedVisibility', label: 'Earned exposure credits', contribution: earned * (MO_WEIGHTS as any).earnedVisibility },
    { key: 'fairnessFloor', label: 'Fairness floor', contribution: fairness * (MO_WEIGHTS as any).fairness },
    { key: 'intentFitRightNow', label: 'Matches what you are looking for right now', contribution: intentFit * (MO_WEIGHTS as any).intentFitRightNow },
  ];
  ingredients.sort((a, b) => b.contribution - a.contribution);
  const top3 = ingredients.slice(0, 3);
  const total = top3.reduce((acc, r) => acc + r.contribution, 0);
  const stars = top3.map((r) => {
    const ratio = total > 0 ? r.contribution / total : 0;
    const starCount = ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
    return { key: r.key, label: r.label, contribution: Number(r.contribution.toFixed(4)), stars: starCount };
  });
  return { status: 200, body: { stars, total: Number(total.toFixed(4)), weights: MO_WEIGHTS } };
}

describe('v3.6.0 why-explainer route logic', () => {
  beforeEach(() => { delete process.env.FEATURE_WHY_EXPLAINER_ENABLED; });
  afterEach(() => { delete process.env.FEATURE_WHY_EXPLAINER_ENABLED; });

  it('flag OFF → 404', () => {
    const r = handler('u1', 't1');
    expect(r.status).toBe(404);
  });

  it('flag ON → returns at most 3 stars', () => {
    process.env.FEATURE_WHY_EXPLAINER_ENABLED = '1';
    const r = handler('u1', 't1');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.stars)).toBe(true);
    expect(r.body.stars.length).toBeLessThanOrEqual(3);
  });

  it('each star has key, label, contribution, stars (1|2|3)', () => {
    process.env.FEATURE_WHY_EXPLAINER_ENABLED = '1';
    const r = handler('u1', 't1');
    for (const s of r.body.stars) {
      expect(typeof s.key).toBe('string');
      expect(typeof s.label).toBe('string');
      expect(typeof s.contribution).toBe('number');
      expect([1, 2, 3]).toContain(s.stars);
    }
  });

  it('returns the canonical weights object', () => {
    process.env.FEATURE_WHY_EXPLAINER_ENABLED = '1';
    const r = handler('u1', 't1');
    expect(r.body.weights.relevance).toBe(MO_WEIGHTS.relevance);
    expect(r.body.weights.earnedVisibility).toBe(MO_WEIGHTS.earnedVisibility);
  });

  it('total = sum of top-3 contributions', () => {
    process.env.FEATURE_WHY_EXPLAINER_ENABLED = '1';
    const r = handler('u1', 't1');
    const computed = r.body.stars.reduce((acc: number, s: any) => acc + s.contribution, 0);
    expect(Math.abs(computed - r.body.total)).toBeLessThan(0.01);
  });

  it('rejects targetId > 64 chars', () => {
    process.env.FEATURE_WHY_EXPLAINER_ENABLED = '1';
    const r = handler('u1', 'a'.repeat(65));
    expect([400, 404]).toContain(r.status);
  });

  it('stars are sorted by contribution desc', () => {
    process.env.FEATURE_WHY_EXPLAINER_ENABLED = '1';
    const r = handler('u1', 't1');
    for (let i = 1; i < r.body.stars.length; i++) {
      expect(r.body.stars[i - 1].contribution).toBeGreaterThanOrEqual(r.body.stars[i].contribution);
    }
  });
});
