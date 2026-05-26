/**
 * v4 Deep Compatibility — DTM topic-vector similarity.
 *
 * DTM answers are aggregated by topic (16 canonical topics covering values,
 * lifestyle, communication, intimacy, family, finance, conflict, growth,
 * leisure, faith, ambition, autonomy, social, health, parenting, future).
 * Each user has a 16-dim normalized vector built by the dtm-vector worker
 * loop. dtmAffinity = cosTo01(cosine(meVec, candVec)) producing a score
 * suitable for both the `serious` filter and the standalone Deep Compat
 * surface.
 */
import { cosine, cosTo01 } from './math';
import { registerAlgo } from './registry';

export type DtmVector = Float32Array; // 16-dim, l2-normalized

export function dtmAffinity(me: DtmVector | null, cand: DtmVector | null): number | null {
  if (!me || !cand) return null;
  if (me.length !== cand.length) return null;
  return cosTo01(cosine(me, cand));
}

/** Per-topic deltas for explainability — index → |meᵢ − candᵢ|. */
export function dtmTopicGaps(me: DtmVector | null, cand: DtmVector | null): number[] | null {
  if (!me || !cand || me.length !== cand.length) return null;
  const out: number[] = new Array(me.length);
  for (let i = 0; i < me.length; i++) out[i] = Math.abs(me[i] - cand[i]);
  return out;
}

registerAlgo({
  name: 'dtm',
  surface: 'deepCompat',
  usesEvents: ['dtm.question_view', 'dtm.answer', 'dtm.complete'],
  weights: { dtmAffinity: 1 },
});
