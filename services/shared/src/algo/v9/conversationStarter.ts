/**
 * v9 — Stale-chat reactivation composer.
 *
 * Pure module. NOT Move v2 (which handles first messages). This module
 * fires when a chat has gone silent for >24h with no reply. It composes
 * up to 3 reactivation-hook suggestions from:
 *   - receiver's archetype (wordsmith / voice_first / visual / fast_replier)
 *   - sender's voice profile (median outbound length, emoji rate)
 *   - the last message context (who said it, what it was)
 *   - hours-since-last-message (older → gentler / more callback-ish)
 *   - shared interests (best-fit anchor for a resurrection)
 *
 * Ranked by predicted reply-probability descending. No LLM — template
 * composition only. Confidence is a bounded function of how many of the
 * input signals actually contributed evidence (not a random number).
 *
 * File: services/shared/src/algo/v9/conversationStarter.ts
 * Flag: ALGO_V9_CONVERSATION_STARTER_ENABLED
 */
import { clip01 } from '../math';

/** Input signals for reactivation. All fields defensively typed so the
 *  caller can pass partials from real feature snapshots. */
export interface ReactivationInput {
  /** hours since the last message in the thread (either direction). */
  hoursSinceLastMessage: number;
  /** last message text, truncated at the call site if needed. */
  lastMessage: string;
  /** did the sender or the receiver say the last thing? */
  lastMessageFrom: 'sender' | 'receiver';
  /** receiver archetype tag (may be absent for cold-start users). */
  receiverArchetype?: string;
  /** sender's median outbound message length (chars). */
  senderVoiceLen: number;
  /** sender's emoji rate (0..1). */
  senderEmojiRate: number;
  /** interests both users share (lower-cased, deduped by caller). */
  sharedInterests: string[];
}

export type ReactivationTone = 'curious' | 'casual' | 'callback' | 'break_the_ice';

export interface ReactivationSuggestion {
  text: string;
  tone: ReactivationTone;
  /** predicted reply-probability, [0,1]. */
  confidence: number;
}

/** Hours ranges used in templating decisions. */
export const HOURS_SILENT_CALLBACK = 48;   // > 48h → strongly prefer callback
export const HOURS_SILENT_ICEBREAK = 168;  // > 7d → break_the_ice mode
export const MAX_SUGGESTIONS = 3;

// ─── Templates ────────────────────────────────────────────────────────────

/** Callback templates that reference the last message. Two variants per tone
 *  so two Priyas don't get the same output. */
const CALLBACK_TEMPLATES: readonly string[] = [
  'Been thinking about what you said — {snippet}. Genuine follow-up: how did that end up going?',
  'Circling back to your last note about {snippet}. Curious where your head landed on it.',
];

const CURIOUS_TEMPLATES: readonly string[] = [
  'Random one: whats one thing that made you smile this week?',
  'Ok slightly nosy question — whats been on your mind lately?',
];

const CASUAL_TEMPLATES: readonly string[] = [
  'Hey — realised I never actually replied properly. Hows your week been?',
  'Slid off the map for a bit, sorry. Anything good happening on your end?',
];

const ICEBREAK_TEMPLATES: readonly string[] = [
  'Confession: I lost the thread here. Restart? Whats one thing youre into right now?',
  'This got buried, my bad. If we reset — whats a small win from your week?',
];

const SHARED_INTEREST_TEMPLATES: readonly string[] = [
  'Whats the {interest} scene been like for you lately?',
  'Have you done anything {interest} shaped recently? Ive been meaning to.',
];

// ─── Composition helpers ──────────────────────────────────────────────────

/** Take the first N chars of the last message, trimmed, no trailing punct. */
function snippetOf(lastMessage: string, maxLen = 60): string {
  const trimmed = lastMessage.trim().replace(/[.!?]+$/g, '');
  if (trimmed.length <= maxLen) return trimmed.toLowerCase();
  return trimmed.slice(0, maxLen - 1).toLowerCase() + '…';
}

/** Deterministic template picker from a small pool. Rotates on
 *  (senderVoiceLen mod pool.length) so two callers with identical
 *  input get identical output but two different senders diverge. */
function pickTemplate(pool: readonly string[], senderVoiceLen: number): string {
  if (pool.length === 0) return '';
  const idx = Math.abs(Math.floor(senderVoiceLen)) % pool.length;
  return pool[idx];
}

/** Fill {snippet} / {interest} placeholders. Trailing emoji added when
 *  the sender's emoji rate is high (>0.3) so the tone matches the voice. */
