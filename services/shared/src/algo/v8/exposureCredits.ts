/**
 * v8 Exposure-Credits — pure credit-accrual math.
 *
 * The DB write (append to ExposureLedger + upsert ExposureCredit) is performed
 * by the worker shell (services/tracking-worker/src/exposureScheduler.ts). This
 * module answers the question: "for this action, how many credits does the
 * actor earn, and under what reason code?" It is deterministic and I/O-free.
 *
 * Spec: DESIGN_SECTION_B_exposure_and_ranking.md §B.4 and §B.5.5.
 */

// because [DESIGN §B.4 Table]: a closed set of reason codes — every ledger row
// must carry one of these so the audit trail is greppable and the unique index
// (uidHash, reason, refId) is well-defined.
export type ExposureReason =
  | 'sticky_like'         // like not undone in 60s: +1
  | 'message_reply'       // first message that received a reply within 7d: +3
  | 'dtm_completed'       // completed a DTM session topic: +5
  | 'bio_expand_long'     // bio expand ≥3s: +0.5
  | 'view_long'           // profile view ≥7s with deep scroll: +0.5
  | 'move_accepted'       // accepted Move v2 suggestion + reply: +2
  | 'rage_like_zero'      // rage-like detected: 0 credits, audit-only row
  | 'admin_grant'         // manual ops grant (apology, comp, etc.): variable
  | 'top10_filled'        // weekly top-10 slot filled: 0 credits, audit-only
  | 'fairness_inject';    // fairness rerank injection: 0 credits, audit-only

export interface CreditEvent {
  /** Reason code that must be stored verbatim on the ledger row. */
  reason: ExposureReason;
  /** Slots to be added to the user's exposure balance. May be 0 for audit rows. */
  slots: number;
  /** Optional source row id (UserActivity.id, Message.id, DTMSession.id, Move.id). */
  refId?: string;
}

/** Base credit deltas per action — quality-weighted, not engagement-weighted. */
export const CREDIT_RULES = {
  stickyLikeSlots: 1,                // because [DESIGN §B.4 #1]: a like that survives the 60s buyer's-remorse window is a real preference signal.
  messageReplySlots: 3,              // because [DESIGN §B.4 #2]: replies are the KPI 11.2 north-star; the sender that produces one is rewarded heavily.
  dtmCompletedSlots: 5,              // because [DESIGN §B.4 #3]: DTM completion is the deepest signal; 5× a like reflects the proportional attention investment.
  bioExpandSlots: 0.5,               // because [DESIGN §B.4 #4]: half-credit — bio expand is a quality read but not a commitment to act.
  viewLongSlots: 0.5,                // because [DESIGN §B.4 #5]: triangulates with bio-expand; both fire → effectively 1 slot for one careful read.
  moveAcceptedSlots: 2,              // because [DESIGN §B.4 #6]: Move v2 acceptance + reply = 2× organic-opener lift; ledger flow tracks the conversational gain.
} as const;

/** Negative-path thresholds. Mirrors negative-signal-engine.ts rage-click detection. */
export const RAGE_LIKE_THRESHOLDS = {
  perMinute: 20,                     // because [DESIGN §B.4.1]: human upper bound on swipe rate observed at v6 telemetry p99 (~18/min); 20 is the safety margin above human.
  perHour: 50,                       // because [DESIGN §B.4.1]: even hyper-active users settle at ≤30/hour after the first 10 min; 50 catches slower-burn rage attackers.
} as const;

/** Threshold (in credits) to unlock the daily Top-10 stack on the Discover surface. */
export const DAILY_TOP10_CREDIT_THRESHOLD = 30;     // because [DESIGN §B.5.2]: requires ≥30 credits in trailing 24h to unlock — env-tunable via ALGO_V8_TOP10_CREDIT_THRESHOLD.

/** Premium earn multiplier applied at earn-time (NOT at spend-time). */
export const PREMIUM_MULTIPLIER = 1.5;              // because [DESIGN §B.5.5, founder rule "Premium 1.5× multiplier MAX"]: priority not free pass; 1.5× is the policy.

/** Absolute ceiling that catches any future PR that bumps PREMIUM_MULTIPLIER by accident. */
export const MAX_PREMIUM_MULTIPLIER = 2.0;          // because [DESIGN §B.5.5]: hard ceiling — Math.min(x*1.5, x*2.0) makes a >2× regression impossible without editing this constant.

/** Map of action → base slot count. Centralised so a single table change propagates everywhere. */
const ACTION_BASE: Readonly<Record<
  'sticky_like' | 'message_reply' | 'dtm_completed' | 'bio_expand_long' | 'view_long' | 'move_accepted',
  number
