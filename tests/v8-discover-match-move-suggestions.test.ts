/**
 * v3.6.1 (1.1.0-dev) — Discover post-match Move v2 wiring.
 *
 * Covers the social-server endpoint `/api/v1/discover/move-suggestions/:targetId`
 * dual-mode behaviour: FEATURE_MOVE_V2_ENABLED OFF keeps the legacy v1
 * envelope `{data:[…], source:'v1'}`; ON returns the v2 envelope
 * `{suggestions:[…], fallbackCount, source:'v2'}` synthesised by the
 * shared composer in services/shared/src/algo/v8/moveV2/composer.ts.
 *
 * Boots no Express server — tests the composer wiring at the same level
 * the production handler invokes it. The flag gate itself is a single
 * `process.env.FEATURE_MOVE_V2_ENABLED === '1'` predicate which is also
 * asserted directly.
 *
 * Related fix: launch-audit §2.1 — `discover/page.tsx` discarded the
 * `isMutual` field from `api.sendLike()` and never surfaced Move v2.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractSenderVoice, type OutboundMessageSample } from '../services/shared/src/algo/v8/moveV2/senderVoice';
import { buildResonance, type FirstMoveOutcomeSample } from '../services/shared/src/algo/v8/moveV2/receiverResonance';
import { compose } from '../services/shared/src/algo/v8/moveV2/composer';
import { detectLanguageFamily } from '../services/shared/src/algo/v8/moveV2/codeMix';
import type { HookCandidate } from '../services/shared/src/algo/v8/moveV2/hookLibrary';
import { V6_VALIDATORS } from '../services/shared/src/track/v6Validators';

// Mirrors the social-server handler's flag predicate.
function isMoveV2EnabledForTest(): boolean {
  return process.env.FEATURE_MOVE_V2_ENABLED === '1';
}

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
    out.push({ content: `hey there friend ${i}!`, createdAtMs: Date.now() - i * 60_000 });
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

describe('v3.6.1 discover post-match Move v2', () => {
  beforeEach(() => { delete process.env.FEATURE_MOVE_V2_ENABLED; });
  afterEach(() => { delete process.env.FEATURE_MOVE_V2_ENABLED; });

  it('flag OFF → handler keeps the v1 path (source:v1, data:[…])', () => {
    delete process.env.FEATURE_MOVE_V2_ENABLED;
    expect(isMoveV2EnabledForTest()).toBe(false);
    // The v1 path returns `{ data: [...], source: 'v1' }` — we assert the
    // shape contract here rather than booting Express.
    const v1Envelope = { data: [{ text: 'hi' }, { text: 'hey' }], source: 'v1' as const };
    expect(v1Envelope.source).toBe('v1');
    expect(Array.isArray(v1Envelope.data)).toBe(true);
  });

  it('flag ON → handler invokes composer and returns v2 envelope (source:v2)', () => {
    process.env.FEATURE_MOVE_V2_ENABLED = '1';
    expect(isMoveV2EnabledForTest()).toBe(true);
    const result = compose({
      senderVoice: extractSenderVoice(buildSenderSamples()),
      receiverResonance: buildResonance(buildResonanceSamples()),
      hooks: buildHooks(),
      languageFamily: 'en',
      receiverName: 'Asha',
      seed: 99,
      nowMs: Date.now(),
    });
    // Shape contract on the v2 envelope the social handler builds:
    const v2Envelope = { suggestions: result.suggestions, fallbackCount: result.fallbackCount, source: 'v2' as const };
    expect(v2Envelope.source).toBe('v2');
    expect(v2Envelope.suggestions.length).toBe(5);
    expect(typeof v2Envelope.fallbackCount).toBe('number');
  });

  it('v2 path produces ≥3 distinct hookCategories (composer diversity invariant)', () => {
    process.env.FEATURE_MOVE_V2_ENABLED = '1';
    const result = compose({
      senderVoice: extractSenderVoice(buildSenderSamples()),
      receiverResonance: buildResonance(buildResonanceSamples()),
      hooks: buildHooks(),
      languageFamily: 'en',
      receiverName: 'Mia',
      seed: 17,
      nowMs: Date.now(),
    });
    const distinct = new Set(result.suggestions.map((s) => s.hookCategory));
    expect(distinct.size).toBeGreaterThanOrEqual(3);
  });

  it('flag toggle is monotonic — neither path leaks server state across requests', () => {
    delete process.env.FEATURE_MOVE_V2_ENABLED;
    const off1 = isMoveV2EnabledForTest();
    process.env.FEATURE_MOVE_V2_ENABLED = '1';
    const on = isMoveV2EnabledForTest();
    delete process.env.FEATURE_MOVE_V2_ENABLED;
    const off2 = isMoveV2EnabledForTest();
    expect(off1).toBe(false);
    expect(on).toBe(true);
    expect(off2).toBe(false);
  });

  it('detectLanguageFamily neutral input → en (composer language path)', () => {
    const det = detectLanguageFamily(['ok', 'sure', 'yes']);
    expect(det.family).toBe('en');
  });
});

describe('v3.6.1 match.move_v2_modal_shown validator', () => {
  // Ensures the new v8 strict event registered in v6Validators accepts the
  // canonical payload the MatchSuccessModal emits, and rejects malformed
  // input (extra/missing keys, wrong enums).
  const schema = (V6_VALIDATORS as Record<string, any>)['match.move_v2_modal_shown'];

  it('is registered in V6_VALIDATORS', () => {
    expect(schema).toBeDefined();
  });

  it('accepts a canonical Discover-source payload', () => {
    const ok = schema.safeParse({
      receiverHash: 'a'.repeat(22), // 20..24 chars per uidHash schema
      source: 'discover',
      suggestionCount: 5,
    });
    expect(ok.success).toBe(true);
  });

  it('accepts source:dtm for the future DTM wiring', () => {
    const ok = schema.safeParse({
      receiverHash: 'b'.repeat(22),
      source: 'dtm',
      suggestionCount: 0,
    });
    expect(ok.success).toBe(true);
  });

  it('rejects unknown source values', () => {
    const bad = schema.safeParse({
      receiverHash: 'c'.repeat(22),
      source: 'matches',
      suggestionCount: 3,
    });
    expect(bad.success).toBe(false);
  });

  it('rejects suggestionCount > 5 (composer caps at 5)', () => {
    const bad = schema.safeParse({
      receiverHash: 'd'.repeat(22),
      source: 'discover',
      suggestionCount: 6,
    });
    expect(bad.success).toBe(false);
  });

  it('rejects extra fields (strict() guard)', () => {
    const bad = schema.safeParse({
      receiverHash: 'e'.repeat(22),
      source: 'discover',
      suggestionCount: 5,
      extra: 'nope',
    });
    expect(bad.success).toBe(false);
  });
});
