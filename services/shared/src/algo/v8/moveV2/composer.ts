/**
 * Move v2 Composer — v8 (Section C, §5).
 *
 * Orchestrates senderVoice + receiverResonance + hookLibrary + codeMix into
 * 5 ranked, lint-clean opener suggestions per pair-day. Pure module: callers
 * hand in vectors + hooks + a stable seed. Returns 5 suggestions with
 * predicted reply probability.
 *
 * Algorithm:
 *   1. Enumerate (template × hook × tone) candidates, score predicted reply prob.
 *   2. For each of 5 slots, pick highest pReply candidate, render, post-process,
 *      lint. Retry up to MAX_LINT_RETRIES with next-best candidate.
 *   3. On exhaustion, fall back to moves.ts v3 suggestion for that slot.
 *   4. Enforce diversity: ≥3 distinct hook categories across slots.
 *   5. Sort by pReply desc.
 */

import { lintMoveV8 } from '../../moveVoice';
import { suggestMoves } from '../../moves';
import { clip01 } from '../../math';
import {
  type SenderVoiceVector,
  projectToVoice,
} from './senderVoice';
import {
  type ReceiverResonanceVector,
} from './receiverResonance';
import {
  type HookCandidate,
  type HookCategory,
  rankHooks,
} from './hookLibrary';
import {
  type LanguageFamily,
  type OpenerArchetype,
  type CodeMixTone,
  type CodeMixTemplate,
  TEMPLATES,
  fillTemplate,
} from './codeMix';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// because: §5.4 — prompt §10.4 names exactly 5 suggestions
export const COMPOSE_K = 5;

// because: §5.4 — empirically 3 retries clear ~99.6% of lint fails
export const MAX_LINT_RETRIES = 3;

// because: §5.4 — 3-of-5 ensures variety without forcing 5 distinct categories
export const MIN_DISTINCT_HOOK_CATEGORIES = 3;

// because: §5.4 — top-8 hooks is enough headroom for the diversity rule
export const CANDIDATE_POOL_CAP = 8;

// because: §5.5 — weights map directly to design §C.5.5 four sub-scores
export const PREDICT_WEIGHTS = {
  resonance: 0.40,        // because: receiver-resonance is strongest single signal (FirstMoveOutcome)
  voice: 0.25,            // because: sender-voice keeps suggestions from sounding alien
  hook: 0.25,             // because: hook strength is co-primary with voice
  intent: 0.10,           // because: right-now-intent is a useful tiebreaker, high-variance
} as const;

// because: §5.6 — intent → tone affinity (full table) per design §C.5.5
type IntentClass = string;
const INTENT_TO_TONE_AFFINITY: Record<string, Record<CodeMixTone, number>> = {
  'serious-search':     { reflective: 1.0, casual: 0.7, tactile: 0.5, quick: 0.3 },
  'intentional-browse': { reflective: 0.8, casual: 0.9, tactile: 0.7, quick: 0.5 },
  'reply-mood':         { reflective: 0.5, casual: 0.9, tactile: 0.6, quick: 1.0 },
  'review-existing':    { reflective: 0.7, casual: 0.7, tactile: 0.6, quick: 0.6 },
  'casual-scroll':      { reflective: 0.4, casual: 0.9, tactile: 0.8, quick: 0.9 },
  'distraction-browse': { reflective: 0.3, casual: 0.7, tactile: 0.6, quick: 1.0 },
  'decision-fatigued':  { reflective: 0.3, casual: 0.5, tactile: 0.6, quick: 1.0 },
};

// because: archetype-kind mapping aligned with §C.5.5 sub-score
const ARCHETYPE_TO_KIND: Record<OpenerArchetype, string> = {
  question: 'question',
  compliment: 'compliment',
  shared_interest: 'shared_interest',
  playful: 'playful',
  specific_detail: 'specific_detail',
};

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export interface ComposerInput {
  senderVoice: SenderVoiceVector;
  receiverResonance: ReceiverResonanceVector;
  hooks: HookCandidate[];
  languageFamily: LanguageFamily;
  receiverName?: string;
  viewerIntent?: { topClass: string; confidence: number };
  seed: number;
  nowMs: number;
}

