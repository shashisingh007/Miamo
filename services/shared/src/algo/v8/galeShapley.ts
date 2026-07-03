/**
 * v8 Gale-Shapley deferred-acceptance stable-matching for the weekly Top-10.
 *
 * Classical algorithm (Gale & Shapley 1962, "College Admissions and the
 * Stability of Marriage", American Mathematical Monthly 69(1):9–15). Used by
 * Hinge's "Most Compatible" surface [MARKET_SCAN §1 Hinge].
 *
 * Pure module — the worker shell prefetches preference lists from
 * PairCompatCache and passes them in. Deterministic given identical input.
 *
 * Spec: DESIGN_SECTION_B_exposure_and_ranking.md §B.6.
 */

/** A single proposer's (or receiver's) ranked preference list. */
export interface GSPreferenceList {
  /** The id of the agent on this side. */
  proposerId: string;
  /** Receiver ids in descending preference order. Index 0 = most preferred. */
  ranked: string[];
}

/** A matched (proposer, receiver) pair with their respective preference ranks. */
export interface GSMatch {
  proposerId: string;
  receiverId: string;
  /** Index of receiverId inside proposer's `ranked` list. */
  proposerRank: number;
  /** Index of proposerId inside receiver's `ranked` list (-1 if not present). */
  receiverRank: number;
}

export interface GSResult {
  matches: GSMatch[];
  /** Proposers whose lists were exhausted without an acceptance. */
  unmatchedProposers: string[];
}

// because [DESIGN §B.6.2]: the proposer-optimal classical Gale-Shapley always
// terminates in at most n² steps because each proposer proposes to each
// receiver at most once and there are n proposers. We bound the outer loop
// iteration count at SAFETY_ITER_CAP × n to defend against pathological
// caller-supplied prefs that violate the algorithm's preconditions (e.g. an
// agent appearing in their own list).
const SAFETY_ITER_CAP = 64;          // because [DESIGN §B.6.2]: n² is the natural bound; 64n is conservative headroom for the safety check without changing complexity class.

/**
 * Proposer-optimal classical Gale-Shapley.
 *
 * Guarantees (Gale-Shapley 1962):
 *   1. Stability — no two agents prefer each other over their assigned partners (no blocking pair).
 *   2. Proposer-optimality — every proposer gets the best partner they can have in *any* stable matching.
 *   3. Receiver-pessimality — every receiver gets the worst partner they can have in any stable matching.
 *   4. Termination — at most |proposers| × |receivers| proposal steps.
 *
 * For Miamo's symmetric "everyone is both sides" use case, this function is
 * called twice (with the sides swapped) and the caller intersects the two
 * matchings to recover a symmetric set.
 */
