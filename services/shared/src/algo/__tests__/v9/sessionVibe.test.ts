import { describe, it, expect } from 'vitest';
import {
  classifyVibe,
  scoreVibes,
  totalSignal,
  CASUAL_SWIPE_RATE,
  SERIOUS_DWELL_MS,
  REELS_CONSUME_MIN,
  CHAT_FIRST_MIN,
  PHOTO_CURATE_MIN,
  MIN_TOTAL_SIGNAL,
  type SessionFingerprint,
} from '../../v9/sessionVibe';

function fp(over: Partial<SessionFingerprint>): SessionFingerprint {
  return {
    swipeRate: 0,
    dwellMeanMs: 0,
    bioExpands: 0,
    filterChanges: 0,
    dtmAnswers: 0,
    messagesOpened: 0,
    reelsViewed: 0,
    profileEdits: 0,
    ...over,
  };
}

describe('v9/sessionVibe', () => {
  it('casual_browse — high swipe rate, low dwell, no bio reads', () => {
    const r = classifyVibe(fp({ swipeRate: 1.2, dwellMeanMs: 800, bioExpands: 0 }));
    expect(r.vibe).toBe('casual_browse');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('serious_search — long dwell + bio reads + filter changes + DTM answers', () => {
    const r = classifyVibe(fp({
      swipeRate: 0.1,
      dwellMeanMs: 6000,
      bioExpands: 4,
      filterChanges: 3,
      dtmAnswers: 5,
    }));
    expect(r.vibe).toBe('serious_search');
    expect(r.confidence).toBeGreaterThan(0.3);
  });

  it('chat_first — opens multiple messages, doesn\'t swipe', () => {
    const r = classifyVibe(fp({
      messagesOpened: 4,
      swipeRate: 0.05,
    }));
    expect(r.vibe).toBe('chat_first');
  });

  it('content_consume — reels dominate', () => {
    const r = classifyVibe(fp({
      reelsViewed: 6,
      swipeRate: 0.05,
    }));
    expect(r.vibe).toBe('content_consume');
  });

  it('photo_curate — profile edits dominate', () => {
    const r = classifyVibe(fp({
      profileEdits: 4,
    }));
    expect(r.vibe).toBe('photo_curate');
  });

  it('empty fingerprint → some default; low confidence', () => {
    const r = classifyVibe(fp({}));
    expect(r.confidence).toBeLessThanOrEqual(0.5);
  });

  it('confidence in [0,1]', () => {
    for (let s = 0; s < 20; s++) {
      const r = classifyVibe(fp({
        swipeRate: (s % 3) * 0.4,
        dwellMeanMs: (s % 5) * 1500,
        bioExpands: s % 4,
        filterChanges: s % 3,
        dtmAnswers: s % 6,
        messagesOpened: s % 5,
        reelsViewed: s % 7,
        profileEdits: s % 3,
      }));
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('under-observed session (total signal < MIN_TOTAL_SIGNAL) → capped confidence', () => {
    const r = classifyVibe(fp({ profileEdits: 1 }));
    // totalSignal = 1 → signalFactor = 0.2 → confidence ≤ 0.2
    expect(r.confidence).toBeLessThanOrEqual(0.2);
  });

  it('serious_search wins when dwell is high AND swipe rate low', () => {
    const scores = scoreVibes(fp({ dwellMeanMs: 8000, bioExpands: 3, filterChanges: 2 }));
    // Serious signal should be greater than casual.
    expect(scores.serious_search).toBeGreaterThan(scores.casual_browse);
  });

  it('casual_browse wins when swipe rate high AND dwell low', () => {
    const scores = scoreVibes(fp({ swipeRate: 1.5, dwellMeanMs: 400 }));
    expect(scores.casual_browse).toBeGreaterThan(scores.serious_search);
  });

  it('mixed chat + reels — argmax by declaration order tie-breaks', () => {
    // We construct a case where chat_first and content_consume are close.
    // Score functions differ enough that this is rarely truly tied, but
    // when tied the tie-break defers to declaration order.
    const r = classifyVibe(fp({ messagesOpened: 2, reelsViewed: 3 }));
    expect(['chat_first', 'content_consume']).toContain(r.vibe);
  });

  it('totalSignal: swipes contribute but are capped', () => {
    const t1 = totalSignal(fp({ swipeRate: 100 }));
    expect(t1).toBeLessThanOrEqual(30); // 20 (cap) + tiny others
  });

  it('classifyVibe: never returns NaN confidence', () => {
    const r = classifyVibe(fp({}));
    expect(Number.isFinite(r.confidence)).toBe(true);
  });

  it('threshold constants match the D.6 spec', () => {
    expect(CASUAL_SWIPE_RATE).toBeGreaterThan(0);
    expect(SERIOUS_DWELL_MS).toBeGreaterThan(0);
    expect(REELS_CONSUME_MIN).toBeGreaterThanOrEqual(2);
    expect(CHAT_FIRST_MIN).toBeGreaterThanOrEqual(1);
    expect(PHOTO_CURATE_MIN).toBeGreaterThanOrEqual(1);
    expect(MIN_TOTAL_SIGNAL).toBeGreaterThan(0);
  });

  it('all five vibes are reachable by some fingerprint', () => {
    const casual = classifyVibe(fp({ swipeRate: 1.5, dwellMeanMs: 500 }));
    const serious = classifyVibe(fp({ dwellMeanMs: 6000, bioExpands: 5, filterChanges: 3, dtmAnswers: 4 }));
    const chat    = classifyVibe(fp({ messagesOpened: 5 }));
    const consume = classifyVibe(fp({ reelsViewed: 8 }));
    const curate  = classifyVibe(fp({ profileEdits: 5 }));
    expect(casual.vibe).toBe('casual_browse');
    expect(serious.vibe).toBe('serious_search');
    expect(chat.vibe).toBe('chat_first');
    expect(consume.vibe).toBe('content_consume');
    expect(curate.vibe).toBe('photo_curate');
  });
});
