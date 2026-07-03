/**
 * Miamo Move v3 — archetype classifier (Phase 4).
 *
 * Classifies a user into one of four messaging archetypes based on their
 * recent message-send patterns. Output feeds `moveStyleCompat` in
 * `forYouV6` and informs `messageSuggestV6` opener ranking.
 *
 * Archetypes:
 *   - wordsmith     long text-first messages, low voice/media share
 *   - voice_first   high voice-note share, fast cadence
 *   - visual        high media share (photos / GIFs / albums)
 *   - fast_replier  short messages, p50 reply <2 min, high reply rate
 *
 * Pure function: callers pass a `MoveStats` shape and receive an archetype
 * plus a soft-probability vector for the four classes. The classifier is
 * deterministic and uses only counts (no PII, no embeddings).
 */

export type MoveArchetype = 'wordsmith' | 'voice_first' | 'visual' | 'fast_replier';

export type MoveStats = {
  /** Average characters per text message. */
  avgMoveLenChars: number;
  /** Share of voice-note messages (0..1). */
  voiceShare: number;
  /** Share of media (photo / GIF / album) messages (0..1). */
  mediaShare: number;
  /** Median reply time in minutes. */
  p50ReplyMinutes: number;
  /** Total messages observed (for confidence). */
  totalMessages: number;
};

export type MoveClassification = {
  archetype: MoveArchetype;
  probs: Record<MoveArchetype, number>;
  confidence: number; // 0..1
};

/** Soft scores for each archetype, normalised to sum to 1.0. */
function softScores(s: MoveStats): Record<MoveArchetype, number> {
  // Heuristic per-archetype affinity in [0, 1].
  const wordsmith   = clamp01(s.avgMoveLenChars / 240) * (1 - s.voiceShare) * (1 - s.mediaShare);
  const voice_first = clamp01(s.voiceShare * 2) * clamp01(2 / Math.max(1, s.p50ReplyMinutes));
  const visual      = clamp01(s.mediaShare * 2);
  const fast_replier= clamp01(2 / Math.max(1, s.p50ReplyMinutes)) * clamp01(80 / Math.max(20, s.avgMoveLenChars));

  const sum = wordsmith + voice_first + visual + fast_replier;
  if (sum <= 0) {
    return { wordsmith: 0.25, voice_first: 0.25, visual: 0.25, fast_replier: 0.25 };
  }
  return {
    wordsmith:    wordsmith    / sum,
    voice_first:  voice_first  / sum,
    visual:       visual       / sum,
    fast_replier: fast_replier / sum,
  };
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/** Confidence: damped by sample size (asymptote 1 around totalMessages>=50)
 *  and by how peaked the soft distribution is (more peaked = more confident). */
function confidence(probs: Record<MoveArchetype, number>, totalMessages: number): number {
  const top = Math.max(probs.wordsmith, probs.voice_first, probs.visual, probs.fast_replier);
  const sample = clamp01(totalMessages / 50);
  // Top ~0.25 = flat (0 peakedness); top = 1.0 = fully peaked.
  const peakedness = clamp01((top - 0.25) / 0.75);
  return clamp01(0.5 * sample + 0.5 * peakedness);
}

export function classifyMove(stats: MoveStats): MoveClassification {
  const probs = softScores(stats);
  let best: MoveArchetype = 'wordsmith';
  let bestP = -1;
  for (const k of Object.keys(probs) as MoveArchetype[]) {
    if (probs[k] > bestP) { bestP = probs[k]; best = k; }
  }
  return { archetype: best, probs, confidence: confidence(probs, stats.totalMessages) };
}