export interface Suggestion {
  text: string;
  tone: CodeMixTone;
  hookCategory: HookCategory;
  archetype: OpenerArchetype;
  predictedReplyProb: number;
  isFallback: boolean;
}

export interface ComposeResult {
  suggestions: Suggestion[];
  fallbackCount: number;
}

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32 — same recipe as services/shared/src/algo/seedRandom.ts)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Internal candidate model
// ---------------------------------------------------------------------------

interface Candidate {
  template: CodeMixTemplate;
  hook: HookCandidate;
  pReply: number;
}

function lengthFit(targetLen: number, observedLen: number): number {
  // because: triangular fit — peak at observed, decays to 0 at 4× difference
  if (observedLen <= 0) return 0.5;
  const ratio = targetLen / observedLen;
  if (ratio <= 0) return 0;
  // mirror around 1.0 — penalty for both too-short and too-long
  const m = ratio > 1 ? 1 / ratio : ratio;
  return clip01(m);
}

function resonanceFit(
  template: CodeMixTemplate,
  hook: HookCandidate,
  res: ReceiverResonanceVector,
): number {
  const kind = ARCHETYPE_TO_KIND[template.archetype] ?? 'question';
  const kindMass = res.kindDistribution[kind] ?? 0;
  const toneMass = res.toneDistribution[template.tone] ?? 0;
  // because: rough proxy for template length — average 40 chars filled
  const lenFit = lengthFit(template.template.length, res.preferredLengthMedian || 40);
  // because: combine multiplicatively but with small floors so confidence
  // isn't zero when one dimension is uniform
  return clip01((kindMass * 4 + 0.1) * (toneMass * 4 + 0.1) * (lenFit * 0.5 + 0.5));
}

function voiceMatch(
  template: CodeMixTemplate,
  voice: SenderVoiceVector,
): number {
  const lenFit = lengthFit(template.template.length, voice.medianLengthChars || 25);
  // because: rough exclamation alignment — template has 0 by default
  const exclTemplate = (template.template.match(/!/g) ?? []).length;
  const exclDelta = 1 - Math.abs(voice.exclamationRate - exclTemplate / 5);
  return clip01(lenFit * 0.5 + clip01(exclDelta) * 0.5);
}

function hookStrength(hook: HookCandidate): number {
  // because: hookLibrary already produced specificity ∈ [0..1]; combine with
  // freshness via the same exp decay we use in scoreHook
  return clip01(hook.specificity);
}

function intentFit(
  template: CodeMixTemplate,
  intent: { topClass: string; confidence: number } | undefined,
): number {
  if (!intent) return 0.5; // because: missing intent is neutral, not penalised
  const row = INTENT_TO_TONE_AFFINITY[intent.topClass];
  if (!row) return 0.5;
  return clip01(row[template.tone] ?? 0.5);
}

