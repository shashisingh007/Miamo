/**
 * v8 (v3.6.0) — algorithm-overhaul foundation event validators.
 *
 * Covers the 16 new event names registered in `V6_VALIDATORS`:
 *   intent.snapshot, engagement.depth_scored, mood.inferred, polarity.computed,
 *   exposure.credit_earned, exposure.slot_filled,
 *   move.composed, move.suggestion_accepted,
 *   voice_fingerprint.shown, voice_fingerprint.shared,
 *   family_brief.generated, family_brief.viewed,
 *   chat.deposit_made, chat.reply_bonus_paid, chat.ghost_burn,
 *   dtm.topic_masked.
 *
 * Each event has a happy-path and at least one invalid-path test, plus
 * `isV6Event` round-trip and an unknown-name negative check.
 */
import { describe, it, expect } from 'vitest';
import {
  isV6Event,
  validateV6Payload,
  V6_VALIDATORS,
  IntentSnapshotSchema,
  EngagementDepthScoredSchema,
  MoodInferredSchema,
  PolarityComputedSchema,
  ExposureCreditEarnedSchema,
  ExposureSlotFilledSchema,
  MoveComposedSchema,
  MoveSuggestionAcceptedSchema,
  VoiceFingerprintShownSchema,
  VoiceFingerprintSharedSchema,
  FamilyBriefGeneratedSchema,
  FamilyBriefViewedSchema,
  ChatDepositMadeSchema,
  ChatReplyBonusPaidSchema,
  ChatGhostBurnSchema,
  DtmTopicMaskedSchema,
} from '../v6Validators';

// A representative 22-char base64url-ish HMAC. Exactly meets the
// `uidHash` min(20)/max(24) bound used across the v8 schemas.
const HASH22 = 'a1b2c3d4e5f6g7h8i9j0kl';

// ─── isV6Event coverage for the new names ───────────────────────────
describe('isV6Event — v8 names', () => {
  const v8Names = [
    'intent.snapshot',
    'engagement.depth_scored',
    'mood.inferred',
    'polarity.computed',
    'exposure.credit_earned',
    'exposure.slot_filled',
    'move.composed',
    'move.suggestion_accepted',
    'voice_fingerprint.shown',
    'voice_fingerprint.shared',
    'family_brief.generated',
    'family_brief.viewed',
    'chat.deposit_made',
    'chat.reply_bonus_paid',
    'chat.ghost_burn',
    'dtm.topic_masked',
  ] as const;

  it.each(v8Names)('recognises %s', (name) => {
    expect(isV6Event(name)).toBe(true);
    expect(V6_VALIDATORS[name as keyof typeof V6_VALIDATORS]).toBeDefined();
  });

  it('still rejects unknown / made-up names', () => {
    expect(isV6Event('intent.snapshot.v9')).toBe(false);
    expect(isV6Event('mood.divined')).toBe(false);
    expect(isV6Event('nope.nope')).toBe(false);
  });

  it('validateV6Payload returns ok:false for unknown name', () => {
    const r = validateV6Payload('made.up.event', {});
    expect(r.ok).toBe(false);
  });
});

// ─── intent.snapshot ────────────────────────────────────────────────
describe('IntentSnapshotSchema', () => {
  it('accepts a valid intent snapshot', () => {
    const r = IntentSnapshotSchema.safeParse({
      intentClass: 'serious_search',
      confidence: 0.72,
      ttlMs: 90_000,
    });
    expect(r.success).toBe(true);
  });
  it('rejects an unknown intentClass', () => {
    expect(IntentSnapshotSchema.safeParse({
      intentClass: 'i_dunno',
      confidence: 0.5,
      ttlMs: 90_000,
    }).success).toBe(false);
  });
  it('rejects confidence > 1', () => {
    expect(IntentSnapshotSchema.safeParse({
      intentClass: 'casual_scroll',
      confidence: 1.1,
      ttlMs: 90_000,
    }).success).toBe(false);
  });
  it('rejects ttlMs over 10 min cap', () => {
    expect(IntentSnapshotSchema.safeParse({
      intentClass: 'casual_scroll',
      confidence: 0.5,
      ttlMs: 600_001,
    }).success).toBe(false);
  });
});

