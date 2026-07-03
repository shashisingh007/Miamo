/**
 * Receiver Resonance Model — v8 Move v2 Composer (Section C, §2).
 *
 * Distils "what works on this receiver" from their last 10 successful
 * first-move outcomes. The composer uses the resulting distributions to
 * bias template/tone/hook sampling toward openers this receiver has
 * actually replied to.
 *
 * Pure module: the calling service queries `FirstMoveOutcome` and passes
 * the rows in. Cold-start (<3 samples) falls back to the receiver's
 * archetype prefs from moveProfile.ts.
 */

import { clip01 } from '../../math';

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export type OpenerKind =
  | 'question'
  | 'compliment'
  | 'shared_interest'
  | 'playful'
  | 'specific_detail'
  | 'voice_invite'
  | 'photo_invite';

export type ResonanceTone = 'reflective' | 'casual' | 'tactile' | 'quick';

export interface FirstMoveOutcomeSample {
  openerKind: OpenerKind;
  tone: ResonanceTone;
  replied: boolean;
  replyMs: number | null;
  openerLengthChars: number;
}

export interface ReceiverResonanceVector {
  kindDistribution: Record<string, number>;     // sums to ~1.0
  toneDistribution: Record<string, number>;     // sums to ~1.0
  preferredLengthMedian: number;
  sampleCount: number;
  confidence: number;
}

// because: §2.4 — archetype-based cold-start kind preferences from §2.4 table
export type ResonanceArchetype = 'wordsmith' | 'voice_first' | 'visual' | 'fast_replier';

// because: §2.5 — 1h reply is the §10.4 success threshold; beyond that
// the reply is more often obligatory than enthused
export const SUCCESS_REPLY_MS = 60 * 60 * 1000;

// because: §2.5 — 10 successful replies = §10.4 named window
export const RESONANCE_WINDOW = 10;

// because: §2.5 — 0/1/2 successful replies = no distribution; switch fallback
export const COLD_START_THRESHOLD = 3;

// because: archetype cold-start kind prefs from §2.4
const ARCHETYPE_KIND_PREF: Record<ResonanceArchetype, OpenerKind[]> = {
  wordsmith:    ['specific_detail', 'question', 'shared_interest'],
  voice_first:  ['voice_invite', 'playful', 'question'],
  visual:       ['photo_invite', 'specific_detail', 'compliment'],
  fast_replier: ['playful', 'question', 'specific_detail'],
};

// because: archetype-to-tone mapping mirrors moveVoice.toneFromArchetype
const ARCHETYPE_TONE: Record<ResonanceArchetype, ResonanceTone> = {
  wordsmith: 'reflective',
  voice_first: 'casual',
  visual: 'tactile',
  fast_replier: 'quick',
};

// because: 0.6/0.25/0.15 split per §2.4 — top three kinds get most of the mass
const COLD_START_KIND_WEIGHTS = [0.6, 0.25, 0.15] as const;

// because: §2.4 — 0.7 on archetype-preferred tone, 0.1 each other (3 others)
const COLD_TONE_PRIMARY = 0.7;
const COLD_TONE_OTHER = 0.1;

const ALL_KINDS: readonly OpenerKind[] = [
  'question',
  'compliment',
  'shared_interest',
  'playful',
  'specific_detail',
  'voice_invite',
  'photo_invite',
] as const;

const ALL_TONES: readonly ResonanceTone[] = ['reflective', 'casual', 'tactile', 'quick'] as const;

/** Uniform neutral — used when no samples AND no archetype fallback supplied. */
export const NEUTRAL_RESONANCE: ReceiverResonanceVector = {
  // because: 7 kinds → uniform 1/7 each = neutral prior
  kindDistribution: Object.fromEntries(ALL_KINDS.map((k) => [k, 1 / ALL_KINDS.length])),
  // because: 4 tones → uniform 1/4
  toneDistribution: Object.fromEntries(ALL_TONES.map((t) => [t, 1 / ALL_TONES.length])),
  preferredLengthMedian: 40, // because: population-median first-move length in chat corpus (rounded)
  sampleCount: 0,
  confidence: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.5)];
}

function zeroKindDist(): Record<string, number> {
  return Object.fromEntries(ALL_KINDS.map((k) => [k, 0]));
}

function zeroToneDist(): Record<string, number> {
  return Object.fromEntries(ALL_TONES.map((t) => [t, 0]));
}

function normalise(dist: Record<string, number>): Record<string, number> {
  let sum = 0;
  for (const v of Object.values(dist)) sum += v;
  if (sum <= 0) return dist;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(dist)) out[k] = v / sum;
  return out;
}

function coldStartFromArchetype(archetype: ResonanceArchetype): ReceiverResonanceVector {
  const kindDist = zeroKindDist();
  const prefs = ARCHETYPE_KIND_PREF[archetype];
  for (let i = 0; i < prefs.length && i < COLD_START_KIND_WEIGHTS.length; i++) {
    kindDist[prefs[i]] = COLD_START_KIND_WEIGHTS[i];
  }

  const toneDist = zeroToneDist();
  const primaryTone = ARCHETYPE_TONE[archetype];
  for (const t of ALL_TONES) {
    toneDist[t] = t === primaryTone ? COLD_TONE_PRIMARY : COLD_TONE_OTHER;
  }

  return {
    kindDistribution: kindDist,
    toneDistribution: toneDist,
    preferredLengthMedian: NEUTRAL_RESONANCE.preferredLengthMedian,
    sampleCount: 0,
    confidence: 0,
  };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildResonance(
  outcomes: FirstMoveOutcomeSample[],
  archetypeFallback?: { archetype: ResonanceArchetype },
): ReceiverResonanceVector {
  // because: filter to "successful" — replied AND replyMs < 1h
  const successful = (outcomes ?? []).filter(
    (o) => o.replied && o.replyMs !== null && o.replyMs < SUCCESS_REPLY_MS,
  );

  // because: bound to most-recent window — caller hands in DESC order
  const window = successful.slice(0, RESONANCE_WINDOW);

  if (window.length < COLD_START_THRESHOLD) {
    if (archetypeFallback) {
      const v = coldStartFromArchetype(archetypeFallback.archetype);
      // because: confidence still reflects observed sample count
      return { ...v, sampleCount: window.length, confidence: clip01(window.length / RESONANCE_WINDOW) };
    }
    return {
      ...NEUTRAL_RESONANCE,
      sampleCount: window.length,
      confidence: clip01(window.length / RESONANCE_WINDOW),
    };
  }

  // accumulate
  const kindDist = zeroKindDist();
  const toneDist = zeroToneDist();
  const lens: number[] = [];

  for (const o of window) {
    kindDist[o.openerKind] = (kindDist[o.openerKind] ?? 0) + 1;
    toneDist[o.tone] = (toneDist[o.tone] ?? 0) + 1;
    lens.push(o.openerLengthChars);
  }

  return {
    kindDistribution: normalise(kindDist),
    toneDistribution: normalise(toneDist),
    preferredLengthMedian: median(lens),
    sampleCount: window.length,
    confidence: clip01(window.length / RESONANCE_WINDOW),
  };
}

export const __test__ = {
  ARCHETYPE_KIND_PREF,
  ARCHETYPE_TONE,
  ALL_KINDS,
  ALL_TONES,
  coldStartFromArchetype,
  normalise,
};
