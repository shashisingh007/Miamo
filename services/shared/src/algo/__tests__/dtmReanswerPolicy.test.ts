import { describe, it, expect } from 'vitest';
import { decideDtmReanswer } from '../dtmReanswerPolicy';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

describe('dtmReanswerPolicy', () => {
  it('never answered -> ask', () => {
    const r = decideDtmReanswer({ topic: 'values', lastAnsweredAtMs: 0, topicConfidence: 0.9, nowMs: NOW });
    expect(r.shouldAsk).toBe(true);
    expect(r.reason).toBe('never_answered');
  });

  it('inside cooldown -> do not ask', () => {
    const r = decideDtmReanswer({ topic: 'values', lastAnsweredAtMs: NOW - 3 * DAY, topicConfidence: 0.2, nowMs: NOW });
    expect(r.shouldAsk).toBe(false);
    expect(r.reason).toBe('cooldown');
  });

  it('low confidence past cooldown -> ask', () => {
    const r = decideDtmReanswer({ topic: 'values', lastAnsweredAtMs: NOW - 30 * DAY, topicConfidence: 0.30, nowMs: NOW });
    expect(r.shouldAsk).toBe(true);
    expect(r.reason).toBe('low_confidence');
  });

  it('stale (>=120d) even with good confidence -> ask', () => {
    const r = decideDtmReanswer({ topic: 'values', lastAnsweredAtMs: NOW - 200 * DAY, topicConfidence: 0.9, nowMs: NOW });
    expect(r.shouldAsk).toBe(true);
    expect(r.reason).toBe('stale');
  });

  it('userFlaggedRetake beats high confidence', () => {
    const r = decideDtmReanswer({
      topic: 'values', lastAnsweredAtMs: NOW - 30 * DAY, topicConfidence: 0.9, nowMs: NOW,
      userFlaggedRetake: true,
    });
    expect(r.shouldAsk).toBe(true);
    expect(r.reason).toBe('user_flag');
  });

  it('consent block trumps everything', () => {
    const r = decideDtmReanswer({
      topic: 'finance', lastAnsweredAtMs: 0, topicConfidence: 0, nowMs: NOW,
      consentBlocked: true, userFlaggedRetake: true,
    });
    expect(r.shouldAsk).toBe(false);
    expect(r.reason).toBe('consent_blocked');
  });

  it('confident + recent (past cooldown) -> do not ask', () => {
    const r = decideDtmReanswer({ topic: 'values', lastAnsweredAtMs: NOW - 30 * DAY, topicConfidence: 0.9, nowMs: NOW });
    expect(r.shouldAsk).toBe(false);
    expect(r.reason).toBe('asked');
  });

  it('honours custom thresholds', () => {
    const r = decideDtmReanswer({
      topic: 'values', lastAnsweredAtMs: NOW - 3 * DAY, topicConfidence: 0.30, nowMs: NOW,
      cooldownDays: 1, confidenceFloor: 0.5,
    });
    expect(r.shouldAsk).toBe(true);
    expect(r.reason).toBe('low_confidence');
  });

  it('cooldown boundary: exactly cooldownDays elapsed -> ask path eligible', () => {
    const r = decideDtmReanswer({
      topic: 'values', lastAnsweredAtMs: NOW - 14 * DAY, topicConfidence: 0.30, nowMs: NOW,
    });
    expect(r.shouldAsk).toBe(true); // 14 days >= 14-day cooldown, low confidence triggers ask
  });

  it('clock skew (last > now) treated as zero-elapsed -> cooldown', () => {
    const r = decideDtmReanswer({ topic: 'values', lastAnsweredAtMs: NOW + 10 * DAY, topicConfidence: 0.1, nowMs: NOW });
    expect(r.reason).toBe('cooldown');
  });
});