>> = {
  sticky_like: CREDIT_RULES.stickyLikeSlots,
  message_reply: CREDIT_RULES.messageReplySlots,
  dtm_completed: CREDIT_RULES.dtmCompletedSlots,
  bio_expand_long: CREDIT_RULES.bioExpandSlots,
  view_long: CREDIT_RULES.viewLongSlots,
  move_accepted: CREDIT_RULES.moveAcceptedSlots,
};

/**
 * Compute the CreditEvent for an action. Pure. The worker shell takes the
 * returned slots and appends to ExposureLedger + upserts ExposureCredit.
 *
 * @param action  The detected quality action.
 * @param isPremium  Whether the actor is currently premium (1.5× boost applies).
 * @param refId   Optional source row id for ledger idempotency.
 */
export function creditForAction(
  action: 'sticky_like' | 'message_reply' | 'dtm_completed' | 'bio_expand_long' | 'view_long' | 'move_accepted',
  isPremium: boolean,
  refId?: string,
): CreditEvent {
  const base = ACTION_BASE[action];
  const mult = isPremium
    ? Math.min(PREMIUM_MULTIPLIER, MAX_PREMIUM_MULTIPLIER) // belt-and-suspenders: hard ceiling at 2.0× catches any future regression.
    : 1.0;
  const slots = base * mult;
  // The reason code on the ledger row is the action name itself — the schema
  // documents the closed set in ExposureReason above.
  return refId !== undefined
    ? { reason: action as ExposureReason, slots, refId }
    : { reason: action as ExposureReason, slots };
}

/**
 * Detect rage-like attackers. Returns true if either window threshold is
 * breached.
 *
 * @param likeTimestampsMs  Recent like timestamps (epoch ms). Order does not matter.
 * @param nowMs             The "current" time (epoch ms). Injected for determinism.
 */
export function isRageLike(
  likeTimestampsMs: readonly number[],
  nowMs: number,
): boolean {
  let last60s = 0;
  let lastHour = 0;
  for (const t of likeTimestampsMs) {
    const dt = nowMs - t;
    if (dt < 0) continue; // future timestamps are nonsensical here; skip rather than throw.
    if (dt < 60_000) last60s += 1;
    if (dt < 3_600_000) lastHour += 1;
  }
  if (last60s > RAGE_LIKE_THRESHOLDS.perMinute) return true;
  if (lastHour > RAGE_LIKE_THRESHOLDS.perHour) return true;
  return false;
}

/**
 * Audit-only credit event for a rage-like. Always 0 slots. Caller still
 * appends this to the ledger so the audit trail exists.
 */
export function rageLikeAudit(refId?: string): CreditEvent {
  // because [DESIGN §B.4.1 step 3]: write a 0-slot row with reason='rage_like_zero' so the audit trail is greppable but no credit is granted.
  return refId !== undefined
    ? { reason: 'rage_like_zero', slots: 0, refId }
    : { reason: 'rage_like_zero', slots: 0 };
}

/**
 * Does the user have enough trailing-24h credits to unlock the Top-10 stack?
 *
 * Premium users get the threshold scaled down by the multiplier because their
 * earn rate is already 1.5×; the gate must measure *quality of action* not
 * *raw credits*, so we divide by the multiplier to keep the bar fair.
 *
 * @param creditsLast24h  Sum of deltaSlots over the trailing 24h on surface='discover'.
 * @param isPremium       Whether the user is currently premium.
 */
export function meetsDailyTop10Threshold(
  creditsLast24h: number,
  isPremium: boolean,
): boolean {
  // because [DESIGN §B.5.2]: premium users earn 1.5× per action, so the effective threshold for them is 30/1.5 = 20.
  const threshold = isPremium
    ? DAILY_TOP10_CREDIT_THRESHOLD / PREMIUM_MULTIPLIER
    : DAILY_TOP10_CREDIT_THRESHOLD;
  return creditsLast24h >= threshold;
}

/**
 * Apply the premium multiplier to an arbitrary base delta — exposed for the
 * worker that handles admin grants or any future earn path that has its own
 * base rule and needs to compose with premium.
 */
export function applyPremiumMultiplier(baseDelta: number, isPremium: boolean): number {
  if (!isPremium) return baseDelta;
  // because [DESIGN §B.5.5]: Math.min(x*1.5, x*2.0) is the forcing-function guard against any future regression that bumps PREMIUM_MULTIPLIER above MAX.
  return Math.min(baseDelta * PREMIUM_MULTIPLIER, baseDelta * MAX_PREMIUM_MULTIPLIER);
}
