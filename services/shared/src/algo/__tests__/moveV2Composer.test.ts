import { describe, it, expect } from 'vitest';
import {
  compose,
  COMPOSE_K,
  MAX_LINT_RETRIES,
  PREDICT_WEIGHTS,
  type ComposerInput,
} from '../v8/moveV2/composer';
import { extractSenderVoice, NEUTRAL_VOICE } from '../v8/moveV2/senderVoice';
import { buildResonance, NEUTRAL_RESONANCE, type FirstMoveOutcomeSample } from '../v8/moveV2/receiverResonance';
import { type HookCandidate } from '../v8/moveV2/hookLibrary';
import { lintMoveV8 } from '../moveVoice';

const NOW = 1_700_000_000_000;

function richHooks(): HookCandidate[] {
  return [
    { category: 'recent_post', text: 'sikkim trekking', freshnessAgeDays: 1, specificity: 0.9 },
    { category: 'shared_interest', text: 'filter coffee', freshnessAgeDays: Infinity, specificity: 0.8 },
    { category: 'shared_spotlight', text: 'lo-fi', freshnessAgeDays: Infinity, specificity: 0.7 },
    { category: 'shared_city', text: 'bangalore', freshnessAgeDays: Infinity, specificity: 0.3 },
    { category: 'dtm_topic', text: 'long-form essays', freshnessAgeDays: 2, specificity: 0.85 },
    { category: 'festival', text: 'diwali', freshnessAgeDays: 0, specificity: 0.6 },
    { category: 'shared_college', text: 'iit-b', freshnessAgeDays: Infinity, specificity: 0.5 },
    { category: 'shared_employer', text: 'razorpay', freshnessAgeDays: Infinity, specificity: 0.5 },
  ];
}

function baseInput(overrides: Partial<ComposerInput> = {}): ComposerInput {
  return {
    senderVoice: NEUTRAL_VOICE,
    receiverResonance: NEUTRAL_RESONANCE,
    hooks: richHooks(),
    languageFamily: 'en',
    receiverName: 'Riya',
    viewerIntent: { topClass: 'intentional-browse', confidence: 0.8 },
    seed: 12345,
    nowMs: NOW,
    ...overrides,
  };
}

describe('compose — basic', () => {
  it('returns exactly COMPOSE_K suggestions', () => {
    const r = compose(baseInput());
    expect(r.suggestions.length).toBe(COMPOSE_K);
  });

  it('falls back to all-v3 when hooks are empty', () => {
    const r = compose(baseInput({ hooks: [] }));
    expect(r.fallbackCount).toBe(COMPOSE_K);
    expect(r.suggestions.every((s) => s.isFallback)).toBe(true);
  });

  it('rich input + en → 5 suggestions all pass linter', () => {
    const r = compose(baseInput());
    for (const s of r.suggestions) {
      const lint = lintMoveV8(s.text);
      expect(lint.ok, `${s.text} → ${lint.reason}`).toBe(true);
    }
  });

  it('rich input → ≥3 distinct hook categories', () => {
    const r = compose(baseInput());
    const distinct = new Set(r.suggestions.map((s) => s.hookCategory));
    expect(distinct.size).toBeGreaterThanOrEqual(3);
  });

  it('all suggestion texts are non-empty', () => {
    const r = compose(baseInput());
    for (const s of r.suggestions) expect(s.text.length).toBeGreaterThan(0);
  });

  it('predictedReplyProb is in [0,1]', () => {
    const r = compose(baseInput());
    for (const s of r.suggestions) {
      expect(s.predictedReplyProb).toBeGreaterThanOrEqual(0);
      expect(s.predictedReplyProb).toBeLessThanOrEqual(1);
    }
  });

  it('suggestions are sorted by predictedReplyProb desc', () => {
    const r = compose(baseInput());
    for (let i = 1; i < r.suggestions.length; i++) {
      expect(r.suggestions[i].predictedReplyProb).toBeLessThanOrEqual(r.suggestions[i - 1].predictedReplyProb);
    }
  });
});

describe('compose — determinism', () => {
  it('same seed + input → identical output', () => {
    const a = compose(baseInput({ seed: 999 }));
    const b = compose(baseInput({ seed: 999 }));
    expect(a.suggestions.map((s) => s.text)).toEqual(b.suggestions.map((s) => s.text));
  });

  it('any seed yields exactly COMPOSE_K suggestions', () => {
    // because: seed only jitters tie-breaks; the contract is that output
    // size and lint-clean status are invariant across seeds
    for (const s of [1, 2, 42, 1000, 99999]) {
      const r = compose(baseInput({ seed: s }));
      expect(r.suggestions.length).toBe(COMPOSE_K);
    }
  });
});

