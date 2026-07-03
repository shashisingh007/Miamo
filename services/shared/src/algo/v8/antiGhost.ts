/**
 * v8 anti-ghost economy — pure ledger-event math, no I/O.
 *
 * Sender deposits 1 Spotlight minute when starting a new chat (zero prior
 * messages from sender to receiver). If receiver replies within 72h the
 * deposit becomes a +1 bonus to the receiver. If neither replies within 72h
 * the deposit burns. A ghoster (no second message after match within 7d)
 * pays an escalated 2-minute deposit on their next chat — reset after one
 * successful conversation (≥3 reply rounds).
 *
 * Spec: DESIGN_SECTION_D §D.5. This module does the ARITHMETIC ONLY. The
 * caller (`services/social/src/server.ts` chat-create handler + reconciler
 * worker) is responsible for:
 *   1. Reading `FEATURE_ANTI_GHOST_ENABLED` env flag.
 *   2. Reading `senderBalance`, `depositsToday`, `ghostEventsLast30d`
 *      from `SpotlightLedger`.
 *   3. Writing the returned `AntiGhostEvent` as a row on `SpotlightLedger`
 *      (no schema change — reusing the existing `reason: String` column).
 *
 * The four reason strings are NEW values on the existing column; no enum
 * tightening, no migration (per the prompt's hard constraint).
 *
 * Premium handling — clarification baked into the constants:
 *   Spotlight ledger is integer-minute. We do NOT fractionalise deposits.
 *   `PREMIUM_DEPOSIT_DISCOUNT = 0.5` is reserved for the escalated penalty
 *   tier — non-premium penalised user pays 2 min, premium penalised user
 *   pays 1 min. First-chat deposit is 1 min for everyone. This keeps every
 *   ledger row integer-valued and removes the daily-refund row that
 *   DESIGN §D.5.3 originally proposed.
 */

export type AntiGhostReason =
  | 'chat_deposit'
  | 'chat_reply_bonus'
  | 'chat_ghost_burn'
  | 'chat_followup_penalty';

export const DEPOSIT_MINUTES = 1;
// because: 1-minute friction matches the existing `daily_login` Spotlight grant
// — calibrated noticeable, not punitive for a serious sender. (DESIGN §D.5.3)

export const ESCALATED_DEPOSIT_MINUTES = 2;
// because: doubling after one ghost is the minimum visible escalation that
// survives confirmation-bias; a 1.5× nudge is invisible to the offender.

export const REPLY_WINDOW_MS = 72 * 60 * 60 * 1000;
// because: Hinge's median time-to-first-reply is ~18h; 72h covers >95% of the
// organic distribution without holding deposits in escrow indefinitely.

export const PREMIUM_DEPOSIT_DISCOUNT = 0.5;
// because: founder rule "priority not free pass." Premium halves the
// ESCALATED tier (2 → 1 min); first-chat deposit stays 1 min for everyone so
// the ledger remains integer-valued without a daily refund row.

export const MAX_DEPOSITS_PER_DAY = 10;
// because: anti-grief / anti-sybil cap. Even a chatty serious user
// initiates ≤8 new chats per day in v6 telemetry; 10 leaves headroom.

export const GHOST_DETECTION_WINDOW_DAYS = 7;
// because: founder definition — "doesn't follow up after match" within 7 days.
// Shorter windows misclassify legitimate slow-replier behaviour as ghosting.

export const SUCCESSFUL_CONVERSATION_REPLY_ROUNDS = 3;
// because: 3 reply rounds (sender↔receiver × 3) is the empirical floor below
// which conversations don't survive the 7-day post-match window.

const GHOST_DETECTION_WINDOW_MS = GHOST_DETECTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface AntiGhostEvent {
  reason: AntiGhostReason;
  /** Negative for deposit/burn/penalty; positive for bonus. Always an integer. */
  delta: number;
  /** chatId for chat_* events, matchId for ghost-follow-up penalties. */
  refId: string;
}

export interface DepositHistory {
  /** True iff sender has an unresolved ghost event in the last 30d. */
  ghostedRecently: boolean;
  /** Sender premium status at the moment of deposit. */
  isPremium: boolean;
  /** Count of `chat_deposit` rows on the sender's ledger in the current UTC day. */
  depositsToday: number;
}

/**
 * Build the ledger event for a new-chat deposit.
 *
 * Returns `{ error: 'daily_cap_exceeded' }` when the sender has already hit
 * `MAX_DEPOSITS_PER_DAY` deposits today. The caller maps this to HTTP 429.
 *
 * The `senderId` and `receiverId` parameters are accepted for type-level
 * documentation; this module does not include them in the returned event
 * (the caller wires `userId` from `senderId` when persisting). Including
 * them in the signature lets reviewers see the call site at a glance.
 */
