import { describe, it, expect } from 'vitest';
import { recordDtmFeedback, aggregateDtmFeedback } from '../dtmFeedbackChips';

describe('recordDtmFeedback', () => {
  it('emits positive delta for shared', () => {
    const o = recordDtmFeedback({
      uidHash: 'u', pairUidHash: 'p', topic: 'values', sentiment: 'shared', timestamp: 1,
    });
    expect(o.delta).toBeGreaterThan(0);
    expect(o.sentiment).toBe('shared');
    expect(o.timestamp).toBe(1);
  });

  it('emits positive smaller delta for starter', () => {
    const shared  = recordDtmFeedback({ uidHash: 'u', pairUidHash: 'p', topic: 'values', sentiment: 'shared' });
    const starter = recordDtmFeedback({ uidHash: 'u', pairUidHash: 'p', topic: 'values', sentiment: 'starter' });
    expect(starter.delta).toBeGreaterThan(0);
    expect(starter.delta).toBeLessThan(shared.delta);
  });

  it('emits negative delta for mismatch', () => {
    const o = recordDtmFeedback({ uidHash: 'u', pairUidHash: 'p', topic: 'finance', sentiment: 'mismatch' });
    expect(o.delta).toBeLessThan(0);
  });

  it('defaults timestamp to Date.now()', () => {
    const before = Date.now();
    const o = recordDtmFeedback({ uidHash: 'u', pairUidHash: 'p', topic: 'values', sentiment: 'shared' });
    expect(o.timestamp).toBeGreaterThanOrEqual(before);
  });
});

describe('aggregateDtmFeedback', () => {
  it('returns empty object for empty input', () => {
    expect(aggregateDtmFeedback([])).toEqual({});
  });

  it('sums deltas per topic', () => {
    const obs = [
      recordDtmFeedback({ uidHash: 'u', pairUidHash: 'p1', topic: 'values', sentiment: 'shared' }),
      recordDtmFeedback({ uidHash: 'u', pairUidHash: 'p2', topic: 'values', sentiment: 'shared' }),
      recordDtmFeedback({ uidHash: 'u', pairUidHash: 'p3', topic: 'finance', sentiment: 'mismatch' }),
    ];
    const out = aggregateDtmFeedback(obs);
    expect(out.values).toBeCloseTo(0.20, 6);
    expect(out.finance).toBeCloseTo(-0.10, 6);
  });

  it('positive + negative on same topic cancel toward zero', () => {
    const obs = [
      recordDtmFeedback({ uidHash: 'u', pairUidHash: 'p1', topic: 'values', sentiment: 'shared' }),
      recordDtmFeedback({ uidHash: 'u', pairUidHash: 'p2', topic: 'values', sentiment: 'mismatch' }),
    ];
    const out = aggregateDtmFeedback(obs);
    expect(out.values).toBeCloseTo(0.0, 6);
  });
});
