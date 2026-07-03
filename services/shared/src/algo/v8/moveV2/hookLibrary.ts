/**
 * Shared Hook Library — v8 Move v2 Composer (Section C, §3).
 *
 * Ranks concrete `HookCandidate` references the sender can use in an opener.
 * A hook is a *concrete, falsifiable, profile-derived* fact: "Triund" beats
 * "you like hiking"; "filter coffee" beats "you like coffee".
 *
 * Pure scoring: callers build the candidate list (joins on Profile,
 * CreativityItem, etc.) and pass it in. This module only ranks.
 */

import { clip01, expDecay } from '../../math';

export type HookCategory =
  | 'shared_interest'
  | 'recent_post'
  | 'shared_spotlight'
  | 'dtm_topic'
  | 'festival'
  | 'shared_city'
  | 'shared_college'
  | 'shared_employer';

export interface HookCandidate {
  category: HookCategory;
  text: string;             // human-readable phrase like "Sikkim trekking"
  freshnessAgeDays: number; // Infinity for static (interests)
  specificity: number;      // 0..1 — more specific is better
}

// because: §3.3 — recent_post is the highest-leverage hook (§5.1 of MARKET_SCAN).
// We use a *prompt-aligned* prior set: the user's spec lists exact values that
// sum to 1.0 and prefer recency over generic profile fields.
export const HOOK_CATEGORY_PRIOR: Record<HookCategory, number> = {
  recent_post: 0.30,        // because: most specific, most timely
  dtm_topic: 0.25,          // because: DTM agreement is unusually high-signal
  shared_interest: 0.15,    // because: declared interests are still strong, but stale
  shared_spotlight: 0.10,   // because: curatorial signal, lower volume than interests
  festival: 0.08,           // because: time-bounded; high lift inside 72h window only
  shared_city: 0.05,        // because: low specificity — most matches already share city
  shared_college: 0.04,     // because: privacy-creep risk, biased low in dating context
  shared_employer: 0.03,    // because: highest privacy-creep, biased lowest
};

// because: §3.3 F3.2 — 7-day half-life on time-decaying categories
export const FRESHNESS_HALF_LIFE_DAYS = 7;

// because: categories whose freshness *does* decay vs. static ones (interests
// have Infinity ageDays — never decay)
const TIME_DECAY_CATEGORIES: ReadonlySet<HookCategory> = new Set<HookCategory>([
  'recent_post',
  'festival',
]);

function freshnessBoost(category: HookCategory, ageDays: number): number {
  if (!TIME_DECAY_CATEGORIES.has(category)) return 1;
  // because: §3.3 F3.2 — exponential decay with 7-day half-life
  return expDecay(Math.max(0, ageDays), FRESHNESS_HALF_LIFE_DAYS);
}

/**
 * Score a single candidate. Returns 0..1.
 *
 * (F3.4) strength = specificity * freshnessBoost * CATEGORY_PRIOR[category]
 *
 * The `nowMs` parameter is currently unused (freshnessAgeDays is precomputed
 * by the caller) but is kept in the signature for forward-compat with
 * inline-ageMs candidates and to match the prompt's spec exactly.
 */
export function scoreHook(h: HookCandidate, _nowMs: number): number {
  // because: spec-defined factor product per §3.3 F3.4
  const spec = clip01(h.specificity);
  const fresh = freshnessBoost(h.category, h.freshnessAgeDays);
  const prior = HOOK_CATEGORY_PRIOR[h.category] ?? 0;
  return clip01(spec * fresh * prior);
}

/** Stable-sort candidates by score desc; ties broken by category prior then text. */
export function rankHooks(candidates: HookCandidate[], nowMs: number): HookCandidate[] {
  if (!candidates || candidates.length === 0) return [];
  const scored = candidates.map((c) => ({ c, s: scoreHook(c, nowMs) }));
  scored.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    // because: deterministic tie-break — category prior then alphabetical text
    const ap = HOOK_CATEGORY_PRIOR[a.c.category] ?? 0;
    const bp = HOOK_CATEGORY_PRIOR[b.c.category] ?? 0;
    if (bp !== ap) return bp - ap;
    return a.c.text < b.c.text ? -1 : a.c.text > b.c.text ? 1 : 0;
  });
  return scored.map((x) => x.c);
}

export const __test__ = { TIME_DECAY_CATEGORIES, freshnessBoost };