export function depositForNewChat(
  senderId: string,
  receiverId: string,
  matchId: string,
  history: DepositHistory,
): AntiGhostEvent | { error: 'daily_cap_exceeded' } {
  void senderId;
  void receiverId;
  if (history.depositsToday >= MAX_DEPOSITS_PER_DAY) {
    return { error: 'daily_cap_exceeded' };
  }

  // Base tier vs escalated tier. Premium only discounts the escalated tier.
  let minutes: number;
  if (history.ghostedRecently) {
    minutes = history.isPremium
      ? Math.max(1, Math.round(ESCALATED_DEPOSIT_MINUTES * PREMIUM_DEPOSIT_DISCOUNT))
      : ESCALATED_DEPOSIT_MINUTES;
  } else {
    minutes = DEPOSIT_MINUTES;
  }

  return {
    reason: 'chat_deposit',
    delta: -minutes,
    refId: matchId,
  };
}

/**
 * Build the +1 bonus event for the receiver, paid out when they reply within
 * the 72h window. Returns null when the window has expired — caller then
 * burns the deposit instead.
 *
 * `senderId` and `receiverId` are accepted for call-site documentation; the
 * caller is responsible for writing the bonus to the receiver's ledger.
 */
export function replyBonus(
  senderId: string,
  receiverId: string,
  matchId: string,
  replyMs: number,
): AntiGhostEvent | null {
  void senderId;
  void receiverId;
  if (!Number.isFinite(replyMs) || replyMs < 0) return null;
  if (replyMs > REPLY_WINDOW_MS) return null;
  return {
    reason: 'chat_reply_bonus',
    delta: +DEPOSIT_MINUTES,
    refId: matchId,
  };
}

/**
 * Build the ghost-burn event when neither side replied within 72h. The
 * original sender-deposit row stands (the sender is NOT double-debited);
 * this is a system-row burn for audit, charged against the escrow pool.
 *
 * Returns null when the window has not yet elapsed — the reconciler should
 * wait for the deposit to age out before burning.
 */
export function ghostBurn(
  senderId: string,
  matchId: string,
  ageMs: number,
): AntiGhostEvent | null {
  void senderId;
  if (!Number.isFinite(ageMs) || ageMs < REPLY_WINDOW_MS) return null;
  return {
    reason: 'chat_ghost_burn',
    delta: -DEPOSIT_MINUTES,
    refId: matchId,
  };
}

/**
 * Sender has an unresolved ghost in the last 30 days?
 *
 * Pure shape: we receive the count and answer the question. The caller
 * computes the count from `SpotlightLedger` rows with `reason='chat_ghost_burn'`
 * (or from the auxiliary ghost-detection table) filtered to the trailing
 * 30 days.
 *
 * Threshold = 1 because: a single ghost event is the trigger; we do not
 * accumulate the penalty across multiple offences (would compound to absurd
 * deposits for a moderately ghost-prone user).
 */
export function isGhostedRecently(ghostEventsLast30d: number): boolean {
  if (!Number.isFinite(ghostEventsLast30d)) return false;
  return ghostEventsLast30d >= 1;
}

/**
 * Classic ghost check: "did the user fail to follow up within 7 days of match?"
 *
 * Pure shape: caller passes the match timestamp, the timestamp of the sender's
 * last message (or null), and the current time. Returns true iff the sender
 * never messaged AND the match is older than the 7-day window.
 *
 * Mirrors the design doc's helper at DESIGN §D.5.7.
 */
export function isGhost(
  matchedAtMs: number,
  lastSenderMsgAtMs: number | null,
  nowMs: number,
): boolean {
  if (!Number.isFinite(matchedAtMs) || !Number.isFinite(nowMs)) return false;
  if (lastSenderMsgAtMs !== null) return false;
  return nowMs - matchedAtMs > GHOST_DETECTION_WINDOW_MS;
}

/**
 * Should the ghost penalty be cleared? True after one successful conversation
 * (≥3 reply rounds) since the last unresolved ghost. Pure: caller counts
 * the rounds; this function names the threshold so the rule is greppable.
 */
export function ghostPenaltyClearedBy(replyRoundsSinceGhost: number): boolean {
  if (!Number.isFinite(replyRoundsSinceGhost)) return false;
  return replyRoundsSinceGhost >= SUCCESSFUL_CONVERSATION_REPLY_ROUNDS;
}