function fill(
  template: string,
  substitutions: Record<string, string>,
  senderEmojiRate: number,
): string {
  let out = template;
  for (const [k, v] of Object.entries(substitutions)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  if (senderEmojiRate > 0.3) out += ' 🙂';
  return out;
}

// ─── Scoring ──────────────────────────────────────────────────────────────

/**
 * Predicted reply-probability. Not a real classifier — a composed
 * heuristic that combines gap-length attenuation, archetype fit for the
 * suggestion tone, and whether the suggestion anchors on real evidence
 * (last-message callback or shared interest).
 */
function predictReplyProb(
  hours: number,
  tone: ReactivationTone,
  receiverArchetype: string | undefined,
  hasAnchor: boolean,
): number {
  // Gap attenuation: 24h → 0.75, 48h → 0.55, 168h → 0.25, 720h (30d) → 0.05.
  const gapFactor = Math.max(0.05, Math.min(0.95, 1 - hours / 200));

  // Anchor bonus: real callbacks / shared-interest anchors reply better
  // than pure icebreakers.
  const anchor = hasAnchor ? 0.15 : 0;

  // Archetype fit: wordsmiths reply to callbacks, visuals to casual,
  // voice-first to curious, fast_repliers to any short prompt.
  let fit = 0;
  if (receiverArchetype === 'wordsmith'    && tone === 'callback')      fit = 0.15;
  else if (receiverArchetype === 'visual'  && tone === 'casual')        fit = 0.10;
  else if (receiverArchetype === 'voice_first' && tone === 'curious')   fit = 0.10;
  else if (receiverArchetype === 'fast_replier') /* any */              fit = 0.08;

  return clip01(gapFactor + anchor + fit);
}

// ─── Public entrypoint ────────────────────────────────────────────────────

/**
 * Compose up to `MAX_SUGGESTIONS` reactivation prompts, ranked by
 * predicted reply-probability descending. Same input → same output.
 */
export function suggestReactivation(input: ReactivationInput): ReactivationSuggestion[] {
  const {
    hoursSinceLastMessage, lastMessage, lastMessageFrom, receiverArchetype,
    senderVoiceLen, senderEmojiRate, sharedInterests,
  } = input;

  const hours = Math.max(0, hoursSinceLastMessage);
  const candidates: ReactivationSuggestion[] = [];

  // 1) Callback — only when the receiver spoke last and we have text to riff on.
  if (lastMessageFrom === 'receiver' && lastMessage.trim().length > 0) {
    const tmpl = pickTemplate(CALLBACK_TEMPLATES, senderVoiceLen);
    const text = fill(tmpl, { snippet: snippetOf(lastMessage) }, senderEmojiRate);
    candidates.push({
      text, tone: 'callback',
      confidence: predictReplyProb(hours, 'callback', receiverArchetype, true),
    });
  }

  // 2) Shared-interest — fires when we have at least one shared interest.
  if (sharedInterests.length > 0) {
    const interest = sharedInterests[0];
    const tmpl = pickTemplate(SHARED_INTEREST_TEMPLATES, senderVoiceLen + interest.length);
    const text = fill(tmpl, { interest }, senderEmojiRate);
    // Tone depends on gap length: short gaps read as curious, long gaps as casual.
    const tone: ReactivationTone = hours > HOURS_SILENT_CALLBACK ? 'casual' : 'curious';
    candidates.push({
      text, tone,
      confidence: predictReplyProb(hours, tone, receiverArchetype, true),
    });
  }

  // 3) Ice-breaker — always available; used when gap is long or nothing else fired.
  if (hours >= HOURS_SILENT_ICEBREAK) {
    candidates.push({
      text: fill(pickTemplate(ICEBREAK_TEMPLATES, senderVoiceLen), {}, senderEmojiRate),
      tone: 'break_the_ice',
      confidence: predictReplyProb(hours, 'break_the_ice', receiverArchetype, false),
    });
  } else {
    candidates.push({
      text: fill(pickTemplate(CASUAL_TEMPLATES, senderVoiceLen), {}, senderEmojiRate),
      tone: 'casual',
      confidence: predictReplyProb(hours, 'casual', receiverArchetype, false),
    });
  }

  // 4) Curious fallback — always emitted so we always have ≥1 suggestion
  //    even for edge inputs (empty last message + no shared interests).
  if (candidates.length < MAX_SUGGESTIONS) {
    candidates.push({
      text: fill(pickTemplate(CURIOUS_TEMPLATES, senderVoiceLen), {}, senderEmojiRate),
      tone: 'curious',
      confidence: predictReplyProb(hours, 'curious', receiverArchetype, false),
    });
  }

  // Deduplicate identical text (rare, but possible when templates collide).
  const seen = new Set<string>();
  const dedup: ReactivationSuggestion[] = [];
  for (const c of candidates) {
    if (seen.has(c.text)) continue;
    seen.add(c.text);
    dedup.push(c);
  }

  dedup.sort((a, b) => b.confidence - a.confidence);
  return dedup.slice(0, MAX_SUGGESTIONS);
}
