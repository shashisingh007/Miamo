/**
 * postImpressionRerank v5 — dwell + bio-expand + settle positives, repeat-pass hard negative.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  postImpressionPenalty,
  postImpressionDeltaV5,
  postImpressionDelta,
  type RerankSignals,
} from '../postImpressionRerank';

const skipped: RerankSignals = { skippedCount: 3, secsSinceLast: 3600 };

describe('postImpressionDeltaV5', () => {
  it('matches v4 (negative penalty) when only skip data is present', () => {
    const v4 = -postImpressionPenalty(skipped.skippedCount, skipped.secsSinceLast);
    const v5 = postImpressionDeltaV5(skipped);
    expect(v5).toBeCloseTo(v4, 5);
  });

  it('adds +4 boost at 2s dwell, +8 cumulative at 5s', () => {
    const base = postImpressionDeltaV5({ ...skipped, dwellMsMedian: 1000 });
    const at2s = postImpressionDeltaV5({ ...skipped, dwellMsMedian: 2500 });
    const at5s = postImpressionDeltaV5({ ...skipped, dwellMsMedian: 6000 });
    expect(at2s - base).toBeCloseTo(4, 5);
    expect(at5s - base).toBeCloseTo(8, 5);
  });

  it('adds +5 for bioExpanded', () => {
    const off = postImpressionDeltaV5(skipped);
    const on = postImpressionDeltaV5({ ...skipped, bioExpanded: true });
    expect(on - off).toBeCloseTo(5, 5);
  });

  it('adds +4 per settle, capped at +8', () => {
    expect(postImpressionDeltaV5({ ...skipped, settleCount: 1 }) - postImpressionDeltaV5(skipped)).toBeCloseTo(4, 5);
    expect(postImpressionDeltaV5({ ...skipped, settleCount: 2 }) - postImpressionDeltaV5(skipped)).toBeCloseTo(8, 5);
    expect(postImpressionDeltaV5({ ...skipped, settleCount: 99 }) - postImpressionDeltaV5(skipped)).toBeCloseTo(8, 5);
  });

  it('applies -15 hard penalty on any repeat-pass', () => {
    const off = postImpressionDeltaV5(skipped);
    const on = postImpressionDeltaV5({ ...skipped, repeatPassCount: 1 });
    expect(on - off).toBeCloseTo(-15, 5);
  });
});

describe('postImpressionDelta dispatcher', () => {
  const prev = process.env.ALGO_V5_POST_IMPRESSION_RERANK_ENABLED;
  beforeEach(() => { delete process.env.ALGO_V5_POST_IMPRESSION_RERANK_ENABLED; });
  afterEach(() => {
    if (prev === undefined) delete process.env.ALGO_V5_POST_IMPRESSION_RERANK_ENABLED;
    else process.env.ALGO_V5_POST_IMPRESSION_RERANK_ENABLED = prev;
  });

  it('returns only the v4 negative penalty when flag is off', () => {
    const d = postImpressionDelta({ ...skipped, dwellMsMedian: 9000, bioExpanded: true });
    expect(d).toBeCloseTo(-postImpressionPenalty(skipped.skippedCount, skipped.secsSinceLast), 5);
  });

  it('honors v5 positives when flag is on', () => {
    process.env.ALGO_V5_POST_IMPRESSION_RERANK_ENABLED = '1';
    const off = -postImpressionPenalty(skipped.skippedCount, skipped.secsSinceLast);
    const on = postImpressionDelta({ ...skipped, dwellMsMedian: 9000, bioExpanded: true });
    expect(on).toBeGreaterThan(off);
  });
});
