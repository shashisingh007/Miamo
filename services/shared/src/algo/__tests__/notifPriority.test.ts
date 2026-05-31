import { describe, it, expect } from 'vitest';
import { notifPriority, sortByPriorityDesc } from '../notifPriority';

const CFG = {
  categoryWeights: { match: 1.0, msg: 0.9, like: 0.5 },
  defaultCategoryWeight: 0.3,
};

describe('notifPriority', () => {
  it('returns higher score for high-weight category, fresh, deep-link', () => {
    const p = notifPriority({ category: 'match', ageMinutes: 0, hasDeepLink: true }, CFG);
    expect(p).toBeCloseTo(clamp01(0.5 * 1 + 0.3 * 1 + 0.2 * 1), 6);
  });
  it('returns lower score for unknown category (uses default)', () => {
    const p = notifPriority({ category: 'random', ageMinutes: 0, hasDeepLink: true }, CFG);
    expect(p).toBeCloseTo(0.5 * 0.3 + 0.3 + 0.2, 6);
  });
  it('decays with age (60min → e^-1)', () => {
    const fresh = notifPriority({ category: 'match', ageMinutes: 0, hasDeepLink: false }, CFG);
    const old   = notifPriority({ category: 'match', ageMinutes: 60, hasDeepLink: false }, CFG);
    expect(old).toBeLessThan(fresh);
  });
  it('deep-link gets a 0.4-pt actionability bonus', () => {
    const a = notifPriority({ category: 'msg', ageMinutes: 0, hasDeepLink: true  }, CFG);
    const b = notifPriority({ category: 'msg', ageMinutes: 0, hasDeepLink: false }, CFG);
    expect(a - b).toBeCloseTo(0.2 * (1.0 - 0.6), 6);
  });
  it('clamps to [0, 1]', () => {
    const p = notifPriority({ category: 'match', ageMinutes: -100, hasDeepLink: true }, CFG);
    expect(p).toBeLessThanOrEqual(1);
    expect(p).toBeGreaterThanOrEqual(0);
  });
});

describe('sortByPriorityDesc', () => {
  it('returns inputs sorted by priority desc', () => {
    const items = [
      { id: 'a', category: 'like',  ageMinutes: 0,  hasDeepLink: false },
      { id: 'b', category: 'match', ageMinutes: 0,  hasDeepLink: true  },
      { id: 'c', category: 'msg',   ageMinutes: 30, hasDeepLink: true  },
    ];
    const out = sortByPriorityDesc(items, CFG);
    expect(out[0].id).toBe('b');
    expect(out[out.length - 1].id).toBe('a');
  });
  it('is stable for ties (preserves input order)', () => {
    const items = [
      { id: 'x', category: 'match', ageMinutes: 0, hasDeepLink: true },
      { id: 'y', category: 'match', ageMinutes: 0, hasDeepLink: true },
    ];
    const out = sortByPriorityDesc(items, CFG);
    expect(out.map((o) => o.id)).toEqual(['x', 'y']);
  });
});

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
