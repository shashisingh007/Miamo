import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicStillnessQuality, agitatedDtmTopics } from '../dtmTopicStillnessQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicStillnessQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicStillnessQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicStillnessQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('stilled => settled', () => {
    const r = summarizeDtmTopicStillnessQuality([{ topic: 'values', signal: 'stilled' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('settled');
  });

  it('settled => mixed', () => {
    const r = summarizeDtmTopicStillnessQuality([{ topic: 'values', signal: 'settled' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicStillnessQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('restless => agitated', () => {
    const r = summarizeDtmTopicStillnessQuality([{ topic: 'values', signal: 'restless' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('agitated');
  });

  it('agitated => agitated', () => {
    const r = summarizeDtmTopicStillnessQuality([{ topic: 'values', signal: 'agitated' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('agitated');
  });

  it('mixed midpoint => restless', () => {
    const r = summarizeDtmTopicStillnessQuality([
      { topic: 'values', signal: 'stilled' },
      { topic: 'values', signal: 'agitated' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('restless');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicStillnessQuality([{ topic: 'x', signal: 'stilled' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicStillnessQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicStillnessQuality([
      { topic: 'values', signal: 'stilled' },
      { topic: 'values', signal: 'restless' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('agitatedDtmTopics filter', () => {
    const r = summarizeDtmTopicStillnessQuality([
      { topic: 'values', signal: 'agitated' },
      { topic: 'family', signal: 'restless' },
      { topic: 'finance', signal: 'stilled' },
    ]);
    expect(agitatedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicStillnessQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicStillnessQuality([
      { topic: 'values', signal: 'stilled' },
      { topic: 'family', signal: 'agitated' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
