/**
 * v9 — Match-quality predictor.
 *
 * Pure module. At MATCH-creation time, given both parties' observable
 * features, the pair's compatibility score, and their intent alignment,
 * predicts the probability that this match becomes a
 * mutual-quality-chat (≥10 messages each way over ≥2 days) and maps that
 * probability to a notification-priority tier.
 *
 * Used by the notifications service (NOT by the ranker — the score itself
 * is not part of the compose):
 *   - probability > 0.6 → 'immediate'  (push now)
 *   - 0.3 <= p <= 0.6   → 'delayed'    (batch with next app-open)
 *   - probability < 0.3 → 'lowest'     (daily digest only)
 *
 * The estimator is a bounded, deterministic composition of 4 term groups
 * (sender features, receiver features, compatibility, intent). Not a
 * trained classifier — a heuristic tuned to the design brief so the
 * probability behaves monotonically in each input.
 *
 * File: services/shared/src/algo/v9/matchQualityPredictor.ts
 * Flag: ALGO_V9_MATCH_QUALITY_PREDICTOR_ENABLED
 */
import { clip01 } from '../math';

export interface MatchQualityPartyFeatures {
  /** 30-day inbound → reply rate, [0,1]. */
  responseRate: number;
  /** matches with 0 messages / total matches, [0,1]. Only used for receiver. */
  ghostRate?: number;
  /** how often sender has accepted a Move v2 suggestion. Only used for sender. */
  moveV2AcceptanceHistory?: number;
  verifiedStatus: boolean;
  /** did the user open the app today? */
  dailyActive: boolean;
}

export interface MatchQualityInput {
  senderFeatures: MatchQualityPartyFeatures;
  receiverFeatures: MatchQualityPartyFeatures;
  /** forYouV6 output, [0,1]. */
  compatibilityScore: number;
  /** did both users tick the same 'looking for' setting? [0,1]. */
  intentAlignment: number;
}

export type MatchQualityPriority = 'immediate' | 'delayed' | 'lowest';

export interface MatchQualityResult {
  probability: number;
  priority: MatchQualityPriority;
  reasons: string[];
}

/** Thresholds separating the three priority tiers. */
export const PRIORITY_IMMEDIATE_THRESHOLD = 0.6;
export const PRIORITY_DELAYED_THRESHOLD = 0.3;

/**
 * Weights on the four score-groups. Sum = 1.0. // because: the design
 * brief §D.4 orders the signals compatibility > receiver reliability >
 * sender reliability > intent alignment. Receiver ghosting is the single
 * most predictive feature for quality-chat failure so it dominates
 * receiver's group.
 */
const GROUP_WEIGHTS = {
  compatibility: 0.35,
  receiver:      0.30,
  sender:        0.20,
  intent:        0.15,
} as const;

function receiverScore(f: MatchQualityPartyFeatures): number {
  const rr = clip01(f.responseRate);
  const gr = clip01(f.ghostRate ?? 0);
  // 60% response-rate, 25% inverted-ghost-rate, 10% verified, 5% dailyActive.
  return (
    0.60 * rr +
    0.25 * (1 - gr) +
    0.10 * (f.verifiedStatus ? 1 : 0) +
    0.05 * (f.dailyActive ? 1 : 0)
  );
}

function senderScore(f: MatchQualityPartyFeatures): number {
  const rr = clip01(f.responseRate);
  const moveAcc = clip01(f.moveV2AcceptanceHistory ?? 0.5);
  return (
    0.45 * rr +
    0.30 * moveAcc +
    0.15 * (f.verifiedStatus ? 1 : 0) +
    0.10 * (f.dailyActive ? 1 : 0)
  );
}

/**
 * Predict quality-chat probability + priority. Reasons are a compact
 * bullet list ready for the notification service's audit log.
 */
export function predictMatchQuality(inp: MatchQualityInput): MatchQualityResult {
  const c   = clip01(inp.compatibilityScore);
  const r   = clip01(receiverScore(inp.receiverFeatures));
  const s   = clip01(senderScore(inp.senderFeatures));
  const i   = clip01(inp.intentAlignment);

  let probability =
    GROUP_WEIGHTS.compatibility * c +
    GROUP_WEIGHTS.receiver      * r +
    GROUP_WEIGHTS.sender        * s +
    GROUP_WEIGHTS.intent        * i;

  // Hard override: a receiver with ghostRate ≥ 0.7 and responseRate ≤ 0.2
  // is a chronic ghoster; clamp probability down to the 'lowest' band
  // regardless of other signals so we never wake the user for these.
  const rf = inp.receiverFeatures;
  if ((rf.ghostRate ?? 0) >= 0.7 && rf.responseRate <= 0.2) {
    probability = Math.min(probability, PRIORITY_DELAYED_THRESHOLD - 0.01);
  }

  probability = clip01(probability);

  const priority: MatchQualityPriority =
    probability > PRIORITY_IMMEDIATE_THRESHOLD ? 'immediate'
    : probability >= PRIORITY_DELAYED_THRESHOLD ? 'delayed'
    : 'lowest';

  const reasons: string[] = [];
  if (c >= 0.7) reasons.push('high compatibility');
  else if (c < 0.4) reasons.push('low compatibility');
  if (r >= 0.7) reasons.push('receiver replies reliably');
  else if (r < 0.4) reasons.push('receiver reliability low');
  if (s >= 0.7) reasons.push('sender engagement strong');
  if (i >= 0.9) reasons.push('same looking-for intent');
  else if (i < 0.3) reasons.push('intent mismatch');
  if ((rf.ghostRate ?? 0) >= 0.7) reasons.push('receiver often ghosts');
  if (rf.dailyActive) reasons.push('receiver active today');
  if (reasons.length === 0) reasons.push('mixed signals');

  return { probability, priority, reasons };
}