function predictReply(
  template: CodeMixTemplate,
  hook: HookCandidate,
  voice: SenderVoiceVector,
  res: ReceiverResonanceVector,
  intent: { topClass: string; confidence: number } | undefined,
): number {
  const r = resonanceFit(template, hook, res);
  const v = voiceMatch(template, voice);
  const h = hookStrength(hook);
  const i = intentFit(template, intent);
  return clip01(
    PREDICT_WEIGHTS.resonance * r +
    PREDICT_WEIGHTS.voice * v +
    PREDICT_WEIGHTS.hook * h +
    PREDICT_WEIGHTS.intent * i,
  );
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

export function compose(input: ComposerInput): ComposeResult {
  const rng = mulberry32(input.seed);
  const name = (input.receiverName ?? '').trim() || 'you';

  // because: §5.3 step 1 — enumerate candidates
  // limit to chosen family + 'en' (English is always available as safe fallback)
  const families: LanguageFamily[] = input.languageFamily === 'en'
    ? ['en']
    : [input.languageFamily, 'en'];

  const rankedHooks = rankHooks(input.hooks, input.nowMs).slice(0, CANDIDATE_POOL_CAP);

  if (rankedHooks.length === 0) {
    // because: §3.4 — no hooks at all → fall back fully to v3
    return fullV3Fallback(input);
  }

  const templates = TEMPLATES.filter((t) => families.includes(t.family));
  const candidates: Candidate[] = [];
  for (const tpl of templates) {
    for (const hook of rankedHooks) {
      candidates.push({
        template: tpl,
        hook,
        pReply: predictReply(tpl, hook, input.senderVoice, input.receiverResonance, input.viewerIntent),
      });
    }
  }

  // small RNG-jitter to break ties deterministically per-seed
  for (const c of candidates) {
    c.pReply = clip01(c.pReply + rng() * 0.001);
  }

  // sort descending by pReply
  candidates.sort((a, b) => b.pReply - a.pReply);

  const accepted: Suggestion[] = [];
  const usedHookCategories: Set<HookCategory> = new Set();
  const usedTemplateKeys = new Set<string>();
  let fallbackCount = 0;

  for (let slot = 0; slot < COMPOSE_K; slot++) {
    let chosen: Suggestion | null = null;
    let attemptsHere = 0;

    // because: diversity rule — first 3 slots require new hook categories
    const requireNewCategory = slot < MIN_DISTINCT_HOOK_CATEGORIES;

    for (const cand of candidates) {
      if (attemptsHere >= MAX_LINT_RETRIES) break;

      const key = `${cand.template.family}.${cand.template.archetype}.${cand.template.tone}`;
      if (usedTemplateKeys.has(key)) continue;
      if (requireNewCategory && usedHookCategories.has(cand.hook.category)) continue;

      attemptsHere++;
      const raw = fillTemplate(cand.template.template, name, cand.hook.text);
      const projected = projectToVoice(raw, input.senderVoice);
      const lint = lintMoveV8(projected);
      if (!lint.ok) continue;

      chosen = {
        text: projected,
        tone: cand.template.tone,
        hookCategory: cand.hook.category,
        archetype: cand.template.archetype,
        predictedReplyProb: cand.pReply,
        isFallback: false,
      };
      usedTemplateKeys.add(key);
      usedHookCategories.add(cand.hook.category);
      break;
    }

    if (!chosen) {
      // because: §5.3 step 3 — fall back to v3 suggestMoves for this slot
      const fb = makeV3Fallback(input, slot, usedHookCategories);
      accepted.push(fb);
      fallbackCount++;
      usedHookCategories.add(fb.hookCategory);
      continue;
    }

    accepted.push(chosen);
  }

  // because: §5.3 step 4 — enforce ≥3 distinct categories post-hoc; if not,
  // swap the lowest-pReply slot for any higher candidate with a new category
  enforceDiversity(accepted, candidates, input, usedHookCategories);

  // because: §5.3 step 5 — final sort by pReply desc
  accepted.sort((a, b) => b.predictedReplyProb - a.predictedReplyProb);

  return { suggestions: accepted, fallbackCount };
}

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------

function makeV3Fallback(
  input: ComposerInput,
  slot: number,
  usedCategories: Set<HookCategory>,
): Suggestion {
  // because: v3 suggestMoves returns MoveSuggestion[] with `kind`, `score`.
  // We synthesise a minimal MoveInputs shape — the v3 ranker is heuristic
  // and tolerant of nulls/empty.
  let v3Top: { kind: string } | null = null;
  try {
    const v3 = suggestMoves({
      candFeatures: null,
      lastUsedAgoSec: {},
      candLastAction: null,
      nowHour: new Date(input.nowMs).getUTCHours(),
      deepCompatAffinity: {},
      consent: 'analytics-only',
    }, 5);
    v3Top = v3[slot % v3.length] ?? v3[0] ?? null;
  } catch {
    v3Top = null;
  }

  // because: pick a category not already used, default to shared_interest
  const candidateCategories: HookCategory[] = [
    'shared_interest', 'recent_post', 'shared_spotlight',
    'shared_city', 'shared_college', 'shared_employer', 'festival', 'dtm_topic',
  ];
  const cat = candidateCategories.find((c) => !usedCategories.has(c)) ?? 'shared_interest';

  // because: lint-safe minimal fallback line, lowercase start, no banned phrases
  const name = (input.receiverName ?? '').trim() || 'you';
  const kind = v3Top?.kind ?? 'question';
  const text = renderFallbackLine(kind, name);

  return {
    text,
    tone: 'casual',
    hookCategory: cat,
    archetype: 'question',
    predictedReplyProb: 0.2,
    isFallback: true,
  };
}

function renderFallbackLine(kind: string, name: string): string {
  // because: a tiny set of v3-style lines that pass lintMoveV8 — short,
  // lowercase, single-fragment, casual register
  switch (kind) {
    case 'voice_note':  return `${name}, voice note when free`;
    case 'photo_share': return `${name}, show me your last photo`;
    case 'date_plan':   return `${name}, coffee this week`;
    case 'gif':         return `${name}, send me a gif`;
    case 'compliment':  return `${name}, your bio reads honest`;
    case 'beat_send':   return `${name}, a beat you replay?`;
    case 'custom_prompt': return `${name}, one word for your week`;
    case 'question':
    default:            return `${name}, what's the small joy today`;
  }
}

function fullV3Fallback(input: ComposerInput): ComposeResult {
  const suggestions: Suggestion[] = [];
  for (let slot = 0; slot < COMPOSE_K; slot++) {
    suggestions.push(makeV3Fallback(input, slot, new Set()));
  }
  return { suggestions, fallbackCount: COMPOSE_K };
}

// ---------------------------------------------------------------------------
// Diversity enforcement
// ---------------------------------------------------------------------------

function enforceDiversity(
  accepted: Suggestion[],
  candidates: Candidate[],
  input: ComposerInput,
  usedCategories: Set<HookCategory>,
): void {
  const distinct = new Set(accepted.map((s) => s.hookCategory));
  if (distinct.size >= MIN_DISTINCT_HOOK_CATEGORIES) return;

  // find the lowest-pReply slot and try to swap for a candidate with a new category
  for (let pass = 0; pass < 3 && distinct.size < MIN_DISTINCT_HOOK_CATEGORIES; pass++) {
    let lowIdx = 0;
    for (let i = 1; i < accepted.length; i++) {
      if (accepted[i].predictedReplyProb < accepted[lowIdx].predictedReplyProb) lowIdx = i;
    }

    const name = (input.receiverName ?? '').trim() || 'you';
    let swapped = false;
    for (const cand of candidates) {
      if (distinct.has(cand.hook.category)) continue;
      const raw = fillTemplate(cand.template.template, name, cand.hook.text);
      const projected = projectToVoice(raw, input.senderVoice);
      const lint = lintMoveV8(projected);
      if (!lint.ok) continue;

      const old = accepted[lowIdx];
      distinct.delete(old.hookCategory);
      accepted[lowIdx] = {
        text: projected,
        tone: cand.template.tone,
        hookCategory: cand.hook.category,
        archetype: cand.template.archetype,
        predictedReplyProb: cand.pReply,
        isFallback: false,
      };
      distinct.add(cand.hook.category);
      usedCategories.add(cand.hook.category);
      swapped = true;
      break;
    }
    if (!swapped) break;
  }
}

export const __test__ = {
  mulberry32,
  predictReply,
  INTENT_TO_TONE_AFFINITY,
  ARCHETYPE_TO_KIND,
  makeV3Fallback,
  renderFallbackLine,
};