// ─── engagement.depth_scored ────────────────────────────────────────
describe('EngagementDepthScoredSchema', () => {
  it('accepts valid depth + optional fields', () => {
    expect(EngagementDepthScoredSchema.safeParse({
      tid: 't1', depth: 0.42, surface: 'discover', accidentalClick: false,
    }).success).toBe(true);
  });
  it('rejects depth > 1', () => {
    expect(EngagementDepthScoredSchema.safeParse({
      tid: 't1', depth: 1.5,
    }).success).toBe(false);
  });
  it('rejects negative depth', () => {
    expect(EngagementDepthScoredSchema.safeParse({
      tid: 't1', depth: -0.01,
    }).success).toBe(false);
  });
  it('rejects unknown surface enum', () => {
    expect(EngagementDepthScoredSchema.safeParse({
      tid: 't1', depth: 0.5, surface: 'tiktok',
    }).success).toBe(false);
  });
});

// ─── mood.inferred ──────────────────────────────────────────────────
describe('MoodInferredSchema', () => {
  it('accepts a full 5-dim mood vector', () => {
    expect(MoodInferredSchema.safeParse({
      rage: 0.1, calm: 0.6, curious: 0.5, receptive: 0.7, fatigued: 0.2,
      ttlMs: 90_000,
    }).success).toBe(true);
  });
  it('rejects a missing dimension', () => {
    expect(MoodInferredSchema.safeParse({
      rage: 0.1, calm: 0.6, curious: 0.5, receptive: 0.7,
      ttlMs: 90_000,
    }).success).toBe(false);
  });
  it('rejects a value outside [0,1]', () => {
    expect(MoodInferredSchema.safeParse({
      rage: 1.4, calm: 0.6, curious: 0.5, receptive: 0.7, fatigued: 0.2,
      ttlMs: 90_000,
    }).success).toBe(false);
  });
});

// ─── polarity.computed ──────────────────────────────────────────────
describe('PolarityComputedSchema', () => {
  it('accepts a negative polarity', () => {
    expect(PolarityComputedSchema.safeParse({
      tid: 't', polarity: -0.8, dwellMs: 1200,
    }).success).toBe(true);
  });
  it('accepts a positive polarity without dwellMs', () => {
    expect(PolarityComputedSchema.safeParse({
      tid: 't', polarity: 0.9,
    }).success).toBe(true);
  });
  it('rejects polarity < -1', () => {
    expect(PolarityComputedSchema.safeParse({
      tid: 't', polarity: -1.5,
    }).success).toBe(false);
  });
  it('rejects polarity > 1', () => {
    expect(PolarityComputedSchema.safeParse({
      tid: 't', polarity: 1.5,
    }).success).toBe(false);
  });
});

// ─── exposure.credit_earned ─────────────────────────────────────────
describe('ExposureCreditEarnedSchema', () => {
  it('accepts a valid credit-earned event', () => {
    expect(ExposureCreditEarnedSchema.safeParse({
      surface: 'discover', reason: 'sticky_like', slots: 3,
    }).success).toBe(true);
  });
  it('rejects slots > 50', () => {
    expect(ExposureCreditEarnedSchema.safeParse({
      surface: 'discover', reason: 'admin_grant', slots: 51,
    }).success).toBe(false);
  });
  it('rejects missing reason', () => {
    expect(ExposureCreditEarnedSchema.safeParse({
      surface: 'discover', slots: 3,
    }).success).toBe(false);
  });
});

// ─── exposure.slot_filled ──────────────────────────────────────────
describe('ExposureSlotFilledSchema', () => {
  it('accepts a valid slot_filled event', () => {
    expect(ExposureSlotFilledSchema.safeParse({
      surface: 'discover', targetHash: HASH22, slotType: 'organic',
    }).success).toBe(true);
  });
  it('rejects an unknown slotType', () => {
    expect(ExposureSlotFilledSchema.safeParse({
      surface: 'discover', targetHash: HASH22, slotType: 'cheat_code',
    }).success).toBe(false);
  });
  it('rejects a short targetHash', () => {
    expect(ExposureSlotFilledSchema.safeParse({
      surface: 'discover', targetHash: 'short', slotType: 'organic',
    }).success).toBe(false);
  });
});

