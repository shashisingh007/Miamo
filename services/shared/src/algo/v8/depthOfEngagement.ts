/**
 * v8 depth-of-engagement classifier — pure module, no I/O.
 *
 * The unit-quality signal that replaces raw impression counts across the
 * fairness Gini (KPI 11.8), exposure-ledger credit accrual (Section C), and
 * the universal fatigue penalty input. See DESIGN_SECTION_A §A.4.
 *
 * Output: depth ∈ [0, 1]. Two hard filters fire first:
 *   - Accidental-click filter (§A.4.2): trivial-tap impressions return depth=0.
 *     KPI 11.10 targets phantom-impression rate < 5%.
 *   - Undo filter: a swiped-and-then-undone impression returns depth=0.1
 *     (a very small fixed credit — the user *did* see the card but they did
 *     not mean to act on it).
 *
 * Otherwise: weighted sum of 7 sub-signals, weights summing to 1.0.
 *
 * Contract: pure, deterministic, no I/O.
 */
import { clip01 } from '../math';
import { registerAlgo } from '../registry';

// ─── Type surface ────────────────────────────────────────────────────────────

export type DepthInput = {
  /** Time the card was actively dwelled on by the user. */
  dwellMs: number;
  /** Fraction of card content scrolled, 0..1. */
  scrollDepth: number;
  /** Number of photo carousel swipes on this card. */
  photoSwipeCount: number;
  /** Did the user expand the bio? */
  bioExpanded: boolean;
  /** How many times the user returned to this profile (intent.profile.settle). */
  returnCount: number;
  /** Did the user immediately undo their swipe? */
  undoFlag: boolean;
  /** Did the user zoom in on a photo? */
  photoZoom: boolean;
  /** Did the user take a screenshot? */
  screenshotTaken: boolean;
  /** Total elapsed time from card open to close — distinguishes taps from intentional dismisses. */
  openToCloseMs: number;
};

// ─── Tunable constants ───────────────────────────────────────────────────────

/**
 * Hard threshold for the accidental-click filter. // because: opens < 500ms
 * paired with zero other engagement signals are tap-misses that pollute the
 * fairness math and exposure-ledger downstream. Per §A.4.2 KPI 11.10 target
 * < 5% phantom rate.
 */
export const ACCIDENTAL_CLICK_THRESHOLD_MS = 500;

const ACCIDENTAL_SCROLL_THRESHOLD = 0.05; // because: anything below 5% scroll is "barely loaded"; matches the §A.4.2 hard-rule clause.

const UNDO_FLOOR = 0.1; // because: §A.4 — undo signals user didn't mean it; we don't zero because they DID see the card

const DWELL_SATURATION_MS = 15_000; // because: 15s dwell is a full read-through of a typical bio; saturate to keep marathon dwells from dominating
const PHOTO_SATURATION = 4;         // because: §A.4 — 4 photos is a full carousel inspection
const RETURN_SATURATION = 3;        // because: §A.4 — 3 returns is "this profile stuck"; beyond that we're in stalking territory

// Coefficient weights — exactly sum to 1.00 per §A.4.3. The // because: line
// on each constant carries the rationale.
const C_DWELL  = 0.30; // because: §A.4 — dwell is the universal proxy but gameable, capped at 0.30
const C_SCROLL = 0.15; // because: §A.4 — scroll depth is harder to fake; requires deliberate motion
const C_PHOTO  = 0.15; // because: §A.4 — photo swipes are positive but easy (one finger flick)
const C_BIO    = 0.20; // because: §A.4 — bio expand is the strongest single signal
const C_RETURN = 0.10; // because: §A.4 — return visit means the profile stuck
const C_ZOOM   = 0.05; // because: §A.4 — photo zoom is rare and high-signal
const C_SCREEN = 0.05; // because: §A.4 — screenshot is very rare; strong intent (+share)

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute depth-of-engagement ∈ [0, 1] for a single impression.
 * Pure. Deterministic. The caller persists the result inline into
 * `engagement.depth_scored` (event schema in §A.5.2) and via the rollup
 * worker into `EventAggHourly`.
 */
export function computeDepth(input: DepthInput): number {
  // ─── Hard filter 1: accidental click (§A.4.2).
  // Four-clause AND — all must hold for the filter to fire.
  if (
    input.openToCloseMs < ACCIDENTAL_CLICK_THRESHOLD_MS &&
    input.scrollDepth < ACCIDENTAL_SCROLL_THRESHOLD &&
    input.photoSwipeCount === 0 &&
    !input.bioExpanded
  ) {
    return 0;
  }

  // ─── Hard filter 2: undo. We give the impression a tiny constant credit.
  if (input.undoFlag) return UNDO_FLOOR;

  // ─── Weighted sum.
  // Dwell: log-curve saturating at DWELL_SATURATION_MS.
  // We use log1p(dwell) / log1p(saturation) so dwell=0 ⇒ term=0 and
  // dwell=saturation ⇒ term=1.
  const dwellTerm  = clip01(Math.log1p(Math.max(0, input.dwellMs)) / Math.log1p(DWELL_SATURATION_MS));
  const scrollTerm = clip01(input.scrollDepth);
  const photoTerm  = clip01(Math.max(0, input.photoSwipeCount) / PHOTO_SATURATION);
  const bioTerm    = input.bioExpanded ? 1 : 0;
  const returnTerm = clip01(Math.max(0, input.returnCount) / RETURN_SATURATION);
  const zoomTerm   = input.photoZoom ? 1 : 0;
  const screenTerm = input.screenshotTaken ? 1 : 0;

  const depth =
    C_DWELL  * dwellTerm +
    C_SCROLL * scrollTerm +
    C_PHOTO  * photoTerm +
    C_BIO    * bioTerm +
    C_RETURN * returnTerm +
    C_ZOOM   * zoomTerm +
    C_SCREEN * screenTerm;

  return clip01(depth);
}

registerAlgo({
  name: 'depthOfEngagementV8',
  surface: 'foundation',
  usesEvents: [
    'card.impression.50',
    'card.impression.100',
    'card.bio.expand',
    'card.photo.swipe',
    'card.photo.zoom',
    'card.screenshot',
    'intent.profile.settle',
    'swipe.undo',
  ] as const,
  weights: {},
});
