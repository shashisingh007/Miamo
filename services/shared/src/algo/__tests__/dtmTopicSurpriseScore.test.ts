import { describe, it, expect } from 'vitest';
import {
  scoreDtmTopicSurprise,
  topDtmSurpriseTopics,
} from '../dtmTopicSurpriseScore';

describe('dtmTopicSurpriseScore', () => {
  it('returns empty when no current ratings provided', () => {
    expect(scoreDtmTopicSurprise([], [{ topic: 'values', value: 0.5 }])).toEqual([]);
  });

  it('ignores unknown topics in both current and history', () => {
    const rows = scoreDtmTopicSurprise(
      [{ topic: 'banana', value: 0.5 }],
      [{ topic: 'mango', value: -0.5 }]
    );
    expect(rows).toEqual([]);
  });

  it('marks current rating with no history as unknown', () => {
    const rows = scoreDtmTopicSurprise(
      [{ topic: 'family', value: 0.3 }],
      []
    );
    expect(rows[0].band).toBe('unknown');
    expect(rows[0].current).toBe(0.3);
  });

  it('marks single-history-sample as unknown band', () => {
    const rows = scoreDtmTopicSurprise(
      [{ topic: 'values', value: 0.4 }],
      [{ topic: 'values', value: 0.3 }]
    );
    expect(rows[0].band).toBe('unknown');
    expect(rows[0].baseline).toBe(0.3);
    expect(rows[0].stddev).toBe(0);
  });

  it('expected band when current is close to baseline', () => {
    const rows = scoreDtmTopicSurprise(
      [{ topic: 'leisure', value: 0.5 }],
      [
        { topic: 'leisure', value: 0.4 },
        { topic: 'leisure', value: 0.5 },
        { topic: 'leisure', value: 0.6 },
      ]
    );
    expect(rows[0].band).toBe('expected');
  });

  it('shock band on a dramatic flip from highly stable history', () => {
    const history = Array.from({ length: 10 }, () => ({
      topic: 'finance',
      value: 0.5,
    }));
    const rows = scoreDtmTopicSurprise(
      [{ topic: 'finance', value: -1 }],
      history
    );
    expect(rows[0].band).toBe('shock');
    expect(Math.abs(rows[0].z)).toBeGreaterThanOrEqual(3);
  });

  it('strong band for moderate-but-clear deviation', () => {
    const history = [
      { topic: 'growth', value: 0.3 },
      { topic: 'growth', value: 0.5 },
      { topic: 'growth', value: 0.7 },
      { topic: 'growth', value: 0.4 },
      { topic: 'growth', value: 0.6 },
    ];
    const rows = scoreDtmTopicSurprise(
      [{ topic: 'growth', value: 0.2 }],
      history
    );
    expect(rows[0].band).toBe('strong');
  });

  it('clamps z to [-10, 10]', () => {
    const history = Array.from({ length: 5 }, () => ({
      topic: 'health',
      value: 1,
    }));
    const rows = scoreDtmTopicSurprise(
      [{ topic: 'health', value: -1 }],
      history
    );
    expect(rows[0].z).toBeGreaterThanOrEqual(-10);
    expect(rows[0].z).toBeLessThanOrEqual(10);
  });

  it('clamps out-of-range inputs', () => {
    const rows = scoreDtmTopicSurprise(
      [{ topic: 'intimacy', value: 5 }],
      [
        { topic: 'intimacy', value: -5 },
        { topic: 'intimacy', value: -5 },
      ]
    );
    expect(rows[0].current).toBe(1);
    expect(rows[0].baseline).toBe(-1);
  });

  it('preserves canonical topic order', () => {
    const rows = scoreDtmTopicSurprise(
      [
        { topic: 'future', value: 0.1 },
        { topic: 'values', value: 0.2 },
      ],
      [
        { topic: 'future', value: 0 },
        { topic: 'future', value: 0 },
        { topic: 'values', value: 0 },
        { topic: 'values', value: 0 },
      ]
    );
    expect(rows.map((r) => r.topic)).toEqual(['values', 'future']);
  });

  it('topDtmSurpriseTopics ranks by |z|, drops unknown', () => {
    const rows = scoreDtmTopicSurprise(
      [
        { topic: 'values', value: 0.5 }, // unknown (no history)
        { topic: 'growth', value: -0.5 },
        { topic: 'family', value: 0.55 },
      ],
      [
        { topic: 'growth', value: 0.5 },
        { topic: 'growth', value: 0.5 },
        { topic: 'family', value: 0.5 },
        { topic: 'family', value: 0.5 },
      ]
    );
    const top = topDtmSurpriseTopics(rows, 5);
    expect(top.map((r) => r.topic)).toEqual(['growth', 'family']);
  });

  it('topDtmSurpriseTopics returns [] for k<=0', () => {
    expect(topDtmSurpriseTopics([], 0)).toEqual([]);
  });
});
