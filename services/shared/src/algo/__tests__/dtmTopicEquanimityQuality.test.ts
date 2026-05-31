import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicEquanimityQuality, overwhelmedDtmTopics } from '../dtmTopicEquanimityQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicEquanimityQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicEquanimityQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicEquanimityQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('centered => steady', () => {
    const r = summarizeDtmTopicEquanimityQuality([{ topic: 'values', signal: 'centered' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('steady');
  });

  it('steady => mixed', () => {
    const r = summarizeDtmTopicEquanimityQuality([{ topic: 'values', signal: 'steady' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicEquanimityQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('reactive => overwhelmed', () => {
    const r = summarizeDtmTopicEquanimityQuality([{ topic: 'values', signal: 'reactive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('overwhelmed');
  });

  it('overwhelmed => overwhelmed', () => {
    const r = summarizeDtmTopicEquanimityQuality([{ topic: 'values', signal: 'overwhelmed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('overwhelmed');
  });

  it('mixed midpoint => reactive', () => {
    const r = summarizeDtmTopicEquanimityQuality([
      { topic: 'values', signal: 'centered' },
      { topic: 'values', signal: 'overwhelmed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reactive');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicEquanimityQuality([{ topic: 'x', signal: 'centered' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicEquanimityQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicEquanimityQuality([
      { topic: 'values', signal: 'centered' },
      { topic: 'values', signal: 'reactive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('overwhelmedDtmTopics filter', () => {
    const r = summarizeDtmTopicEquanimityQuality([
      { topic: 'values', signal: 'overwhelmed' },
      { topic: 'family', signal: 'reactive' },
      { topic: 'finance', signal: 'centered' },
    ]);
    expect(overwhelmedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicEquanimityQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicEquanimityQuality([
      { topic: 'values', signal: 'centered' },
      { topic: 'family', signal: 'overwhelmed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
