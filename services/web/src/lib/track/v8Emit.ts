/**
 * v8 (v3.6.0) typed emitters — pure, framework-free.
 *
 * Each `emit*` is the body the matching React hook in
 * `services/web/src/hooks/useTrackActivity.ts` returns. Keeping these
 * here (with no React import) lets us:
 *   1. Test the emit shape contract without a renderer.
 *   2. Reuse the same emit from a non-React caller (e.g. a Web Worker
 *      or a future imperative util) without re-implementing the
 *      validation guards.
 *
 * All payloads are validated server-side by `V6_VALIDATORS` (strict).
 * The guards here mirror those schemas so a misuse on the client is
 * dropped silently instead of producing a payload the worker rejects.
 */
import { track as mioTrack } from './index';

/** v8 surface enum — must match `surface` in services/shared/src/track/v6Validators.ts. */
export type V8Surface = 'discover' | 'matches' | 'messages' | 'profile' | 'dtm';

/** v8 tone enum — must match MoveSuggestionAcceptedSchema's `tone`. */
export type V8MoveTone = 'reflective' | 'casual' | 'tactile' | 'quick';

/** v8 language family enum — must match MoveComposedSchema's `languageFamily`. */
export type V8LanguageFamily = 'en' | 'hi_en' | 'ta_en' | 'bn_en';

/** Emit `engagement.depth_scored`. Drops invalid input silently. */
export function emitEngagementDepth(tid: string | undefined, surface: V8Surface | undefined, depth: number, accidental: boolean): void {
  if (!tid) return;
  const clamped = Math.max(0, Math.min(1, Number(depth) || 0));
  const payload: Record<string, unknown> = { tid, depth: clamped, accidentalClick: !!accidental };
  if (surface) payload.surface = surface;
  try { mioTrack('engagement.depth_scored', payload); } catch { /* never break user flow */ }
}

/** Emit `polarity.computed`. Clamps polarity to [-1,+1]. */
export function emitPolarity(tid: string | undefined, polarity: number, dwellMs?: number): void {
  if (!tid) return;
  const clamped = Math.max(-1, Math.min(1, Number(polarity) || 0));
  const payload: Record<string, unknown> = { tid, polarity: clamped };
  if (typeof dwellMs === 'number' && dwellMs >= 0) payload.dwellMs = Math.round(dwellMs);
  try { mioTrack('polarity.computed', payload); } catch { /* never break user flow */ }
}

/** Emit `move.suggestion_accepted`. Drops bad receiverHash silently. */
export function emitMoveAccepted(receiverHash: string, slotIndex: number, hookCategory: string, tone: V8MoveTone): void {
  if (!receiverHash || receiverHash.length < 20 || receiverHash.length > 24) return;
  const idx = Math.max(0, Math.min(4, Math.floor(slotIndex)));
  try {
    mioTrack('move.suggestion_accepted', { receiverHash, slotIndex: idx, hookCategory: String(hookCategory || '').slice(0, 32), tone });
  } catch { /* never break user flow */ }
}

/** Emit `move.composed`. Caps counts and category list. */
export function emitMoveComposed(receiverHash: string, suggestionCount: number, fallbackCount: number, hookCategories: string[], languageFamily: V8LanguageFamily): void {
  if (!receiverHash || receiverHash.length < 20 || receiverHash.length > 24) return;
  const sc = Math.max(0, Math.min(5, Math.floor(suggestionCount)));
  const fc = Math.max(0, Math.min(5, Math.floor(fallbackCount)));
  const cats = (Array.isArray(hookCategories) ? hookCategories : [])
    .slice(0, 5)
    .map((c) => String(c).slice(0, 32));
  try {
    mioTrack('move.composed', { receiverHash, suggestionCount: sc, fallbackCount: fc, hookCategories: cats, languageFamily });
  } catch { /* never break user flow */ }
}
