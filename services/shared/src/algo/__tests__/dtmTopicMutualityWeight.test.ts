import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicMutualityWeight, onesidedDtmTopics } from '../dtmTopicMutualityWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicMutualityWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicMutualityWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicMutualityWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('reciprocal => balanced band', () => {
    const r = summarizeDtmTopicMutualityWeight([{ topic: 'values', signal: 'reciprocal' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('balanced');
  });

  it('balanced => mixed', () => {
    const r = summarizeDtmTopicMutualityWeight([{ topic: 'values', signal: 'balanced' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicMutualityWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('tilted', () => {
    const r = summarizeDtmTopicMutualityWeight([{ topic: 'values', signal: 'tilted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('onesided');
  });

  it('onesided', () => {
    const r = summarizeDtmTopicMutualityWeight([{ topic: 'values', signal: 'onesided' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('onesided');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicMutualityWeight([
      { topic: 'values', signal: 'reciprocal' },
      { topic: 'values', signal: 'onesided' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tilted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicMutualityWeight([{ topic: 'x', signal: 'reciprocal' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicMutualityWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicMutualityWeight([
      { topic: 'values', signal: 'reciprocal' },
      { topic: 'values', signal: 'onesided' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('onesidedDtmTopics filter', () => {
    const r = summarizeDtmTopicMutualityWeight([
      { topic: 'values', signal: 'onesided' },
      { topic: 'family', signal: 'tilted' },
      { topic: 'finance', signal: 'reciprocal' },
    ]);
    expect(onesidedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicMutualityWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicMutualityWeight([
      { topic: 'values', signal: 'reciprocal' },
      { topic: 'family', signal: 'onesided' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
