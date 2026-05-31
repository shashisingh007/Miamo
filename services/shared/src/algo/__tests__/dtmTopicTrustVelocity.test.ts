import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicTrustVelocity,
  erodingDtmTopics,
} from '../dtmTopicTrustVelocity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTrustVelocity', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicTrustVelocity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicTrustVelocity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('rapid-build => accelerating', () => {
    const r = summarizeDtmTopicTrustVelocity([{ topic: 'finance', signal: 'rapid-build' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('accelerating');
  });

  it('steady-build (0.8) => building', () => {
    const r = summarizeDtmTopicTrustVelocity([{ topic: 'finance', signal: 'steady-build' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('building');
  });

  it('cautious (0.55) => building', () => {
    const r = summarizeDtmTopicTrustVelocity([{ topic: 'finance', signal: 'cautious' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('building');
  });

  it('stalled (0.25) => eroding', () => {
    const r = summarizeDtmTopicTrustVelocity([{ topic: 'finance', signal: 'stalled' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('eroding');
  });

  it('eroding => eroding', () => {
    const r = summarizeDtmTopicTrustVelocity([{ topic: 'finance', signal: 'eroding' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('eroding');
  });

  it('mixed 0.5 => stalled', () => {
    const r = summarizeDtmTopicTrustVelocity([
      { topic: 'finance', signal: 'rapid-build' },
      { topic: 'finance', signal: 'eroding' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('stalled');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicTrustVelocity([{ topic: 'x', signal: 'rapid-build' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicTrustVelocity([{ topic: 'finance', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'finance')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTrustVelocity([
      { topic: 'finance', signal: 'rapid-build' },
      { topic: 'finance', signal: 'cautious' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.n).toBe(2);
  });

  it('erodingDtmTopics filters', () => {
    const r = summarizeDtmTopicTrustVelocity([
      { topic: 'finance', signal: 'eroding' },
      { topic: 'family', signal: 'rapid-build' },
    ]);
    expect(erodingDtmTopics(r)).toHaveLength(1);
    expect(erodingDtmTopics(r)[0].topic).toBe('finance');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicTrustVelocity([
      { topic: 'finance', signal: 'rapid-build' },
      { topic: 'family', signal: 'eroding' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicTrustVelocity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
