/**
 * Miamo Moves — opener / icebreaker suggestion ranker.
 *
 * Returns the top 3 move suggestions for a pair. Each move kind has a
 * template generator (separate file in the calling service); this scorer
 * only decides which kinds rank highest given pair signals.
 */
import { compose, expDecay, clip01 } from './math';
import type { FeatureRow } from './signals';
import type { AlgoConsentTag } from './consent';
import { registerAlgo } from './registry';
import { v9ConversationStarterEnabled } from './flags';
import { suggestReactivation, type ReactivationInput, type ReactivationSuggestion } from './v9/conversationStarter';

export type MoveKind =
  | 'compliment' | 'question' | 'voice_note' | 'photo_share'
  | 'date_plan' | 'beat_send' | 'gif' | 'custom_prompt';

const ALL_KINDS: MoveKind[] = ['compliment', 'question', 'voice_note', 'photo_share', 'date_plan', 'beat_send', 'gif', 'custom_prompt'];

// attention → preferred kinds map (used for `pairAffinity`)
const ATTENTION_PREF: Record<string, MoveKind[]> = {
  reader: ['question', 'date_plan', 'custom_prompt'],
  scanner: ['gif', 'compliment', 'photo_share'],
  'voice-first': ['voice_note', 'question'],
  visual: ['photo_share', 'gif', 'compliment'],
};

const MOVE_WEIGHTS = {
  pairAffinity: 0.30,
  notRepeating: 0.25,
  candidateLastAction: 0.20,
  timeOfDayFit: 0.15,
  deepCompatTopic: 0.10,
} as const;

export type MoveInputs = {
  candFeatures: FeatureRow | null;
  /** seconds since each move kind was last used in this pair; null = never */
  lastUsedAgoSec: Partial<Record<MoveKind, number | null>>;
  /** what the candidate just did, if anything */
  candLastAction: { kind: 'sent_voice' | 'sent_photo' | 'sent_text' | 'opened' | null; sec: number } | null;
  /** local hour-of-day 0..23 */
  nowHour: number;
  /** result of deep-compat topic match: kind → 0..1 affinity from existing function */
  deepCompatAffinity: Partial<Record<MoveKind, number>>;
  consent: AlgoConsentTag;
};

export type MoveSuggestion = {
  kind: MoveKind;
  score: number; // 0..100
  why: Record<string, number | null>;
};

export function scoreMove(kind: MoveKind, inp: MoveInputs): MoveSuggestion {
  const attn = inp.candFeatures?.attentionProfile ?? null;
  const preferred = attn && ATTENTION_PREF[attn] ? ATTENTION_PREF[attn] : [];
  const pairAffinity = preferred.includes(kind) ? 1 : 0.35;

  const ago = inp.lastUsedAgoSec[kind];
  const notRepeating = ago == null ? 1 : clip01(1 - expDecay(ago, 3 * 24 * 3600));

  let candidateLastAction = 0.5;
  const last = inp.candLastAction;
  if (last && last.kind) {
    if ((last.kind === 'sent_voice' && kind === 'voice_note')
     || (last.kind === 'sent_photo' && kind === 'photo_share')
     || (last.kind === 'sent_text' && (kind === 'question' || kind === 'compliment'))) {
      // recency-boosted reciprocation
      candidateLastAction = clip01(1 - last.sec / (24 * 3600));
    } else if (last.kind === 'opened') {
      candidateLastAction = 0.6;
    } else {
      candidateLastAction = 0.3;
    }
  }

  // Chronotype peak-hour fit. Cheap heuristic: each chronotype prefers a slice.
  const chrono = inp.candFeatures?.chronotype ?? null;
  const inWindow = (a: number, b: number, h: number) => (a <= b ? h >= a && h < b : h >= a || h < b);
  let timeOfDayFit = 0.5;
  if (chrono === 'morning')  timeOfDayFit = inWindow(5, 11, inp.nowHour) ? 1 : 0.3;
  else if (chrono === 'day')      timeOfDayFit = inWindow(11, 17, inp.nowHour) ? 1 : 0.4;
  else if (chrono === 'evening')  timeOfDayFit = inWindow(17, 23, inp.nowHour) ? 1 : 0.4;
  else if (chrono === 'night')    timeOfDayFit = inWindow(23, 5, inp.nowHour) ? 1 : 0.2;
  else if (chrono === 'mixed')    timeOfDayFit = 0.7;

  const breakdown = {
    pairAffinity,
    notRepeating,
    candidateLastAction,
    timeOfDayFit,
    deepCompatTopic: inp.deepCompatAffinity[kind] ?? 0.5,
  };
  const score = Math.round(compose(breakdown, MOVE_WEIGHTS) * 100);
  return { kind, score, why: breakdown };
}

export function suggestMoves(inp: MoveInputs, top = 3): MoveSuggestion[] {
  return ALL_KINDS
    .map((k) => scoreMove(k, inp))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}

import { v5FeatureEnabled } from './flags';
/** v5 reserved — identical to v4 today. */
export const scoreMoveV4 = scoreMove;
export function scoreMoveV5(kind: MoveKind, inp: MoveInputs): MoveSuggestion {
  const r = scoreMoveV4(kind, inp);
  return { ...r, why: { ...r.why, algoVersion: 1 } };
}
export function scoreMoveDispatch(kind: MoveKind, inp: MoveInputs): MoveSuggestion {
  return v5FeatureEnabled('moves') ? scoreMoveV5(kind, inp) : scoreMoveV4(kind, inp);
}

registerAlgo({
  name: 'moves',
  surface: 'messaging',
  usesEvents: [
    'msg.send', 'msg.read', 'msg.voice_record', 'msg.thread_open',
    'msg.compose_start', 'msg.reaction', 'session.heartbeat',
  ],
  weights: MOVE_WEIGHTS,
});

/**
 * v2: reactivation fallback path for stale chats (>24h silent).
 * `suggestMoves` handles the "user opened a chat with a new match" case;
 * this helper covers the complementary "chat exists but hasn't moved in
 * a day" case. Behind `ALGO_V9_CONVERSATION_STARTER_ENABLED` — returns
 * `null` when the flag is off so callers can no-op.
 *
 * // because [audit §E.2 #3]: the messaging surface has two distinct
 * // opener moments and today only the fresh-match one has a composer.
 */
export function getConversationStarter(input: ReactivationInput): ReactivationSuggestion[] | null {
  if (!v9ConversationStarterEnabled()) return null;
  return suggestReactivation(input);
}