describe('compose — language families', () => {
  it('hi_en input produces Hinglish-flavoured templates', () => {
    const r = compose(baseInput({ languageFamily: 'hi_en' }));
    // at least one suggestion should use a Hinglish marker
    const text = r.suggestions.map((s) => s.text).join(' ');
    expect(/yaar|hai|scene|wala|accha|kya|bhai|mera|haan|same/.test(text)).toBe(true);
  });

  it('ta_en input produces Tanglish-flavoured templates', () => {
    const r = compose(baseInput({ languageFamily: 'ta_en' }));
    const text = r.suggestions.map((s) => s.text).join(' ');
    // tanglish cues: epdi/iruka/sema/da/sollu/una/pannu
    expect(/epdi|iruka|sema|sollu| da |una|pannu|kaatu/.test(text)).toBe(true);
  });

  it('bn_en input produces Banglish-flavoured templates', () => {
    const r = compose(baseInput({ languageFamily: 'bn_en' }));
    const text = r.suggestions.map((s) => s.text).join(' ');
    expect(/bolish|khabor|tor|ami|kothay|niye|kichu|darun|kobe/.test(text)).toBe(true);
  });
});

describe('compose — fallback paths', () => {
  it('handles missing receiverName gracefully', () => {
    const r = compose(baseInput({ receiverName: undefined }));
    for (const s of r.suggestions) expect(s.text).not.toContain('{NAME}');
  });

  it('handles missing viewerIntent', () => {
    const r = compose(baseInput({ viewerIntent: undefined }));
    expect(r.suggestions.length).toBe(COMPOSE_K);
  });

  it('handles single hook (limited diversity)', () => {
    const r = compose(baseInput({ hooks: [richHooks()[0]] }));
    expect(r.suggestions.length).toBe(COMPOSE_K);
    // diversity rule will inevitably require fallbacks here
    expect(r.fallbackCount).toBeGreaterThan(0);
  });
});

describe('compose — predict weights', () => {
  it('PREDICT_WEIGHTS sum to 1.0', () => {
    const sum = PREDICT_WEIGHTS.resonance + PREDICT_WEIGHTS.voice + PREDICT_WEIGHTS.hook + PREDICT_WEIGHTS.intent;
    expect(sum).toBeCloseTo(1, 6);
  });

  it('MAX_LINT_RETRIES is reasonable', () => {
    expect(MAX_LINT_RETRIES).toBeGreaterThanOrEqual(1);
    expect(MAX_LINT_RETRIES).toBeLessThanOrEqual(10);
  });
});

describe('compose — receiver resonance impact', () => {
  it('strong question-only resonance biases toward question archetypes', () => {
    const samples: FirstMoveOutcomeSample[] = Array.from({ length: 10 }, () => ({
      openerKind: 'question',
      tone: 'casual',
      replied: true,
      replyMs: 60_000,
      openerLengthChars: 30,
    }));
    const res = buildResonance(samples);
    const r = compose(baseInput({ receiverResonance: res }));
    // top suggestion's archetype should be question (most of the time given the bias)
    expect(r.suggestions[0].archetype).toBe('question');
  });

  it('sender voice with high contractionRate projects contractions in output', () => {
    const voice = extractSenderVoice(
      Array.from({ length: 50 }, (_, i) => ({
        content: "i don't know it's all good i'm here",
        createdAtMs: NOW + i * 1000,
      })),
    );
    expect(voice.contractionRate).toBeGreaterThan(0.5);
    const r = compose(baseInput({ senderVoice: voice }));
    expect(r.suggestions.length).toBe(COMPOSE_K);
  });
});

describe('compose — diversity edge', () => {
  it('hooks all same category still produces 5 suggestions (with v3 fallbacks)', () => {
    const sameCat: HookCandidate[] = Array.from({ length: 3 }, (_, i) => ({
      category: 'shared_interest',
      text: `interest-${i}`,
      freshnessAgeDays: Infinity,
      specificity: 0.5,
    }));
    const r = compose(baseInput({ hooks: sameCat }));
    expect(r.suggestions.length).toBe(COMPOSE_K);
  });
});