// ─── move.composed ─────────────────────────────────────────────────
describe('MoveComposedSchema', () => {
  it('accepts a valid Move composition event', () => {
    expect(MoveComposedSchema.safeParse({
      receiverHash: HASH22,
      suggestionCount: 3,
      fallbackCount: 1,
      hookCategories: ['music', 'travel'],
      languageFamily: 'en',
    }).success).toBe(true);
  });
  it('rejects suggestionCount > 5', () => {
    expect(MoveComposedSchema.safeParse({
      receiverHash: HASH22,
      suggestionCount: 6,
      fallbackCount: 0,
      hookCategories: [],
      languageFamily: 'en',
    }).success).toBe(false);
  });
  it('rejects unknown languageFamily', () => {
    expect(MoveComposedSchema.safeParse({
      receiverHash: HASH22,
      suggestionCount: 1,
      fallbackCount: 0,
      hookCategories: [],
      languageFamily: 'klingon',
    }).success).toBe(false);
  });
});

// ─── move.suggestion_accepted ──────────────────────────────────────
describe('MoveSuggestionAcceptedSchema', () => {
  it('accepts a valid accepted event', () => {
    expect(MoveSuggestionAcceptedSchema.safeParse({
      receiverHash: HASH22,
      slotIndex: 2,
      hookCategory: 'music',
      tone: 'casual',
    }).success).toBe(true);
  });
  it('rejects slotIndex > 4', () => {
    expect(MoveSuggestionAcceptedSchema.safeParse({
      receiverHash: HASH22,
      slotIndex: 5,
      hookCategory: 'music',
      tone: 'casual',
    }).success).toBe(false);
  });
  it('rejects unknown tone', () => {
    expect(MoveSuggestionAcceptedSchema.safeParse({
      receiverHash: HASH22,
      slotIndex: 1,
      hookCategory: 'music',
      tone: 'aggressive',
    }).success).toBe(false);
  });
});

// ─── voice_fingerprint.shown ───────────────────────────────────────
describe('VoiceFingerprintShownSchema', () => {
  it('accepts a valid event with messageCount', () => {
    expect(VoiceFingerprintShownSchema.safeParse({ messageCount: 42 }).success).toBe(true);
  });
  it('rejects negative messageCount', () => {
    expect(VoiceFingerprintShownSchema.safeParse({ messageCount: -1 }).success).toBe(false);
  });
  it('rejects missing messageCount', () => {
    expect(VoiceFingerprintShownSchema.safeParse({}).success).toBe(false);
  });
});

// ─── voice_fingerprint.shared ──────────────────────────────────────
describe('VoiceFingerprintSharedSchema', () => {
  it('accepts a known channel', () => {
    expect(VoiceFingerprintSharedSchema.safeParse({ channel: 'whatsapp' }).success).toBe(true);
  });
  it('rejects an unknown channel', () => {
    expect(VoiceFingerprintSharedSchema.safeParse({ channel: 'tiktok' }).success).toBe(false);
  });
});

// ─── family_brief.generated ────────────────────────────────────────
describe('FamilyBriefGeneratedSchema', () => {
  it('accepts a valid generation event', () => {
    expect(FamilyBriefGeneratedSchema.safeParse({
      format: 'pdf', hasTrackViews: true,
    }).success).toBe(true);
  });
  it('rejects unknown format', () => {
    expect(FamilyBriefGeneratedSchema.safeParse({
      format: 'docx', hasTrackViews: false,
    }).success).toBe(false);
  });
  it('rejects missing hasTrackViews', () => {
    expect(FamilyBriefGeneratedSchema.safeParse({
      format: 'pdf',
    }).success).toBe(false);
  });
});

