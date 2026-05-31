import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicNourishmentFlow, starvedDtmTopics } from '../dtmTopicNourishmentFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicNourishmentFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicNourishmentFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicNourishmentFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('nourished => satisfied', () => {
    const r = summarizeDtmTopicNourishmentFlow([{ topic: 'values', signal: 'nourished' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('satisfied');
  });

  it('satisfied => adequate', () => {
    const r = summarizeDtmTopicNourishmentFlow([{ topic: 'values', signal: 'satisfied' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('adequate');
  });

  it('adequate => adequate', () => {
    const r = summarizeDtmTopicNourishmentFlow([{ topic: 'values', signal: 'adequate' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('adequate');
  });

  it('hungry => starved', () => {
    const r = summarizeDtmTopicNourishmentFlow([{ topic: 'values', signal: 'hungry' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('starved');
  });

  it('starved => starved', () => {
    const r = summarizeDtmTopicNourishmentFlow([{ topic: 'values', signal: 'starved' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('starved');
  });

  it('mixed 0.5 => hungry', () => {
    const r = summarizeDtmTopicNourishmentFlow([
      { topic: 'values', signal: 'nourished' },
      { topic: 'values', signal: 'starved' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hungry');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicNourishmentFlow([{ topic: 'x', signal: 'nourished' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicNourishmentFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicNourishmentFlow([
      { topic: 'values', signal: 'nourished' },
      { topic: 'values', signal: 'hungry' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('starvedDtmTopics filter', () => {
    const r = summarizeDtmTopicNourishmentFlow([
      { topic: 'values', signal: 'starved' },
      { topic: 'family', signal: 'hungry' },
      { topic: 'finance', signal: 'nourished' },
    ]);
    expect(starvedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicNourishmentFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicNourishmentFlow([
      { topic: 'values', signal: 'nourished' },
      { topic: 'family', signal: 'starved' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
