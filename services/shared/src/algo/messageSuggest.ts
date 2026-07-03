/**
 * v4 messaging — message text suggestion ranker.
 *
 * The actual prompt templates live in the messaging service. This file picks
 * which template family to use given pair signals. Returns up to N typed
 * suggestions with a score for the UI to render in priority order.
 *
 * No LLM: templates are static, deterministic, parameterised by features
 * (attentionProfile, chronotype, lastMessage.kind, recent topic hint).
 */
import { compose, clip100, expDecay } from './math';
import type { FeatureRow } from './signals';
import { registerAlgo } from './registry';
import { v5FeatureEnabled, v9ConversationStarterEnabled } from './flags';
import { suggestReactivation, type ReactivationInput, type ReactivationSuggestion } from './v9/conversationStarter';

export type SuggestionKind =
  | 'open_question' | 'callback_to_last' | 'voice_invite'
  | 'photo_invite' | 'date_invite' | 'shared_interest' | 'playful';

const ALL: SuggestionKind[] = ['open_question', 'callback_to_last', 'voice_invite', 'photo_invite', 'date_invite', 'shared_interest', 'playful'];

const WEIGHTS = {
  attentionFit: 0.30,
  recencyFit: 0.25,
  noveltyFit: 0.20,
  intentFit: 0.15,
  chronoFit: 0.10,
} as const;

const ATTENTION_PREF: Record<string, SuggestionKind[]> = {
  reader: ['open_question', 'callback_to_last', 'date_invite'],
  scanner: ['playful', 'shared_interest', 'photo_invite'],
  'voice-first': ['voice_invite', 'open_question'],
  visual: ['photo_invite', 'shared_interest', 'playful'],
};

export type SuggestInputs = {
  candFeatures: FeatureRow | null;
  lastInboundKind: 'text' | 'voice' | 'photo' | 'gif' | null;
  /** seconds since each kind was used in this thread (any direction) */
  ageSec: Partial<Record<SuggestionKind, number | null>>;
  myIntent: 'casual' | 'serious' | 'marriage' | 'friends' | null;
  candIntent: 'casual' | 'serious' | 'marriage' | 'friends' | null;
  nowHour: number;
};

export type Suggestion = { kind: SuggestionKind; score: number; why: Record<string, number | null> };

function recencyFitFor(kind: SuggestionKind, inp: SuggestInputs): number {
  const m = inp.lastInboundKind;
  if (!m) return 0.5;
  if (m === 'voice' && kind === 'voice_invite') return 1;
  if (m === 'photo' && kind === 'photo_invite') return 1;
  if (m === 'text' && (kind === 'callback_to_last' || kind === 'open_question')) return 0.9;
  if (m === 'gif' && kind === 'playful') return 0.9;
  return 0.4;
}

function intentFitFor(kind: SuggestionKind, inp: SuggestInputs): number {
  const serious = inp.myIntent && inp.candIntent && (inp.myIntent === 'serious' || inp.myIntent === 'marriage') && (inp.candIntent === 'serious' || inp.candIntent === 'marriage');
  if (serious) return kind === 'date_invite' || kind === 'open_question' ? 1 : 0.5;
  return kind === 'playful' || kind === 'shared_interest' ? 1 : 0.5;
}

export function scoreSuggestion(kind: SuggestionKind, inp: SuggestInputs): Suggestion {
  const prefs = inp.candFeatures?.attentionProfile && ATTENTION_PREF[inp.candFeatures.attentionProfile] || [];
  const attentionFit = prefs.includes(kind) ? 1 : 0.4;
  const ago = inp.ageSec[kind];
  const noveltyFit = ago == null ? 1 : 1 - expDecay(ago, 6 * 3600);
  const chrono = inp.candFeatures?.chronotype;
  const chronoFit =
    chrono === 'morning' ? (inp.nowHour < 12 ? 1 : 0.4) :
    chrono === 'day'     ? (inp.nowHour >= 11 && inp.nowHour < 17 ? 1 : 0.4) :
    chrono === 'evening' ? (inp.nowHour >= 17 && inp.nowHour < 23 ? 1 : 0.4) :
    chrono === 'night'   ? (inp.nowHour >= 23 || inp.nowHour < 5 ? 1 : 0.3) :
    0.6;
  const breakdown = {
    attentionFit,
    recencyFit: recencyFitFor(kind, inp),
    noveltyFit,
    intentFit: intentFitFor(kind, inp),
    chronoFit,
  };
  const score = clip100(compose(breakdown, WEIGHTS) * 100);
  return { kind, score, why: breakdown };
}

export function suggestMessages(inp: SuggestInputs, top = 3): Suggestion[] {
  return ALL.map((k) => scoreSuggestion(k, inp)).sort((a, b) => b.score - a.score).slice(0, top);
}

/**
 * v5 extension — typing-aware. The caller may supply per-kind
 * `draftedDeletedRate` ∈ [0, 1] = how often *Priya* started typing this
 * kind of opener then deleted it before sending. Higher rate → opener
 * deserves a damping penalty (Priya talks herself out of it). Applied as a
 * multiplicative damp factor `1 - 0.5 * rate` on the final score so a
 * 100% deletion rate halves the score and a 0% rate is a no-op.
 *
 * The dispatcher `suggestMessages` reads `process.env.ALGO_V5_MESSAGE_SUGGEST_ENABLED`.
 */
export type SuggestInputsV5 = SuggestInputs & {
  draftedDeletedRate?: Partial<Record<SuggestionKind, number>>;
};

export function scoreSuggestionV5(kind: SuggestionKind, inp: SuggestInputsV5): Suggestion {
  const base = scoreSuggestion(kind, inp);
  const rate = Math.max(0, Math.min(1, inp.draftedDeletedRate?.[kind] ?? 0));
  const damp = 1 - 0.5 * rate;
  return {
    kind,
    score: Math.round(base.score * damp),
    why: { ...base.why, draftedDeletedRate: rate, damp },
  };
}

export function suggestMessagesDispatch(inp: SuggestInputsV5, top = 3): Suggestion[] {
  const on = v5FeatureEnabled('messageSuggest');
  const ranked = ALL.map((k) => on ? scoreSuggestionV5(k, inp) : scoreSuggestion(k, inp));
  return ranked.sort((a, b) => b.score - a.score).slice(0, top);
}

registerAlgo({
  name: 'messageSuggest',
  surface: 'messaging',
  usesEvents: ['msg.send', 'msg.read', 'msg.thread_open', 'msg.compose_start', 'msg.voice_record', 'msg.reaction',
    'chat.typing.start', 'chat.typing.stop', 'chat.draft_deleted', 'chat.scroll_history'],
  weights: WEIGHTS,
});

/**
 * v2: reactivation-composer fallback for stale chats. Mirrors the
 * companion helper in `moves.ts`. Behind
 * `ALGO_V9_CONVERSATION_STARTER_ENABLED`; returns `null` when off.
 *
 * // because [audit §E.2 #3]: messageSuggest ranks templates for
 * // *active* chats — this covers the >24h-silent case that used to
 * // fall through to the generic composer.
 */
export function getConversationStarter(input: ReactivationInput): ReactivationSuggestion[] | null {
  if (!v9ConversationStarterEnabled()) return null;
  return suggestReactivation(input);
}
