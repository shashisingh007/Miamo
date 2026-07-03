/**
 * messageSuggest v5 — typing-aware damp.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  scoreSuggestion,
  scoreSuggestionV5,
  suggestMessagesDispatch,
  type SuggestInputsV5,
} from '../messageSuggest';

const baseInp: SuggestInputsV5 = {
  candFeatures: {
    uidHash: 'b', chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: 0, deadClickRate: 0,
  } as never,
  lastInboundKind: 'text',
  ageSec: {},
  myIntent: 'serious',
  candIntent: 'serious',
  nowHour: 20,
};

describe('scoreSuggestionV5', () => {
  it('equals v4 (up to rounding) when draftedDeletedRate is undefined', () => {
    const v4 = scoreSuggestion('open_question', baseInp).score;
    const v5 = scoreSuggestionV5('open_question', baseInp).score;
    expect(Math.abs(v5 - v4)).toBeLessThanOrEqual(1);
  });

  it('halves the score at full deletion rate', () => {
    const v4 = scoreSuggestion('open_question', baseInp).score;
    const v5 = scoreSuggestionV5('open_question', { ...baseInp, draftedDeletedRate: { open_question: 1.0 } }).score;
    expect(Math.abs(v5 - v4 * 0.5)).toBeLessThanOrEqual(1);
  });

  it('clips rate to [0, 1]', () => {
    const clipped = scoreSuggestionV5('open_question', { ...baseInp, draftedDeletedRate: { open_question: 99 } }).score;
    const exact = scoreSuggestionV5('open_question', { ...baseInp, draftedDeletedRate: { open_question: 1 } }).score;
    expect(clipped).toBe(exact);
  });

  it('explain (why) carries the damp factor and rate', () => {
    const { why } = scoreSuggestionV5('open_question', { ...baseInp, draftedDeletedRate: { open_question: 0.4 } });
    expect(why.draftedDeletedRate).toBe(0.4);
    expect(why.damp).toBeCloseTo(0.8, 5);
  });
});

describe('suggestMessagesDispatch', () => {
  const prev = process.env.ALGO_V5_MESSAGE_SUGGEST_ENABLED;
  beforeEach(() => { delete process.env.ALGO_V5_MESSAGE_SUGGEST_ENABLED; });
  afterEach(() => {
    if (prev === undefined) delete process.env.ALGO_V5_MESSAGE_SUGGEST_ENABLED;
    else process.env.ALGO_V5_MESSAGE_SUGGEST_ENABLED = prev;
  });

  it('ignores draftedDeletedRate when flag is off', () => {
    const rankings = suggestMessagesDispatch({
      ...baseInp,
      draftedDeletedRate: { open_question: 1, callback_to_last: 1 },
    }, 7);
    // open_question would normally rank high for reader+text; with rate=1 on it,
    // v5 would damp it. Verify v4 (default) does NOT damp:
    expect(rankings.find((r) => r.kind === 'open_question')?.score).toBeGreaterThan(60);
  });

  it('damps when flag is on', () => {
    process.env.ALGO_V5_MESSAGE_SUGGEST_ENABLED = '1';
    const rankings = suggestMessagesDispatch({ ...baseInp, draftedDeletedRate: { open_question: 1 } }, 7);
    const off = suggestMessagesDispatch(baseInp, 7);
    const onScore = rankings.find((r) => r.kind === 'open_question')?.score ?? 0;
    const offScore = off.find((r) => r.kind === 'open_question')?.score ?? 0;
    expect(onScore).toBeLessThan(offScore);
  });
});
