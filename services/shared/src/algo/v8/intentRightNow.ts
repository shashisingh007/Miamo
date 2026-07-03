/**
 * v8 right-now intent classifier — pure module, no I/O.
 *
 * Produces a 7-class probability vector summing to 1.0. The vector is the
 * perception input for forYouV8 / dtmFeedV8 (Sections B+E). Section A of the
 * v3.6.0 design doc fixes the class set, the signature signals per class,
 * and the log-linear log-odds coefficients. See DESIGN_SECTION_A §A.1.
 *
 * Contract:
 *   - No I/O. No Date.now(). All time-sensitive inputs flow in via `nowMs`
 *     and per-event `ageMs`. Determinism: same inputs → same outputs.
 *   - No env reads. Callers gate behind INTENT_INFERENCE_ENABLED; this module
 *     stays pure so the contract test (registerAlgo + usesEvents) can run
 *     without process state.
 *   - Coefficients are local constants with `// because:` rationale. Tunable
 *     post-launch via a wrapper module if needed (not here).
 *
 * Algorithm (per DESIGN_SECTION_A §A.1.3):
 *   1. Start from the cold-start prior in log-space.
 *   2. Walk lastNEvents (most-recent 30) and viewerFeatures, accumulating
 *      per-class additive log-odds from signature-event matches.
 *   3. Softmax → probability vector, clip01 each, renormalise to sum=1.0.
 *
 * Returns INTENT_CLASS_PRIOR exactly when `lastNEvents.length === 0`.
 */
import { clip01 } from '../math';
import { registerAlgo } from '../registry';

// ─── Type surface ────────────────────────────────────────────────────────────

export type IntentClass =
  | 'distraction_browse'
  | 'intentional_browse'
  | 'reply_mood'
  | 'review_existing'
  | 'serious_search'
  | 'casual_scroll'
  | 'decision_fatigued';

export type IntentVector = { [K in IntentClass]: number };

/**
 * Canonical order of the 7 classes. Used by tests and by any caller that
 * needs to iterate deterministically (argmax tie-breaking, serialisation).
 */
export const ALL_INTENT_CLASSES: readonly IntentClass[] = [
  'distraction_browse',
  'intentional_browse',
  'reply_mood',
  'review_existing',
  'serious_search',
  'casual_scroll',
  'decision_fatigued',
] as const;

/**
 * Cold-start prior — uniform 1/7 each. // because: with no observed events
 * we have no information; uniform is the maximum-entropy prior that does not
 * silently bias the downstream ranker toward any class.
 */
export const INTENT_CLASS_PRIOR: IntentVector = {
  distraction_browse: 1 / 7,
  intentional_browse: 1 / 7,
  reply_mood:         1 / 7,
  review_existing:    1 / 7,
  serious_search:     1 / 7,
  casual_scroll:      1 / 7,
  decision_fatigued:  1 / 7,
};

/**
 * Volatile-state TTL for `FeatureSnapshot.raw.intentRightNow.computedAt`.
 * Readers older than this MUST fall back to the cold-start prior rather than
 * return stale intent. // because: a stale 5-minute-old intent vector causes
 * wrong recommendations that look like "the app doesn't learn me" (user pain
 * #11); a missing one causes neutral recommendations that look like "the app
 * is being careful." The latter is the only safe failure mode. (§A.1.4)
 */
export const INTENT_TTL_MS = 90_000;

/** Recent tracking event for the classifier. `ageMs` is `nowMs - ts`. */
export type RecentEvent = {
  evt: string;
  payload?: Record<string, unknown>;
  ageMs: number;
};

/**
 * Per-viewer features that come from FeatureSnapshot / settings, not from
 * the event stream. Optional fields default to a neutral interpretation —
 * see SIGNATURE_HITS below for how each is consumed.
 */
export type ViewerFeatures = {
  chronotype?: string;
  attentionProfile?: string;
  /** SessionSummary flag: previous session looked like browse-without-commit. */
  lastSessionWindowShopping?: boolean;
};

export type IntentInferenceInput = {
  lastNEvents: ReadonlyArray<RecentEvent>;
  viewerFeatures: ViewerFeatures;
  nowMs: number;
};

// ─── Tunable constants ───────────────────────────────────────────────────────

/**
 * Maximum number of recent events we score. // because: the design's signature
 * signals are all "in last 90s" or "in last 5min" — past ~30 events is either
 * outside both windows or already aggregated by the rollup worker into the
 * features the rollup-driven path (the spec used in the design doc) reads.
 */
export const MAX_EVENT_WINDOW = 30;

