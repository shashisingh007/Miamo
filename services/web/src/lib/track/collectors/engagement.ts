/**
 * v8 (v3.6.0) engagement-depth + polarity collector.
 *
 * Accumulates per-card signals as the user interacts with a Discover /
 * Reels surface, then emits two strict-validated events at "commit time"
 * (swipe / advance / unmount):
 *
 *   - `engagement.depth_scored`   — depth ∈ [0,1] from dwell + bio + photo
 *   - `polarity.computed`          — polarity ∈ [-1,+1] from direction + dwell
 *
 * Imperative, framework-agnostic, idempotent: a second commit for the
 * same tid is a no-op so React StrictMode double-invokes don't double-
 * count. Tests can call `_reset()` to clear state between cases.
 */

import { track } from '../index';

const ALLOWED_SURFACES = new Set(['discover', 'matches', 'messages', 'profile', 'dtm']);

type CardState = {
  visibleAt: number;        // performance.now()
  bioExpanded: boolean;
  photoSwiped: boolean;     // any photo carousel nav happened
  hovered: boolean;
  liked: boolean;           // user tapped a like icon (within-card)
  surface: string | null;
  committed: boolean;       // commit already emitted → block double-fire
};

const cards = new Map<string, CardState>();

function getOrCreate(tid: string, surface?: string): CardState {
  let s = cards.get(tid);
  if (!s) {
    s = {
      visibleAt: performance.now(),
      bioExpanded: false,
      photoSwiped: false,
      hovered: false,
      liked: false,
      surface: surface ?? null,
      committed: false,
    };
    cards.set(tid, s);
  } else if (surface && !s.surface) {
    s.surface = surface;
  }
  return s;
}

/** Map a number to [lo, hi]. */
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Compute depth ∈ [0,1] from observed signals.
 *
 *   dwellMs:        0..1500 contributes linearly up to 0.5
 *   bio expanded:   +0.20
 *   photo swiped:   +0.15
 *   like tapped:    +0.20
 *   hovered:        +0.05 (tiny floor: user paused over the card)
 *
 * Capped at 1.0.
 */
export function computeDepth(s: { dwellMs: number; bioExpanded: boolean; photoSwiped: boolean; hovered: boolean; liked: boolean }): number {
  const dwellTerm = clamp(s.dwellMs / 3_000, 0, 0.5);
  let d = dwellTerm;
  if (s.bioExpanded) d += 0.20;
  if (s.photoSwiped) d += 0.15;
  if (s.liked) d += 0.20;
  if (s.hovered) d += 0.05;
  return Math.round(clamp(d, 0, 1) * 1000) / 1000;
}

/**
 * Compute polarity ∈ [-1, +1] from swipe direction + dwell.
 *
 * Base by direction:
 *   right: +0.5, super: +0.8, left: -0.5, up: +0.6
 *
 * Plus dwell modifier (longer dwell → stronger signal in that direction):
 *   |Δ| ≤ 0.3, sign matches base.
 *
 * Plus +0.1 if user expanded bio before the like (intent), -0.2 if it
 * was a < 500ms reflexive pass (likely accidental / fatigued).
 */
export function computePolarity(args: {
  direction: 'left' | 'right' | 'up' | 'super';
  dwellMs: number;
  bioExpanded: boolean;
}): number {
  let base: number;
  switch (args.direction) {
    case 'right':  base = 0.5; break;
    case 'super':  base = 0.8; break;
    case 'up':     base = 0.6; break;
    case 'left':   base = -0.5; break;
    default:       base = 0;
  }
  // Dwell modifier: a fully read card pushes ±0.3, a 0ms scan pushes 0.
  const sign = base >= 0 ? 1 : -1;
  const dwellMod = sign * clamp(args.dwellMs / 5_000, 0, 0.3);
  let p = base + dwellMod;
  if (base > 0 && args.bioExpanded) p += 0.10;
  if (base < 0 && args.dwellMs < 500) p -= 0.20;
  return Math.round(clamp(p, -1, 1) * 1000) / 1000;
}

export const engagementTracker = {
  /** Called when the card first becomes visible. Idempotent per tid. */
  onCardVisible(tid: string, surface?: string): void {
    if (!tid) return;
    const s = cards.get(tid);
    if (!s) {
      cards.set(tid, {
        visibleAt: performance.now(),
        bioExpanded: false,
        photoSwiped: false,
        hovered: false,
        liked: false,
        surface: surface ?? null,
        committed: false,
      });
    } else if (s.committed) {
      // A previously-committed card is being revisited (undo). Reset so
      // the next commit re-fires with fresh signals.
      s.visibleAt = performance.now();
      s.committed = false;
    }
  },

  onBioExpand(tid: string): void { if (tid) getOrCreate(tid).bioExpanded = true; },
  onPhotoSwipe(tid: string): void { if (tid) getOrCreate(tid).photoSwiped = true; },
  onHover(tid: string): void { if (tid) getOrCreate(tid).hovered = true; },
  onLike(tid: string): void { if (tid) getOrCreate(tid).liked = true; },

  /**
   * Emit `engagement.depth_scored` + `polarity.computed` for the given
   * card. Called on swipe commit, advance, or unmount.
   *
   *   direction: 'right' | 'left' | 'up' | 'super'
   *     right    → like
   *     super    → super-like (also right-like signal)
   *     up       → save / see-later (mild positive)
   *     left     → pass
   */
  commit(tid: string, direction: 'left' | 'right' | 'up' | 'super', opts?: { surface?: string }): void {
    if (!tid) return;
    const s = cards.get(tid);
    if (!s || s.committed) return;
    s.committed = true;
    const surface = opts?.surface || s.surface || undefined;
    const dwellMs = Math.max(0, Math.round(performance.now() - s.visibleAt));
    const depth = computeDepth({ dwellMs, bioExpanded: s.bioExpanded, photoSwiped: s.photoSwiped, hovered: s.hovered, liked: s.liked });
    const accidentalClick = dwellMs < 500 && !s.bioExpanded && !s.photoSwiped;
    const polarity = computePolarity({ direction, dwellMs, bioExpanded: s.bioExpanded });

    const depthPayload: Record<string, unknown> = { tid, depth, accidentalClick };
    if (surface && ALLOWED_SURFACES.has(surface)) depthPayload.surface = surface;
    try { track('engagement.depth_scored', depthPayload); } catch { /* swallow */ }
    try { track('polarity.computed', { tid, polarity, dwellMs }); } catch { /* swallow */ }
  },

  /**
   * Read-only snapshot for tests + the same-tid commit logic. Returns
   * `null` if the tid hasn't been seen.
   */
  snapshot(tid: string): (CardState & { dwellMs: number }) | null {
    const s = cards.get(tid);
    if (!s) return null;
    return { ...s, dwellMs: Math.max(0, Math.round(performance.now() - s.visibleAt)) };
  },

  /** Clear all in-memory state — tests + session boundaries. */
  _reset(): void { cards.clear(); },
};
