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

registerAlgo({
  name: 'messageSuggest',
  surface: 'messaging',
  usesEvents: ['msg.send', 'msg.read', 'msg.thread_open', 'msg.compose_start', 'msg.voice_record', 'msg.reaction'],
  weights: WEIGHTS,
});
