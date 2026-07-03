import { describe, it, expect } from 'vitest';
import {
  scoreHook,
  rankHooks,
  HOOK_CATEGORY_PRIOR,
  type HookCandidate,
  type HookCategory,
} from '../v8/moveV2/hookLibrary';

const NOW = 1_700_000_000_000;

function h(
  category: HookCategory,
  text: string,
  freshnessAgeDays = Infinity,
  specificity = 0.8,
): HookCandidate {
  return { category, text, freshnessAgeDays, specificity };
}

describe('scoreHook', () => {
  it('returns 0 for zero-specificity candidate', () => {
    expect(scoreHook(h('shared_interest', 'x', Infinity, 0), NOW)).toBe(0);
  });

  it('1-day-old recent_post outranks 30-day-old recent_post', () => {
    const fresh = scoreHook(h('recent_post', 'a', 1, 0.5), NOW);
    const stale = scoreHook(h('recent_post', 'b', 30, 0.5), NOW);
    expect(fresh).toBeGreaterThan(stale);
  });

  it('high specificity outranks low specificity in same category', () => {
    const hi = scoreHook(h('shared_interest', 'a', Infinity, 0.9), NOW);
    const lo = scoreHook(h('shared_interest', 'b', Infinity, 0.1), NOW);
    expect(hi).toBeGreaterThan(lo);
  });

  it('recent_post has highest category prior', () => {
    const priors = Object.values(HOOK_CATEGORY_PRIOR);
    expect(HOOK_CATEGORY_PRIOR.recent_post).toBe(Math.max(...priors));
  });

  it('non-decaying categories do not lose strength with age', () => {
    const young = scoreHook(h('shared_interest', 'a', 1, 0.5), NOW);
    const old = scoreHook(h('shared_interest', 'b', 100, 0.5), NOW);
    expect(young).toBeCloseTo(old, 6);
  });
});

describe('rankHooks', () => {
  it('returns empty for empty input', () => {
    expect(rankHooks([], NOW)).toEqual([]);
  });

  it('sorts by score descending', () => {
    const ranked = rankHooks([
      h('shared_city', 'a', Infinity, 0.5),
      h('recent_post', 'b', 1, 0.5),
      h('shared_interest', 'c', Infinity, 0.5),
    ], NOW);
    expect(ranked[0].category).toBe('recent_post');
  });

  it('stable tie-break: when scores are equal (both interest = 0.15 prior), alphabetical text wins', () => {
    // because: both candidates have same prior + spec + freshness, so scores match;
    // tie-break falls through to alphabetical text
    const ranked = rankHooks([
      h('shared_interest', 'zebra', Infinity, 1),
      h('shared_interest', 'apple', Infinity, 1),
    ], NOW);
    expect(ranked[0].text).toBe('apple');
  });

  it('keeps all candidates', () => {
    const cands = [
      h('shared_interest', 'a'),
      h('recent_post', 'b', 1),
      h('shared_city', 'c'),
    ];
    expect(rankHooks(cands, NOW)).toHaveLength(3);
  });

  it('does not mutate input', () => {
    const cands = [h('shared_interest', 'a'), h('recent_post', 'b', 1)];
    const snap = [...cands];
    rankHooks(cands, NOW);
    expect(cands).toEqual(snap);
  });

  it('handles candidates from all categories', () => {
    const all: HookCandidate[] = (Object.keys(HOOK_CATEGORY_PRIOR) as HookCategory[]).map((c) =>
      h(c, `text-${c}`, c === 'recent_post' || c === 'festival' ? 1 : Infinity, 0.7),
    );
    const ranked = rankHooks(all, NOW);
    expect(ranked.length).toBe(all.length);
    // top must be recent_post (highest prior + fresh)
    expect(ranked[0].category).toBe('recent_post');
  });

  it('festival decays with age', () => {
    const a = scoreHook(h('festival', 'a', 0, 0.5), NOW);
    const b = scoreHook(h('festival', 'b', 30, 0.5), NOW);
    expect(a).toBeGreaterThan(b);
  });
});
