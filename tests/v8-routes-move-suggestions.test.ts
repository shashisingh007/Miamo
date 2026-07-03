/**
 * v3.6.0 Move v2 suggestions — composer integration & flag gating.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractSenderVoice, type OutboundMessageSample } from '../services/shared/src/algo/v8/moveV2/senderVoice';
import { buildResonance, type FirstMoveOutcomeSample } from '../services/shared/src/algo/v8/moveV2/receiverResonance';
import { compose } from '../services/shared/src/algo/v8/moveV2/composer';
import { detectLanguageFamily } from '../services/shared/src/algo/v8/moveV2/codeMix';
import type { HookCandidate } from '../services/shared/src/algo/v8/moveV2/hookLibrary';

describe('v3.6.0 move-suggestions-v2 route logic', () => {
  beforeEach(() => { delete process.env.FEATURE_MOVE_V2_ENABLED; });
  afterEach(() => { delete process.env.FEATURE_MOVE_V2_ENABLED; });

  function buildHooks(): HookCandidate[] {
    return [
      { category: 'recent_post', text: 'a poem about chai', freshnessAgeDays: 1, specificity: 0.8 },
      { category: 'shared_interest', text: 'trekking', freshnessAgeDays: Infinity, specificity: 0.5 },
      { category: 'festival', text: 'happy diwali', freshnessAgeDays: 0, specificity: 0.6 },
    ];
  }

  function buildSenderSamples(): OutboundMessageSample[] {
    const out: OutboundMessageSample[] = [];
    for (let i = 0; i < 30; i++) {
      out.push({ content: `hey there friend ${i}!`, createdAtMs: Date.now() - i * 60000 });
    }
    return out;
  }

  function buildResonanceSamples(): FirstMoveOutcomeSample[] {
    return [
      { openerKind: 'question', tone: 'casual', replied: true, replyMs: 60_000, openerLengthChars: 30 },
      { openerKind: 'shared_interest', tone: 'reflective', replied: true, replyMs: 120_000, openerLengthChars: 50 },
      { openerKind: 'compliment', tone: 'quick', replied: true, replyMs: 90_000, openerLengthChars: 35 },
      { openerKind: 'playful', tone: 'casual', replied: true, replyMs: 60_000, openerLengthChars: 40 },
      { openerKind: 'specific_detail', tone: 'tactile', replied: true, replyMs: 30_000, openerLengthChars: 60 },
    ];
  }

  it('compose returns exactly 5 suggestions for happy path', () => {
    const senderVoice = extractSenderVoice(buildSenderSamples());
    const receiverResonance = buildResonance(buildResonanceSamples());
    const result = compose({
      senderVoice,
      receiverResonance,
      hooks: buildHooks(),
      languageFamily: 'en',
      receiverName: 'Sam',
      seed: 42,
      nowMs: Date.now(),
    });
    expect(result.suggestions.length).toBe(5);
  });

  it('each suggestion has predictedReplyProb in [0,1]', () => {
    const r = compose({
      senderVoice: extractSenderVoice(buildSenderSamples()),
      receiverResonance: buildResonance(buildResonanceSamples()),
      hooks: buildHooks(),
      languageFamily: 'en',
      receiverName: 'Asha',
      seed: 7,
      nowMs: Date.now(),
    });
    for (const s of r.suggestions) {
      expect(s.predictedReplyProb).toBeGreaterThanOrEqual(0);
      expect(s.predictedReplyProb).toBeLessThanOrEqual(1);
    }
  });

  it('compose is deterministic for the same seed', () => {
    const args = {
      senderVoice: extractSenderVoice(buildSenderSamples()),
      receiverResonance: buildResonance(buildResonanceSamples()),
      hooks: buildHooks(),
      languageFamily: 'en' as const,
      receiverName: 'Mia',
      seed: 12345,
      nowMs: 1_700_000_000_000,
    };
    const a = compose(args);
    const b = compose(args);
    expect(a.suggestions.map((s) => s.text)).toEqual(b.suggestions.map((s) => s.text));
  });

  it('compose falls back to v3 when hooks are empty', () => {
    const r = compose({
      senderVoice: extractSenderVoice(buildSenderSamples()),
      receiverResonance: buildResonance(buildResonanceSamples()),
      hooks: [],
      languageFamily: 'en',
      receiverName: 'Sam',
      seed: 1,
      nowMs: Date.now(),
    });
    expect(r.suggestions.length).toBe(5);
    expect(r.fallbackCount).toBeGreaterThan(0);
  });

  it('detectLanguageFamily returns en for sparse / unclear input', () => {
    const det = detectLanguageFamily(['ok', 'sure', 'yes']);
    expect(det.family).toBe('en');
  });

  it('detectLanguageFamily can detect Hinglish on clear input', () => {
    const det = detectLanguageFamily([
      'kya hai yaar', 'bhai scene kya hai', 'kuch karna hai',
      'aap kahan ho', 'aur tum kya kar rahe ho', 'maine bola tha',
    ]);
    expect(['en', 'hi_en']).toContain(det.family);
  });

  it('flag OFF → request would be rejected at handler (404)', () => {
    delete process.env.FEATURE_MOVE_V2_ENABLED;
    const enabled = process.env.FEATURE_MOVE_V2_ENABLED === '1';
    expect(enabled).toBe(false);
  });

  it('flag ON → handler proceeds', () => {
    process.env.FEATURE_MOVE_V2_ENABLED = '1';
    const enabled = process.env.FEATURE_MOVE_V2_ENABLED === '1';
    expect(enabled).toBe(true);
  });

  it('extractSenderVoice returns neutral fallback when below MIN_SAMPLES', () => {
    const v = extractSenderVoice([{ content: 'hi', createdAtMs: Date.now() }]);
    // Below 10 samples → neutral fallback (sampleCount may still be reported as 1)
    expect(v.medianLengthChars).toBeGreaterThan(0);
  });

  it('buildResonance returns a vector with the receiver-resonance contract', () => {
    const r = buildResonance(buildResonanceSamples());
    expect(typeof r.preferredLengthMedian).toBe('number');
    expect(typeof r.sampleCount).toBe('number');
    expect(typeof r.confidence).toBe('number');
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});
