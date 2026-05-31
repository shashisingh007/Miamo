/**
 * dtmCompatExplain \u2014 DTM Phase 11 per-topic compatibility explainer.
 *
 * Distinct from `dtmTopicHints` (which surfaces high-agreement chips):
 * this returns a *signed* breakdown so the UI can show both supports
 * (`+`) and risks (`-`) on the same pair card.
 *
 *   topicScore = weight * (agreement * 2 - 1)   // \u2208 [\u2212weight, +weight]
 *   sortKey    = |topicScore|                    // strongest signal first
 *
 * Output items keep the signed `score` and a `polarity: 'support'|'risk'`
 * flag so callers don't have to re-derive it.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

const D = DTM_TOPIC_KEYS.length;

export type DtmCompatExplainInputs = {
  me: Float32Array;
  cand: Float32Array;
  weights: Float32Array;
  topN?: number;        // default 3
  minAbsScore?: number; // default 0.02
};

export type DtmCompatItem = {
  topic: DtmTopicKey;
  score: number; // signed
  polarity: 'support' | 'risk';
};

export function explainDtmCompat(inp: DtmCompatExplainInputs): DtmCompatItem[] {
  const n = Math.max(1, inp.topN ?? 3);
  const min = Math.max(0, inp.minAbsScore ?? 0.02);
  const lim = Math.min(inp.me.length, inp.cand.length, inp.weights.length, D);
  const items: Array<DtmCompatItem & { _abs: number; _idx: number }> = [];
  for (let i = 0; i < lim; i++) {
    const diff = Math.min(2, Math.abs(inp.me[i] - inp.cand[i]));
    const agreement = 1 - diff / 2;       // [0, 1]
    const signed = inp.weights[i] * (agreement * 2 - 1); // [\u2212w, +w]
    const abs = Math.abs(signed);
    if (abs < min) continue;
    items.push({
      topic: DTM_TOPIC_KEYS[i],
      score: signed,
      polarity: signed >= 0 ? 'support' : 'risk',
      _abs: abs,
      _idx: i,
    });
  }
  return items
    .sort((a, b) => (b._abs - a._abs) || (a._idx - b._idx))
    .slice(0, n)
    .map(({ topic, score, polarity }) => ({ topic, score, polarity }));
}
