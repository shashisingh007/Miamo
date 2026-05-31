/**
 * dtmEligibility \u2014 Phase 15 DTM analog of `filterEligibility`.
 *
 * Reason-coded gate that runs before DTM v6 scoring. Reject reasons are
 * surfaced into audit logs so the candidate-pool shrinkage attribution
 * is precise.
 *
 * Gates (in order; first match wins):
 *   - self                 \u2014 never score against the user themself
 *   - blocked              \u2014 either side has blocked the other
 *   - me_no_dtm            \u2014 the asker has no DTM vector yet
 *   - me_insufficient_dtm  \u2014 asker covered < `minTopicsMe` topics
 *   - cand_no_dtm          \u2014 candidate has no DTM vector
 *   - cand_insufficient_dtm\u2014 candidate covered < `minTopicsCand` topics
 *   - opt_out              \u2014 either side opted out of deep-compat
 *
 * Pure: no DB. The candidate carries `coveredCount` (precomputed by the
 * caller using `dtmColdStart`).
 */
export type DtmEligibilityCandidate = {
  id: string;
  coveredCount?: number | null;
  optOut?: boolean | null;
};

export type DtmEligibilityContext = {
  meId: string;
  meCoveredCount?: number | null;
  meOptOut?: boolean | null;
  blockSet?: Set<string>;
  /** Min topics the asker must have answered. Default 4. */
  minTopicsMe?: number;
  /** Min topics the candidate must have answered. Default 4. */
  minTopicsCand?: number;
};

export type DtmEligibilityReason =
  | 'self'
  | 'blocked'
  | 'opt_out'
  | 'me_no_dtm'
  | 'me_insufficient_dtm'
  | 'cand_no_dtm'
  | 'cand_insufficient_dtm';

export type DtmEligibilityResult = {
  pass: DtmEligibilityCandidate[];
  reject: Array<{ id: string; reason: DtmEligibilityReason }>;
};

export function filterDtmEligibility(
  cands: DtmEligibilityCandidate[],
  ctx: DtmEligibilityContext,
): DtmEligibilityResult {
  const minMe = ctx.minTopicsMe ?? 4;
  const minCand = ctx.minTopicsCand ?? 4;
  const blocks = ctx.blockSet ?? new Set<string>();

  const pass: DtmEligibilityCandidate[] = [];
  const reject: Array<{ id: string; reason: DtmEligibilityReason }> = [];

  // Asker-level gates short-circuit the entire candidate list.
  if (ctx.meOptOut) {
    for (const c of cands) reject.push({ id: c.id, reason: 'opt_out' });
    return { pass, reject };
  }
  const meCov = ctx.meCoveredCount ?? 0;
  if (meCov <= 0) {
    for (const c of cands) reject.push({ id: c.id, reason: 'me_no_dtm' });
    return { pass, reject };
  }
  if (meCov < minMe) {
    for (const c of cands) reject.push({ id: c.id, reason: 'me_insufficient_dtm' });
    return { pass, reject };
  }

  for (const c of cands) {
    if (c.id === ctx.meId)              { reject.push({ id: c.id, reason: 'self' }); continue; }
    if (blocks.has(c.id))               { reject.push({ id: c.id, reason: 'blocked' }); continue; }
    if (c.optOut)                       { reject.push({ id: c.id, reason: 'opt_out' }); continue; }
    const cov = c.coveredCount ?? 0;
    if (cov <= 0)                       { reject.push({ id: c.id, reason: 'cand_no_dtm' }); continue; }
    if (cov < minCand)                  { reject.push({ id: c.id, reason: 'cand_insufficient_dtm' }); continue; }
    pass.push(c);
  }
  return { pass, reject };
}