// ─── family_brief.viewed ───────────────────────────────────────────
describe('FamilyBriefViewedSchema', () => {
  it('accepts a valid token-only event', () => {
    expect(FamilyBriefViewedSchema.safeParse({ token: HASH22 }).success).toBe(true);
  });
  it('rejects a too-short token', () => {
    expect(FamilyBriefViewedSchema.safeParse({ token: 'short' }).success).toBe(false);
  });
  it('rejects extra fields under strict mode (IP must NOT leak)', () => {
    expect(FamilyBriefViewedSchema.safeParse({
      token: HASH22,
      ip: '1.2.3.4',
    }).success).toBe(false);
  });
});

// ─── chat.deposit_made ─────────────────────────────────────────────
describe('ChatDepositMadeSchema', () => {
  it('accepts a 1-minute deposit', () => {
    expect(ChatDepositMadeSchema.safeParse({
      receiverHash: HASH22, minutesDeposited: 1,
    }).success).toBe(true);
  });
  it('rejects 3-minute deposit (over cap)', () => {
    expect(ChatDepositMadeSchema.safeParse({
      receiverHash: HASH22, minutesDeposited: 3,
    }).success).toBe(false);
  });
  it('rejects 0-minute deposit (under floor)', () => {
    expect(ChatDepositMadeSchema.safeParse({
      receiverHash: HASH22, minutesDeposited: 0,
    }).success).toBe(false);
  });
});

// ─── chat.reply_bonus_paid ─────────────────────────────────────────
describe('ChatReplyBonusPaidSchema', () => {
  it('accepts a valid bonus payout', () => {
    expect(ChatReplyBonusPaidSchema.safeParse({
      senderHash: HASH22, minutesAwarded: 2, replyMs: 30_000,
    }).success).toBe(true);
  });
  it('rejects missing replyMs', () => {
    expect(ChatReplyBonusPaidSchema.safeParse({
      senderHash: HASH22, minutesAwarded: 1,
    }).success).toBe(false);
  });
  it('rejects negative replyMs', () => {
    expect(ChatReplyBonusPaidSchema.safeParse({
      senderHash: HASH22, minutesAwarded: 1, replyMs: -1,
    }).success).toBe(false);
  });
});

// ─── chat.ghost_burn ───────────────────────────────────────────────
describe('ChatGhostBurnSchema', () => {
  it('accepts a valid burn event', () => {
    expect(ChatGhostBurnSchema.safeParse({
      receiverHash: HASH22, minutesBurned: 1,
    }).success).toBe(true);
  });
  it('rejects minutesBurned > 2', () => {
    expect(ChatGhostBurnSchema.safeParse({
      receiverHash: HASH22, minutesBurned: 3,
    }).success).toBe(false);
  });
});

// ─── dtm.topic_masked ──────────────────────────────────────────────
describe('DtmTopicMaskedSchema', () => {
  it('accepts a valid mask event', () => {
    expect(DtmTopicMaskedSchema.safeParse({
      topic: 'family', reason: 'low_mood',
    }).success).toBe(true);
  });
  it('rejects unknown reason', () => {
    expect(DtmTopicMaskedSchema.safeParse({
      topic: 'family', reason: 'idk',
    }).success).toBe(false);
  });
  it('rejects empty topic', () => {
    expect(DtmTopicMaskedSchema.safeParse({
      topic: '', reason: 'low_mood',
    }).success).toBe(false);
  });
});

// ─── End-to-end: validateV6Payload routes correctly ───────────────
describe('validateV6Payload — v8 names', () => {
  it('routes intent.snapshot to IntentSnapshotSchema', () => {
    const r = validateV6Payload('intent.snapshot', {
      intentClass: 'serious_search', confidence: 0.5, ttlMs: 90_000,
    });
    expect(r.ok).toBe(true);
  });
  it('routes family_brief.viewed and strips no extra fields (strict)', () => {
    const r = validateV6Payload('family_brief.viewed', {
      token: HASH22, ip: '1.2.3.4',
    });
    expect(r.ok).toBe(false);
  });
});
