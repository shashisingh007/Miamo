/**
 * Discover Cascading Pipeline v6 — Phase 15.
 *
 * Five additive stages, each guarded by `PIPELINE_S{N}_ENABLED`.
 * Stages are pure transforms on a `Candidate` list — they do not query
 * the DB themselves. The caller (gateway Discover handler) supplies the
 * already-loaded candidates and signal context.
 *
 *   S1 eligibility     hard filters (consent, blocked, paywall gates)
 *   S2 recall          coarse pre-rank to keep the top-K by cheap signals
 *   S3 compat_score    full v6 score (delegated to forYouV6)
 *   S4 policy_rerank   applies DiscoverPolicy nudges (reciprocity boost etc)
 *   S5 session_adapt   diversity + novelty mixing for the current session
 *
 * The stages are designed so each one is a no-op when its flag is off.
 * That guarantees the legacy ranker keeps working even with the pipeline
 * scaffolding deployed.
 */
import type { SessionSummaryRow } from './signals';
import { pipelineStageEnabled } from './flags';
import { computeDiscoverPolicy } from './discoverPolicy';

export type Candidate = {
  id: string;
  score: number;
  archetype?: string | null;
  intent?: string | null;
  /** explicit eligibility hints (blocked, paywall, consent, etc.). */
  ineligible?: boolean;
  ineligibleReason?: string;
  /** how recently caller has seen this candidate (lower = fresher). */
  staleness?: number;
  /** explanation breakdown from the v6 scorer (optional). */
  explain?: Record<string, unknown>;
};

export type PipelineContext = {
  sessions: SessionSummaryRow[];
  /** caller's session id (drives diversity bucketing). */
  sessionId?: string;
};

/** S1 — hard eligibility filter. Idempotent and always safe to run. */
export function stageEligibility(cands: Candidate[]): Candidate[] {
  return cands.filter((c) => !c.ineligible);
}

/** S2 — coarse recall: keep top-K by score cheaply. K = ceil(0.8 * N). */
export function stageRecall(cands: Candidate[], k = Math.ceil(cands.length * 0.8)): Candidate[] {
  const sorted = [...cands].sort((a, b) => b.score - a.score);
  return sorted.slice(0, Math.max(k, 1));
}

/** S3 — apply DiscoverPolicy adjustments. Pure scoring tweak. */
export function stagePolicyRerank(cands: Candidate[], ctx: PipelineContext): Candidate[] {
  const policy = computeDiscoverPolicy(ctx.sessions);
  if (policy.reciprocityBoost === 1 && policy.candPoolMultiplier === 1) return cands;

  const k = Math.max(1, Math.floor(cands.length * policy.candPoolMultiplier));
  const boosted = cands.map((c) => ({
    ...c,
    score: c.score * policy.reciprocityBoost,
  }));
  boosted.sort((a, b) => b.score - a.score);
  return boosted.slice(0, k);
}

/** S5 — diversity + novelty rerank. Penalise consecutive same-archetype
 *  cards and lightly boost fresher ones. */
export function stageSessionAdapt(cands: Candidate[]): Candidate[] {
  if (cands.length < 2) return cands;
  const out: Candidate[] = [];
  const used = new Map<string, number>(); // archetype -> count seen so far
  const queue = [...cands];
  while (queue.length) {
    // pick the highest-score candidate whose archetype has been seen < 2 times
    // in the last 4 picks; fall back to first if no eligible found.
    let pickIdx = 0;
    for (let i = 0; i < queue.length; i++) {
      const arc = queue[i].archetype ?? 'unknown';
      if ((used.get(arc) ?? 0) < 2) { pickIdx = i; break; }
    }
    const picked = queue.splice(pickIdx, 1)[0];
    out.push(picked);
    const arc = picked.archetype ?? 'unknown';
    used.set(arc, (used.get(arc) ?? 0) + 1);
    // age out: every 4 picks decay all counts.
    if (out.length % 4 === 0) {
      for (const [k, v] of used) used.set(k, Math.max(0, v - 1));
    }
  }
  return out;
}

/** Run the full pipeline. Each stage is skipped when its flag is off. */
export function runPipeline(cands: Candidate[], ctx: PipelineContext): Candidate[] {
  let curr = cands;
  if (pipelineStageEnabled('S1')) curr = stageEligibility(curr);
  if (pipelineStageEnabled('S2')) curr = stageRecall(curr);
  // S3 is the v6 score itself — assumed already in `score`; nothing to do here.
  if (pipelineStageEnabled('S4')) curr = stagePolicyRerank(curr, ctx);
  if (pipelineStageEnabled('S5')) curr = stageSessionAdapt(curr);
  return curr;
}