/** Recency window for "active right now" event-age filtering, in ms.
 *
 * // v2: audit flagged 5min as too tight — a user who paused for a phone
 * // call could see their whole session's evidence discarded. Extended to
 * // 10min per the design's revised "stable jitter" recommendation. The
 * // §A.1 signature signals (reply_mood, decision_fatigued) still consult
 * // the shorter TIGHT_WINDOW_MS below, so behaviour on the fastest
 * // signals is unchanged. // because [audit §E.2 #6]: two consecutive
 * // sessions of a user should not require re-warm-up when a 6-minute
 * // interruption in reality is common.
 */
const RECENT_WINDOW_MS = 10 * 60 * 1000;

/** Tight window for "very recent" features such as msg.compose_start. */
const TIGHT_WINDOW_MS = 90 * 1000; // because: 90s mirrors the INTENT_TTL_MS itself.

// ─── Signature-event mapping ─────────────────────────────────────────────────

/**
 * For each intent class, the events (or feature flags) that contribute
 * positive evidence, along with the additive log-odds weight per occurrence.
 * Coefficients calibrated to the §A.1.3 formulas. Each entry has a `because`
 * comment to make the rationale falsifiable.
 *
 * NOTE: this table drives the public class-signature documentation. Editing
 * it without updating the design doc breaks the contract — keep them in sync.
 */
