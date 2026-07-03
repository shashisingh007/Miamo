/**
 * v8 polarity classifier — pure module, no I/O.
 *
 * Disambiguates long-dwell-positive ("loved this profile, read every word")
 * from long-dwell-negative ("hate-scrolling, this is a disaster") per
 * DESIGN_SECTION_A §A.3. Today both look the same to the ranker, which is
 * the root cause of complaint #1 "shows me the same people."
 *
 * Output: { polarity ∈ [-1, +1], confidence ∈ [0, 1] }. Confidence reflects
 * how much signal we had to work with — long dwell + bio expand ⇒ high; short
 * dwell without action ⇒ low.
 *
 * Contract: pure, deterministic, no I/O.
 *
 * Formula (per §A.3.2 formula 14):
 *   polarity = 0.40·actionScore
 *            + 0.20·bioScore
 *            + 0.15·photoScore
 *            + 0.15·returnScore
 *            + 0.10·dwellTailScore
 *   clamped to [-1, +1].
 *
 * Weight sums to 1.00. // because: max-positive evidence ⇒ polarity = +1.0.
 */
import { clip01 } from '../math';
import { registerAlgo } from '../registry';

// ─── Type surface ────────────────────────────────────────────────────────────

export type PolaritySignal = {
  /** Signed scalar in [-1, +1]. -1 = strong negative, +1 = strong positive. */
  polarity: number;
  /** Confidence in the polarity verdict, [0, 1]. */
  confidence: number;
};

export type PolarityInput = {
  /** Final action on the card, if any. null = no action observed. */
  actionTaken: 'like' | 'pass' | 'super_like' | null;
  /** Total dwell duration on the card before action / dwell-end. */
  dwellMs: number;
  /** Did the user expand the bio? */
  bioExpanded: boolean;
  /** Number of photo swipes during the dwell. */
  photoSwipeCount: number;
  /** Did the user return to this profile within the recent window? */
  returnVisit: boolean;
  /** How many return visits (capped by the caller). */
  returnCount: number;
};

// ─── Weights (per §A.3.3, sum = 1.00) ────────────────────────────────────────

const W_ACTION  = 0.40; // because: §A.3.3 — final action is the strongest single evidence; direct user testimony, not inference
const W_BIO     = 0.20; // because: §A.3.3 — bio expand is explicit deeper-look behaviour; rarely accidental
const W_PHOTO   = 0.15; // because: §A.3.3 — photo swipe corroborates positive interest without requiring an action
const W_RETURN  = 0.15; // because: §A.3.3 — return visit corroborates lingering interest
const W_DWELL_T = 0.10; // because: §A.3.3 — dwell tail contributes texture without dominating; long dwell alone is ambiguous (the exact problem we are solving)

// ─── Sub-formulas ────────────────────────────────────────────────────────────

const PHOTO_SCALE      = 3;    // because: tanh(x/3) ≈ saturates by photoSwipeCount = 6; matches an attentive 6-photo carousel
const RETURN_CAP_DIV   = 3;    // because: 3 returns ⇒ saturated return score; beyond that is stalking and doesn't add signal
const DWELL_TAIL_MS    = 7000; // because: §A.3.3 dwell tail centred at ~3-7s; 7s + bio expand is the unambiguous-positive zone
const DWELL_TAIL_BONUS = 0.5;  // because: §A.3.3 — long-with-bio adds +0.5 to the dwell tail score, not the polarity directly
const CONFIDENCE_DWELL_SCALE = 5000; // because: 5s of dwell is "we have enough signal" inflection
const CONFIDENCE_NO_BIO_PENALTY = 0.5; // because: without bio expand we have ~half the corroborating evidence

function actionScoreOf(a: PolarityInput['actionTaken']): number {
  switch (a) {
    case 'like':       return 1;
    case 'super_like': return 1;
    case 'pass':       return -1;
    case null:         return 0;
    default:           return 0;
  }
}

/**
 * Bio score: depends on the action. // because: bio expand + like is the
 * unambiguous-positive signature; bio expand + pass is the textbook
 * hate-scroll signature (long inspection, deliberate rejection).
 */
function bioScoreOf(input: PolarityInput): number {
  if (!input.bioExpanded) return 0;
  if (input.actionTaken === 'like' || input.actionTaken === 'super_like') return 0.3;
  if (input.actionTaken === 'pass') return -0.5; // because: bio + pass is the canonical hate-scroll
  return 0;
}

/**
 * Photo score: tanh-saturating around the actionTaken sign. // because: any
 * photo-swipe alone is positive engagement, but the user's final verdict
 * tells us whether to count those photo flips as fond inspection or as
 * disgust-confirmation.
 */
function photoScoreOf(input: PolarityInput): number {
  const sign = input.actionTaken === 'like' || input.actionTaken === 'super_like'
    ? 1
    : input.actionTaken === 'pass'
      ? -1
      : 0;
  if (sign === 0) return 0;
  const mag = Math.tanh(Math.max(0, input.photoSwipeCount) / PHOTO_SCALE);
  return sign * mag;
}

/**
 * Return score: positive only. // because: per §A.3.3 a return visit alone
 * cannot flip a negative verdict to positive; the magnitude tops out at +1
 * but the sign is fixed positive.
 */
function returnScoreOf(input: PolarityInput): number {
  if (!input.returnVisit) return 0;
  const n = Math.max(0, input.returnCount);
  return Math.min(1, n / RETURN_CAP_DIV);
}

/**
 * Dwell-tail score: long dwell *with* bio expand is the strongest in-session
 * polarity hint. We tie the bonus to bioExpanded so an idle-tab user with
 * 60s on the card does not get the bonus.
 */
function dwellTailScoreOf(input: PolarityInput): number {
  if (input.dwellMs > DWELL_TAIL_MS && input.bioExpanded) return DWELL_TAIL_BONUS;
  return 0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function computePolarity(input: PolarityInput): PolaritySignal {
  const action = actionScoreOf(input.actionTaken);
  const bio    = bioScoreOf(input);
  const photo  = photoScoreOf(input);
  const ret    = returnScoreOf(input);
  const dwell  = dwellTailScoreOf(input);

  const raw =
    W_ACTION  * action +
    W_BIO     * bio +
    W_PHOTO   * photo +
    W_RETURN  * ret +
    W_DWELL_T * dwell;

  const polarity = Math.max(-1, Math.min(1, raw));

  // Confidence is independent of the polarity sign — it reflects how much
  // signal volume we had. // because: high-confidence weak-positive is more
  // actionable than low-confidence strong-positive (the latter is noise).
  const confidence = clip01(
    (Math.max(0, input.dwellMs) / CONFIDENCE_DWELL_SCALE) *
    (input.bioExpanded ? 1 : CONFIDENCE_NO_BIO_PENALTY),
  );

  return { polarity, confidence };
}

registerAlgo({
  name: 'polarityV8',
  surface: 'foundation',
  usesEvents: [
    'card.impression.100',
    'card.bio.expand',
    'card.photo.swipe',
    'discover.swipe',
    'intent.profile.settle',
  ] as const,
  weights: {},
});