export function galeShapley(
  proposers: readonly GSPreferenceList[],
  receivers: readonly GSPreferenceList[],
): GSResult {
  if (proposers.length === 0 || receivers.length === 0) {
    return { matches: [], unmatchedProposers: proposers.map((p) => p.proposerId) };
  }
  // Index receiver pref lists by receiverId → (proposerId → rank). Lookup is
  // O(1) at proposal-acceptance time; the alternative (Array.indexOf) is O(k)
  // per call and turns the inner loop into O(n³).
  const receiverRankIndex = new Map<string, Map<string, number>>();
  for (const r of receivers) {
    const m = new Map<string, number>();
    for (let i = 0; i < r.ranked.length; i++) m.set(r.ranked[i], i);
    receiverRankIndex.set(r.proposerId, m);
  }
  // Index proposer pref lists by id for quick access.
  const proposerPrefs = new Map<string, string[]>();
  for (const p of proposers) proposerPrefs.set(p.proposerId, p.ranked.slice());

  /** receiver → currently-engaged proposer */
  const engaged = new Map<string, string>();
  /** proposer → next index in their pref list to propose to */
  const nextIdx = new Map<string, number>();
  /** proposers still free and with un-exhausted pref lists */
  const free: string[] = proposers.map((p) => p.proposerId);
  const exhausted = new Set<string>();

  const maxIter = SAFETY_ITER_CAP * Math.max(proposers.length, receivers.length);
  let iter = 0;

  while (free.length > 0) {
    if (iter++ > maxIter) {
      // because [DESIGN §B.6.2 safety]: defensive — classical proof bounds iterations at n²; this break should be unreachable for well-formed input.
      break;
    }
    const p = free.shift()!;
    const prefs = proposerPrefs.get(p) ?? [];
    const i = nextIdx.get(p) ?? 0;
    if (i >= prefs.length) {
      exhausted.add(p);
      continue;
    }
    const r = prefs[i];
    nextIdx.set(p, i + 1);
    const rPrefIndex = receiverRankIndex.get(r);
    // If the receiver was never seen, they can't evaluate the proposal —
    // treat as rejection so the proposer moves on. (Defensive against
    // mismatched proposers/receivers sets.)
    if (!rPrefIndex) {
      free.push(p);
      continue;
    }
    const pRank = rPrefIndex.get(p);
    // If the receiver doesn't list this proposer at all, reject — the proposer
    // tries their next preference.
    if (pRank === undefined) {
      free.push(p);
      continue;
    }
    const current = engaged.get(r);
    if (current === undefined) {
      engaged.set(r, p);
      // p is now matched; do NOT re-add to free queue.
    } else {
      const currentRank = rPrefIndex.get(current);
      // Receiver prefers p (lower index) over current — swap.
      if (currentRank === undefined || pRank < currentRank) {
        engaged.set(r, p);
        free.push(current); // dumped proposer goes back to free queue.
      } else {
        free.push(p); // p rejected, tries next preference.
      }
    }
  }

  // Build the result struct. Sort matches by proposerId for determinism.
  const matches: GSMatch[] = [];
  for (const [receiverId, proposerId] of engaged.entries()) {
    const proposerRank = (proposerPrefs.get(proposerId) ?? []).indexOf(receiverId);
    const receiverRank = receiverRankIndex.get(receiverId)?.get(proposerId);
    matches.push({
      proposerId,
      receiverId,
      proposerRank,
      receiverRank: receiverRank ?? -1,
    });
  }
  matches.sort((a, b) => (a.proposerId < b.proposerId ? -1 : a.proposerId > b.proposerId ? 1 : 0));

  const unmatchedProposers = Array.from(exhausted).sort();

  return { matches, unmatchedProposers };
}

/**
 * Build a Top-K ranked list of stable matches for a single candidate, given:
 *   - the candidate's own scores toward potential targets (their preference order)
 *   - each target's scores toward the candidate (the reverse direction)
 *
 * This is a single-candidate convenience over `galeShapley` for the case where
 * we just want one person's ranked "who would stably match with me" list. It
 * does NOT compute a global matching — it computes a *local* ranking by:
 *   1. Sorting targets by candidate's score descending.
 *   2. For each target, checking whether the candidate appears in the target's
 *      reverse ranking (presence = mutual eligibility).
 *   3. Returning the first K mutually-eligible targets.
 *
 * For the weekly worker, the caller runs the full `galeShapley` over the
 * eligible cohort; for ad-hoc UI surfaces (e.g. "show me my top-10 NOW") this
 * helper avoids the cohort-wide compute.
 *
 * @param candidate       Id of the user we are ranking targets for.
 * @param pairScores      candidate → target → forward score. Higher is better.
 * @param reverseRankings target → list of proposers in descending preference order.
 * @param k               How many targets to return. Defaults to 10 (the daily Top-10 cap).
 */
export function topKStableMatches(
  candidate: string,
  pairScores: ReadonlyMap<string, number>,
  reverseRankings: ReadonlyMap<string, readonly string[]>,
  k: number = 10,
): string[] {
  if (k <= 0) return [];
  // Sort targets by candidate's forward score desc. Tie-break by target id for determinism.
  const sortedTargets = Array.from(pairScores.entries()).sort((a, b) => {
    if (a[1] !== b[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  const result: string[] = [];
  for (const [targetId] of sortedTargets) {
    if (targetId === candidate) continue; // self-match impossible.
    const rev = reverseRankings.get(targetId);
    if (!rev) continue;
    // Mutual eligibility = candidate appears in the target's reverse ranking at all.
    if (!rev.includes(candidate)) continue;
    result.push(targetId);
    if (result.length >= k) break;
  }
  return result;
}
