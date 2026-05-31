/**
 * v6 diversity MMR reranker — Phase 15 S5 alternative.
 *
 * Maximal Marginal Relevance (MMR) implementation that balances raw score
 * vs similarity to already-selected items. Used in the cascading pipeline
 * S5 stage when archetype-bucket rotation isn't enough (e.g. all candidates
 * share an archetype).
 *
 *   item_score = lambda * relevance(i) - (1 - lambda) * max_j sim(i, j)
 *
 * Pure: no DB. Similarity is a caller-supplied function so we don't
 * couple this module to any specific embedding shape.
 */

export type MMRItem = {
  id: string;
  score: number;
};

export type SimilarityFn<T extends MMRItem> = (a: T, b: T) => number;

export type MMROptions = {
  /** Weight on raw relevance (0 = pure diversity, 1 = pure relevance). */
  lambda?: number;
  /** Output size; default = input size. */
  k?: number;
};

export function rerankMMR<T extends MMRItem>(
  items: T[],
  similarity: SimilarityFn<T>,
  opts: MMROptions = {},
): T[] {
  const lambda = clamp01(opts.lambda ?? 0.7);
  const k = Math.max(1, Math.min(opts.k ?? items.length, items.length));
  if (items.length <= 1) return items.slice();

  const remaining = [...items];
  const picked: T[] = [];

  while (picked.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const relevance = cand.score;
      let maxSim = 0;
      for (const p of picked) {
        const s = similarity(cand, p);
        if (s > maxSim) maxSim = s;
      }
      const mmrScore = lambda * relevance - (1 - lambda) * maxSim * 100;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }
    picked.push(remaining.splice(bestIdx, 1)[0]);
  }

  return picked;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