const SIGNATURE_HITS: Record<IntentClass, ReadonlyArray<{
  /** Event name match. `'*'` means "any event." */
  evt?: string;
  /** Optional payload predicate, e.g. dwellMs threshold. */
  predicate?: (ev: RecentEvent) => boolean;
  /** Cap on this entry's total contribution across the window. */
  cap: number;
  /** Per-occurrence log-odds increment. */
  perHit: number;
}>> = {
  // ─ distraction_browse: low dwell + high scroll velocity + route churn
  distraction_browse: [
    { evt: 'nav.route',           cap: 2.4, perHit: 0.3 }, // because: route churn ≥4/min ⇒ +0.8 contribution; each hit ~+0.3
    { evt: 'card.impression.50',  cap: 1.2, perHit: 0.15, predicate: (e) => dwellOf(e) < 600 }, // because: short-dwell impressions corroborate flick browsing
    { evt: 'discover.swipe',      cap: 1.2, perHit: 0.15 }, // because: high swipe rate without bio expand
  ],

  // ─ intentional_browse: medium dwell + bio expand + photo swipe
  intentional_browse: [
    { evt: 'card.bio.expand',     cap: 2.1, perHit: 0.7 }, // because: §A.1.3 formula 2: bioExpands≥1 contributes +0.7
    { evt: 'card.photo.swipe',    cap: 1.5, perHit: 0.5 }, // because: photoSwipes≥1 contributes +0.5
    { evt: 'card.impression.100', cap: 2.0, perHit: 0.25, predicate: (e) => {
      const d = dwellOf(e);
      return d >= 1500 && d <= 6000; // because: mid-dwell band per §A.1
    }},
  ],

  // ─ reply_mood: compose + send activity in last 5min
  reply_mood: [
    { evt: 'msg.send',            cap: 2.0, perHit: 0.6 }, // because: §A.1.3 formula 3: msgSends/min≥2 ⇒ +0.6 per hit
    { evt: 'msg.compose_start',   cap: 1.6, perHit: 0.5 }, // because: compose start is a strong intent signal — explicit reply
    { evt: 'focus.element',       cap: 0.8, perHit: 0.4, predicate: (e) => {
      const id = (e.payload as { id?: string } | undefined)?.id;
      return typeof id === 'string' && /compose|input|textarea/i.test(id);
    }},
    { evt: 'nav.route',           cap: 1.4, perHit: 1.4, predicate: (e) => {
      const r = (e.payload as { route?: string } | undefined)?.route;
      return typeof r === 'string' && /^\/messages(\/|$)/.test(r);
    }}, // because: §A.1.3 formula 3: onMessagesRoute ⇒ +1.4
  ],

  // ─ review_existing: matches route + chat surface activity + repeat tids
  review_existing: [
    { evt: 'nav.route',           cap: 1.2, perHit: 1.2, predicate: (e) => {
      const r = (e.payload as { route?: string } | undefined)?.route;
      return typeof r === 'string' && /^\/matches(\/|$)/.test(r);
    }}, // because: §A.1.3 formula 4: onMatchesRoute ⇒ +1.2
    { evt: 'discover.see_later.view', cap: 1.5, perHit: 1.5 }, // because: §A.1.3 formula 4: seeLaterViews≥1 ⇒ +1.5
    { evt: 'chat.open',           cap: 0.6, perHit: 0.3 }, // because: opening an existing chat thread is revisit evidence
  ],

  // ─ serious_search: filter changes + DTM activity + long dwell + multi bio expand
  serious_search: [
    { evt: 'filter.change',       cap: 1.2, perHit: 0.4 }, // because: filter tweaks are deliberate evaluation
    { evt: 'filter.hesitation',   cap: 0.6, perHit: 0.6 }, // because: §A.1.3 formula 5: hesitations≥1 ⇒ +0.6
    { evt: 'dtm.answer',          cap: 1.4, perHit: 0.7 }, // because: DTM activity = high-engagement deliberate eval
    { evt: 'card.bio.expand',     cap: 1.0, perHit: 0.5 }, // because: §A.1.3: bioExpands≥2 adds on top of intentional_browse credit
    { evt: 'card.impression.100', cap: 1.2, perHit: 0.4, predicate: (e) => dwellOf(e) > 5000 }, // because: dwellP50>5000 ⇒ +1.2 total
  ],

  // ─ casual_scroll: long scroll without action — the population mode
  casual_scroll: [
    { evt: 'card.impression.50',  cap: 0.6, perHit: 0.1 }, // because: passive impressions accumulate the casual baseline
    { evt: 'card.impression.100', cap: 0.6, perHit: 0.15, predicate: (e) => {
      const d = dwellOf(e);
      return d >= 800 && d <= 2500;
    }}, // because: §A.1.3 formula 6: mid-low dwell band feeds casual_scroll
    { evt: 'discover.swipe',      cap: 0.3, perHit: 0.05 }, // because: low-intensity background swipes
  ],

  // ─ decision_fatigued: rage clicks + low success ratio + regret + repeat-pass
  decision_fatigued: [
    { evt: 'click.rage',          cap: 1.4, perHit: 0.35 }, // because: §A.1.3 formula 7: rageClicks≥4 ⇒ +1.4
    { evt: 'swipe.regret',        cap: 1.5, perHit: 0.5 }, // because: regret≥1 ⇒ +1.0; cap allows up-stack credit
    { evt: 'swipe.repeat_pass',   cap: 1.5, perHit: 0.65 }, // because: repeatPass≥1 ⇒ +1.3
    { evt: 'click.dead',          cap: 0.6, perHit: 0.15 }, // because: dead clicks corroborate fatigue
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dwellOf(ev: RecentEvent): number {
  const d = (ev.payload as { dwellMs?: number } | undefined)?.dwellMs;
  return typeof d === 'number' && Number.isFinite(d) ? d : 0;
}

function softmax(logits: IntentVector): IntentVector {
  // Subtract max for numerical stability.
  let max = -Infinity;
  for (const k of ALL_INTENT_CLASSES) if (logits[k] > max) max = logits[k];
  const probs: IntentVector = { ...INTENT_CLASS_PRIOR };
  let z = 0;
  for (const k of ALL_INTENT_CLASSES) {
    const v = Math.exp(logits[k] - max);
    probs[k] = v;
    z += v;
  }
  if (z === 0 || !Number.isFinite(z)) return { ...INTENT_CLASS_PRIOR };
  let renorm = 0;
  for (const k of ALL_INTENT_CLASSES) {
    probs[k] = clip01(probs[k] / z);
    renorm += probs[k];
  }
  // Re-renormalise after clip01 to guarantee Σ = 1.0 within tolerance.
  if (renorm > 0) for (const k of ALL_INTENT_CLASSES) probs[k] = probs[k] / renorm;
  return probs;
}

function isRecent(ev: RecentEvent, windowMs: number): boolean {
  return Number.isFinite(ev.ageMs) && ev.ageMs >= 0 && ev.ageMs <= windowMs;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Classify the viewer's right-now intent into a 7-class probability vector.
 *
 * Pure. Deterministic. No I/O. The caller is responsible for:
 *   - Reading the env flag INTENT_INFERENCE_ENABLED before invoking.
 *   - Persisting the result to FeatureSnapshot.raw.intentRightNow with the
 *     INTENT_TTL_MS contract.
 *   - Emitting the `intent.snapshot` tracking event for observability.
 */
export function inferIntent(input: IntentInferenceInput): IntentVector {
  const { lastNEvents, viewerFeatures } = input;

  // Empty-event branch: return the prior unmodified. Callers depend on this
  // identity to keep cold-start traffic on the V7 ranker.
  if (lastNEvents.length === 0) return { ...INTENT_CLASS_PRIOR };

  // Take only the most-recent MAX_EVENT_WINDOW events. We assume the caller
  // passes them already sorted oldest→newest *or* newest→oldest; the only
  // dependency we have is `ageMs`, which is order-independent. We still cap
  // the iteration to bound cost.
  const window = lastNEvents.length > MAX_EVENT_WINDOW
    ? lastNEvents.slice(-MAX_EVENT_WINDOW)
    : lastNEvents;

  // Initialise logits from log-prior. Uniform prior ⇒ log(1/7) for all,
  // which softmax cancels out. We keep the math explicit for readability.
  const logits: IntentVector = {
    distraction_browse: Math.log(INTENT_CLASS_PRIOR.distraction_browse),
    intentional_browse: Math.log(INTENT_CLASS_PRIOR.intentional_browse),
    reply_mood:         Math.log(INTENT_CLASS_PRIOR.reply_mood),
    review_existing:    Math.log(INTENT_CLASS_PRIOR.review_existing),
    serious_search:     Math.log(INTENT_CLASS_PRIOR.serious_search),
    casual_scroll:      Math.log(INTENT_CLASS_PRIOR.casual_scroll),
    decision_fatigued:  Math.log(INTENT_CLASS_PRIOR.decision_fatigued),
  };

  // ── Walk signature hits per class, with per-class accumulators capped.
  for (const cls of ALL_INTENT_CLASSES) {
    let acc = 0;
    const rules = SIGNATURE_HITS[cls];
    for (const rule of rules) {
      let ruleAcc = 0;
      for (const ev of window) {
        // Reply-mood is a tight-window class; others use the standard recent window.
        const win = cls === 'reply_mood' ? TIGHT_WINDOW_MS : RECENT_WINDOW_MS;
        if (!isRecent(ev, win)) continue;
        if (rule.evt && rule.evt !== '*' && ev.evt !== rule.evt) continue;
        if (rule.predicate && !rule.predicate(ev)) continue;
        ruleAcc += rule.perHit;
        if (ruleAcc >= rule.cap) { ruleAcc = rule.cap; break; }
      }
      acc += ruleAcc;
    }
    logits[cls] += acc;
  }

  // ── Cross-feature pulls from viewerFeatures.
  // because: window-shopping last session is the strongest single feature for
  // intentional_browse — see SessionSummary.windowShopping definition.
  if (viewerFeatures.lastSessionWindowShopping === true) {
    logits.intentional_browse += 0.4;
  }
  // because: attentionProfile=='laser' biases toward serious_search; ==='flicker' biases toward distraction_browse.
  if (viewerFeatures.attentionProfile === 'laser')   logits.serious_search    += 0.3;
  if (viewerFeatures.attentionProfile === 'flicker') logits.distraction_browse += 0.3;

  // ── Decision-fatigued has an extra global "low success ratio" pull.
  // because: §A.1: rage clicks > 4 per 5min is the strongest single fatigue marker.
  const rageHits = window.filter(e => e.evt === 'click.rage' && isRecent(e, RECENT_WINDOW_MS)).length;
  const regretHits = window.filter(e => e.evt === 'swipe.regret' && isRecent(e, RECENT_WINDOW_MS)).length;
  const passHits = window.filter(e => e.evt === 'swipe.repeat_pass' && isRecent(e, RECENT_WINDOW_MS)).length;
  const successHits = window.filter(e => /swipe\.commit|msg\.send|match\.created/.test(e.evt) && isRecent(e, RECENT_WINDOW_MS)).length;
  const totalFailure = rageHits + regretHits + passHits;
  if (totalFailure >= 3 && successHits === 0) logits.decision_fatigued += 0.6; // because: large failure-to-success delta inside the recent window.

  return softmax(logits);
}

/**
 * Argmax over the canonical class order. Stable tie-break: the earlier class
 * in ALL_INTENT_CLASSES wins, so callers get deterministic behaviour for
 * pathological all-equal vectors (e.g. the prior).
 */
export function topIntent(vec: IntentVector): IntentClass {
  let best: IntentClass = ALL_INTENT_CLASSES[0];
  let bestVal = -Infinity;
  for (const k of ALL_INTENT_CLASSES) {
    if (vec[k] > bestVal) {
      bestVal = vec[k];
      best = k;
    }
  }
  return best;
}

/**
 * Confidence = top-class probability minus the uniform baseline (1/7), clipped
 * to [0,1]. // because: a vector that beats uniform by less than ~0.05 is
 * indistinguishable from noise; callers want a single scalar that says
 * "do we believe this enough to act on it."
 */
export function intentConfidence(vec: IntentVector): number {
  const top = vec[topIntent(vec)];
  return clip01(top - 1 / 7);
}

// ─── Algo registry wire ──────────────────────────────────────────────────────

registerAlgo({
  name: 'intentRightNowV8',
  surface: 'foundation',
  usesEvents: [
    'card.impression.50',
    'card.impression.100',
    'card.bio.expand',
    'card.photo.swipe',
    'discover.swipe',
    'swipe.regret',
    'swipe.repeat_pass',
    'nav.route',
    'focus.element',
    'msg.send',
    'msg.compose_start',
    'discover.see_later.view',
    'filter.change',
    'filter.hesitation',
    'click.rage',
    'click.dead',
    'chat.open',
    'dtm.answer',
  ] as const,
  weights: {}, // foundation module — no ranker weights to expose
});
